-- Labobo Live: optional automatic next question.
--
-- Room setting `advance`: 'teacher' (default, the teacher clicks Next) or
-- 'auto'. In auto mode the reveal (and the leaderboard, if the teacher shows
-- it) stays up for AUTO_SECONDS, then anyone in the room may move the game
-- on with live_auto_next(), so it keeps going even if the teacher's laptop
-- drops. While the reveal is up, `deadline` holds the moment the next
-- question may start (it is unused outside the question stage otherwise),
-- so every screen can count down to it from live_state. A paused room never
-- moves on by itself.

create or replace function public.live_auto_seconds()
returns integer language sql immutable as $$ select 8 $$;

create or replace function public.live_is_auto(p_settings jsonb)
returns boolean language sql immutable as $$ select coalesce(p_settings->>'advance', 'teacher') = 'auto' $$;

-- Close the open question and reveal the answer (unchanged, except that in
-- auto mode it also sets when the next question may start).
create or replace function public.live_close(p_room uuid, p_user uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.live_rooms; q public.live_room_questions; v_host boolean; v_next timestamptz;
begin
  select * into r from public.live_rooms where id = p_room for update;
  if r.id is null then return jsonb_build_object('status', 'not_found'); end if;
  v_host := (r.host = p_user);
  if not v_host and not exists (select 1 from public.live_players where room_id = p_room and user_id = p_user and not kicked) then
    return jsonb_build_object('status', 'not_allowed');
  end if;
  if r.stage <> 'question' then return jsonb_build_object('status', 'not_open'); end if;
  if not v_host and (r.paused or clock_timestamp() < r.deadline + interval '1 second') then
    return jsonb_build_object('status', 'too_early');
  end if;
  v_next := case when public.live_is_auto(r.settings) then clock_timestamp() + make_interval(secs => public.live_auto_seconds()) else r.deadline end;
  update public.live_rooms set stage = 'reveal', paused = false, paused_left_ms = null, deadline = v_next, last_activity_at = now() where id = p_room;
  select * into q from public.live_room_questions where room_id = p_room and position = r.current_q;
  perform public.live_emit('live:' || p_room, 'reveal', jsonb_build_object(
    'position', r.current_q, 'answer', q.answer, 'explanation', q.explanation,
    'counts', public.live_counts(p_room, r.current_q), 'total', r.total_q,
    'next_at', case when public.live_is_auto(r.settings) then v_next end));
  return jsonb_build_object('status', 'ok');
end $$;

-- Show the leaderboard (unchanged, except the auto-mode timer restarts).
create or replace function public.live_show_board(p_room uuid, p_host uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.live_rooms; v_next timestamptz;
begin
  select * into r from public.live_rooms where id = p_room and host = p_host for update;
  if r.id is null then return jsonb_build_object('status', 'not_allowed'); end if;
  if r.stage <> 'reveal' then return jsonb_build_object('status', 'not_reveal'); end if;
  v_next := case when public.live_is_auto(r.settings) then clock_timestamp() + make_interval(secs => public.live_auto_seconds()) else r.deadline end;
  update public.live_rooms set stage = 'leaderboard', deadline = v_next, last_activity_at = now() where id = p_room;
  perform public.live_emit('live:' || p_room, 'leaderboard', jsonb_build_object(
    'board', public.live_public_board(p_room),
    'next_at', case when public.live_is_auto(r.settings) then v_next end));
  return jsonb_build_object('status', 'ok');
end $$;

-- Pause or resume (unchanged, except that resuming a reveal or leaderboard
-- in auto mode restarts its timer instead of jumping straight on).
create or replace function public.live_pause(p_room uuid, p_host uuid, p_paused boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.live_rooms; v_now timestamptz := clock_timestamp(); v_left integer; v_deadline timestamptz;
begin
  select * into r from public.live_rooms where id = p_room and host = p_host for update;
  if r.id is null then return jsonb_build_object('status', 'not_allowed'); end if;
  if r.stage = 'finished' or r.paused = p_paused then return jsonb_build_object('status', 'unchanged'); end if;
  if p_paused then
    v_left := case when r.stage = 'question' then greatest(0, (extract(epoch from (r.deadline - v_now)) * 1000)::int) end;
    update public.live_rooms set paused = true, paused_left_ms = v_left, last_activity_at = now() where id = p_room;
    perform public.live_emit('live:' || p_room, 'paused', jsonb_build_object('paused', true));
  else
    v_deadline := case
      when r.stage = 'question' then v_now + make_interval(secs => coalesce(r.paused_left_ms, 0) / 1000.0)
      when r.stage in ('reveal', 'leaderboard') and public.live_is_auto(r.settings) then v_now + make_interval(secs => public.live_auto_seconds())
      else r.deadline end;
    update public.live_rooms set paused = false, paused_left_ms = null, deadline = v_deadline,
           q_started_at = case when r.stage = 'question' then v_deadline - (r.deadline - r.q_started_at) else q_started_at end,
           last_activity_at = now()
     where id = p_room;
    perform public.live_emit('live:' || p_room, 'resumed', jsonb_build_object('deadline', v_deadline, 'server_now', v_now));
  end if;
  return jsonb_build_object('status', 'ok');
end $$;

-- Auto mode: anyone in the room may start the next question once the
-- reveal's time is up. The first caller wins; the others get question_open.
create or replace function public.live_auto_next(p_room uuid, p_user uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.live_rooms;
begin
  select * into r from public.live_rooms where id = p_room;
  if r.id is null then return jsonb_build_object('status', 'not_found'); end if;
  if r.host <> p_user and not exists (select 1 from public.live_players where room_id = p_room and user_id = p_user and not kicked) then
    return jsonb_build_object('status', 'not_allowed');
  end if;
  if not public.live_is_auto(r.settings) then return jsonb_build_object('status', 'not_auto'); end if;
  if r.stage not in ('reveal', 'leaderboard') then return jsonb_build_object('status', 'not_ready'); end if;
  if r.paused then return jsonb_build_object('status', 'paused'); end if;
  if clock_timestamp() < r.deadline then return jsonb_build_object('status', 'too_early'); end if;
  return public.live_next(p_room, r.host);
end $$;

revoke all on function public.live_auto_seconds(), public.live_is_auto(jsonb), public.live_auto_next(uuid, uuid) from public, anon, authenticated;
grant execute on function public.live_auto_seconds(), public.live_is_auto(jsonb), public.live_auto_next(uuid, uuid) to service_role;
