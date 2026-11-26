-- Labobo Live: fair timing, reading time, clinical time, power-up time,
-- quick lecture lists and server-side question picks.
--
-- * Automatic closing (live_auto_close) is refused before the deadline plus
--   1 s grace, whoever asks. Before this, the host's screen closed questions
--   when ITS clock said time was up, so a host whose clock estimate was off
--   cut questions short for everyone. Only the host's own "End question now"
--   (live_close) closes early.
-- * Reading time (settings.read_seconds): the question shows alone; answers
--   open at q_started_at (= opens_at); earlier answers get 'reading'. Speed
--   points count from opens_at.
-- * Clinical-case questions (live_room_questions.clinical, set when the room
--   is made) get double time unless settings.clinical_double is false.
-- * Power-up time: after a reveal in a power-up game the next question waits
--   10 s (live_rooms.powerup_until) unless the host skips it (live_next p_force).
-- * live_bank_topics / live_bank_pick: lecture names + counts, and random
--   question ids, so setup screens no longer download whole subjects.

alter table public.live_rooms add column powerup_until timestamptz;
alter table public.live_room_questions add column clinical boolean not null default false;

create or replace function public.live_auto_close(p_room uuid, p_user uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.live_rooms;
begin
  select * into r from public.live_rooms where id = p_room;
  if r.id is null then return jsonb_build_object('status', 'not_found'); end if;
  if r.host <> p_user and not exists (select 1 from public.live_players where room_id = p_room and user_id = p_user and not kicked) then
    return jsonb_build_object('status', 'not_allowed');
  end if;
  if r.stage <> 'question' then return jsonb_build_object('status', 'not_open'); end if;
  if r.paused or clock_timestamp() < r.deadline + interval '1 second' then return jsonb_build_object('status', 'too_early'); end if;
  return public.live_close(p_room, r.host);
end $$;

-- The bank tables a Live room may read (keep in step with ALLOWED_TABLES in
-- netlify/functions/questions.js; the function checks too).
create or replace function public.live_bank_key(p_table text)
returns text language plpgsql stable security definer set search_path = public as $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = p_table and column_name = 'q')
     or not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = p_table and column_name = 'topic') then
    raise exception 'not a question bank: %', p_table;
  end if;
  return case when exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = p_table and column_name = 'display_topic')
              then 'coalesce(nullif(display_topic, ''''), topic)' else 'topic' end;
end $$;

-- Lecture names (as stored) and question counts of one bank, in bank order.
create or replace function public.live_bank_topics(p_table text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_key text := public.live_bank_key(p_table); v_out jsonb;
begin
  execute format('select coalesce(jsonb_agg(jsonb_build_object(''topic'', t, ''n'', n) order by o), ''[]''::jsonb)
                    from (select %s as t, count(*) as n, min(coalesce(ord, 0)) as o from public.%I group by 1) x', v_key, p_table)
    into v_out;
  return v_out;
end $$;

-- Random question ids from some lectures of one bank, leaving out p_exclude.
create or replace function public.live_bank_pick(p_table text, p_topics text[], p_limit integer, p_exclude bigint[] default '{}')
returns bigint[] language plpgsql volatile security definer set search_path = public as $$
declare v_key text := public.live_bank_key(p_table); v_out bigint[];
begin
  execute format('select coalesce(array_agg(id), ''{}'') from (select id from public.%I where %s = any($1) and not (id = any($2))
                    order by random() limit $3) x', p_table, v_key)
    into v_out using p_topics, coalesce(p_exclude, '{}'), greatest(0, least(100, p_limit));
  return v_out;
end $$;

-- live_next gets a third argument (skip power-up time); drop the old one.
drop function if exists public.live_next(uuid, uuid);

-- ── Existing functions, extended ─────────────────────────────────────

create or replace function public.live_create_room(p_host uuid, p_title text, p_settings jsonb, p_questions jsonb, p_quiz uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_code text; v_id uuid; v_n integer := jsonb_array_length(p_questions); v_try integer := 0;
begin
  if v_n < 1 then raise exception 'no questions'; end if;
  -- Rooms left idle for 3 hours close on their own.
  update public.live_rooms set stage = 'finished', finished_at = now()
   where stage <> 'finished' and last_activity_at < now() - interval '3 hours';
  loop
    v_try := v_try + 1;
    v_code := lpad((floor(random() * 1000000))::int::text, 6, '0');
    begin
      insert into public.live_rooms (code, host, quiz_id, title, settings, total_q)
      values (v_code, p_host, p_quiz, left(coalesce(p_title, ''), 120), coalesce(p_settings, '{}'), v_n)
      returning id into v_id;
      exit;
    exception when unique_violation then
      if v_try > 20 then raise exception 'no free room code'; end if;
    end;
  end loop;
  insert into public.live_room_questions (room_id, position, q, options, answer, explanation, image, source_table, source_id, custom_id, clinical)
  select v_id, (e.ord - 1)::int, e.v->>'q', e.v->'options', (e.v->>'answer')::int,
         coalesce(e.v->>'explanation', ''), coalesce(e.v->>'image', ''),
         e.v->>'source_table', (e.v->>'source_id')::bigint, (e.v->>'custom_id')::uuid,
         coalesce((e.v->>'clinical')::boolean, false)
    from jsonb_array_elements(p_questions) with ordinality e(v, ord);
  return jsonb_build_object('id', v_id, 'code', v_code);
end $$;

create or replace function public.live_open_question(p_room uuid, p_position integer)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('position', q.position, 'q', q.q, 'options', q.options, 'image', q.image, 'clinical', q.clinical)
    from public.live_room_questions q where q.room_id = p_room and q.position = p_position;
$$;

create or replace function public.live_next(p_room uuid, p_host uuid, p_force boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.live_rooms; v_pos integer; v_now timestamptz := clock_timestamp(); v_secs integer; v_deadline timestamptz;
        v_read integer; v_open timestamptz;
begin
  select * into r from public.live_rooms where id = p_room and host = p_host for update;
  if r.id is null then return jsonb_build_object('status', 'not_allowed'); end if;
  if r.stage = 'finished' then return jsonb_build_object('status', 'finished'); end if;
  if r.stage = 'question' then return jsonb_build_object('status', 'question_open'); end if;
  if r.stage = 'cases' then return jsonb_build_object('status', 'started'); end if;
  -- Power-up time: after a reveal in a power-up game, players get time to
  -- cast before the next question. The host may skip it (p_force).
  if r.stage in ('reveal', 'leaderboard') and not p_force and r.powerup_until is not null and v_now < r.powerup_until then
    return jsonb_build_object('status', 'powerup_time', 'until', r.powerup_until);
  end if;
  -- Team rooms: make the teams at the start if the teacher hasn't, and
  -- place anyone still without a team.
  if public.live_is_teams(r.settings) then
    if not exists (select 1 from public.live_teams where room_id = p_room) then
      perform public.live_make_teams(p_room, p_host);
    end if;
    perform public.live_assign_team(p_room, pl.user_id)
       from public.live_players pl where pl.room_id = p_room and pl.team_no is null and not pl.kicked;
  end if;
  -- Case rooms: Start opens every case to the teams at once; no questions to step through.
  if public.live_is_cases(r.settings) then
    update public.live_rooms set stage = 'cases', last_activity_at = now() where id = p_room;
    perform public.live_emit('live:' || p_room, 'cases_started', '{}'::jsonb);
    return jsonb_build_object('status', 'ok', 'stage', 'cases');
  end if;
  v_pos := r.current_q + 1;
  if v_pos >= r.total_q then return public.live_finish(p_room, p_host); end if;
  v_secs := greatest(5, least(300, coalesce((r.settings->>'seconds')::int, 20)));
  -- Clinical cases get double time (unless the host turned that off).
  if coalesce((r.settings->>'clinical_double')::boolean, true)
     and coalesce((select clinical from public.live_room_questions where room_id = p_room and position = v_pos), false) then
    v_secs := least(600, v_secs * 2);
  end if;
  -- Reading time: the question shows alone first; answers open at v_open.
  v_read := greatest(0, least(15, coalesce((r.settings->>'read_seconds')::int, 0)));
  v_open := v_now + make_interval(secs => v_read);
  v_deadline := v_open + make_interval(secs => v_secs);
  update public.live_rooms set stage = 'question', current_q = v_pos, q_started_at = v_open, deadline = v_deadline,
         paused = false, paused_left_ms = null, powerup_until = null, last_activity_at = now()
   where id = p_room;
  perform public.live_emit('live:' || p_room, 'question', jsonb_build_object(
    'question', public.live_open_question(p_room, v_pos), 'total', r.total_q,
    'deadline', v_deadline, 'opens_at', v_open, 'server_now', v_now, 'seconds', v_secs,
    'captains', case when public.live_is_teams(r.settings) then (select jsonb_object_agg(t.team_no, public.live_captain(p_room, t.team_no, v_pos))
                                                               from public.live_teams t where t.room_id = p_room) end));
  return jsonb_build_object('status', 'ok', 'position', v_pos, 'deadline', v_deadline);
end $$;

create or replace function public.live_answer(p_room uuid, p_user uuid, p_position integer, p_choice integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.live_rooms; q public.live_room_questions; v_now timestamptz := clock_timestamp();
        v_ms integer; v_frac numeric; v_ok boolean; v_pts integer; v_rows integer; v_counts jsonb;
begin
  select * into r from public.live_rooms where id = p_room;
  if r.id is null or not exists (select 1 from public.live_players where room_id = p_room and user_id = p_user and not kicked) then
    return jsonb_build_object('status', 'not_in_room');
  end if;
  -- Team rooms: only the team's captain answers.
  if public.live_is_teams(r.settings) then return public.live_team_answer(p_room, p_user, p_position, p_choice); end if;
  if r.stage <> 'question' or r.current_q <> p_position then return jsonb_build_object('status', 'closed'); end if;
  if r.paused then return jsonb_build_object('status', 'paused'); end if;
  if v_now < r.q_started_at then return jsonb_build_object('status', 'reading'); end if;
  -- Power-ups: Paralysis blocks the first 5 seconds; Tachycardia leaves 60% of the time.
  if public.live_spells_on(r.settings) and public.live_has_effect(p_room, p_position, p_user, 'paralysis')
     and v_now < r.q_started_at + interval '5 seconds' then
    return jsonb_build_object('status', 'paralyzed');
  end if;
  if v_now > (case when public.live_spells_on(r.settings) and public.live_has_effect(p_room, p_position, p_user, 'tachycardia')
                   then r.q_started_at + (r.deadline - r.q_started_at) * 0.6 else r.deadline end) + interval '1 second' then
    return jsonb_build_object('status', 'late');
  end if;
  select * into q from public.live_room_questions where room_id = p_room and position = p_position;
  if p_choice < 0 or p_choice >= jsonb_array_length(q.options) then return jsonb_build_object('status', 'bad_choice'); end if;
  v_ms := greatest(0, (extract(epoch from (v_now - r.q_started_at)) * 1000)::int);
  v_frac := least(1, greatest(0, extract(epoch from (v_now - r.q_started_at)) / greatest(1, extract(epoch from (r.deadline - r.q_started_at)))));
  v_ok := (p_choice = q.answer);
  v_pts := case when v_ok then round(100 - 50 * v_frac)::int else 0 end;
  -- Power-ups: Double or nothing doubles a right answer and costs 50 for a wrong one.
  if public.live_spells_on(r.settings) and public.live_has_effect(p_room, p_position, p_user, 'double_or_nothing') then
    v_pts := case when v_ok then v_pts * 2 else -50 end;
  end if;
  insert into public.live_answers (room_id, position, user_id, choice, received_at, ms, correct, points)
  values (p_room, p_position, p_user, p_choice, v_now, v_ms, v_ok, v_pts)
  on conflict do nothing;
  get diagnostics v_rows = row_count;
  if v_rows = 0 then return jsonb_build_object('status', 'duplicate'); end if;
  update public.live_players
     set score = greatest(0, score + v_pts), correct = correct + (case when v_ok then 1 else 0 end),
         total_ms = total_ms + v_ms, last_seen_at = now()
   where room_id = p_room and user_id = p_user;
  v_counts := public.live_counts(p_room, p_position);
  perform public.live_emit('live-host:' || p_room, 'answers', v_counts || jsonb_build_object(
    'position', p_position, 'players', public.live_active_count(p_room)));
  if public.live_spells_on(r.settings) then perform public.live_spell_after_answer(p_room, p_user, v_ok); end if;
  return jsonb_build_object('status', 'accepted');
end $$;

create or replace function public.live_team_answer(p_room uuid, p_user uuid, p_position integer, p_choice integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.live_rooms; q public.live_room_questions; p public.live_players; v_now timestamptz := clock_timestamp();
        v_ms integer; v_frac numeric; v_ok boolean; v_pts integer; v_rows integer;
begin
  select * into r from public.live_rooms where id = p_room;
  select * into p from public.live_players where room_id = p_room and user_id = p_user and not kicked;
  if r.id is null or p.room_id is null or p.team_no is null then return jsonb_build_object('status', 'not_in_room'); end if;
  if r.stage <> 'question' or r.current_q <> p_position then return jsonb_build_object('status', 'closed'); end if;
  if r.paused then return jsonb_build_object('status', 'paused'); end if;
  if v_now < r.q_started_at then return jsonb_build_object('status', 'reading'); end if;
  if v_now > r.deadline + interval '1 second' then return jsonb_build_object('status', 'late'); end if;
  if public.live_captain(p_room, p.team_no, p_position) is distinct from p_user then return jsonb_build_object('status', 'not_captain'); end if;
  select * into q from public.live_room_questions where room_id = p_room and position = p_position;
  if p_choice < 0 or p_choice >= jsonb_array_length(q.options) then return jsonb_build_object('status', 'bad_choice'); end if;
  v_ms := greatest(0, (extract(epoch from (v_now - r.q_started_at)) * 1000)::int);
  v_frac := least(1, greatest(0, extract(epoch from (v_now - r.q_started_at)) / greatest(1, extract(epoch from (r.deadline - r.q_started_at)))));
  v_ok := (p_choice = q.answer);
  v_pts := case when v_ok then round(100 - 50 * v_frac)::int else 0 end;
  insert into public.live_team_answers (room_id, position, team_no, user_id, choice, ms, correct, points, received_at)
  values (p_room, p_position, p.team_no, p_user, p_choice, v_ms, v_ok, v_pts, v_now)
  on conflict do nothing;
  get diagnostics v_rows = row_count;
  if v_rows = 0 then return jsonb_build_object('status', 'duplicate'); end if;
  update public.live_players
     set score = score + v_pts, correct = correct + (case when v_ok then 1 else 0 end), total_ms = total_ms + v_ms, last_seen_at = now()
   where room_id = p_room and team_no = p.team_no and not kicked;
  perform public.live_emit('live-team:' || p_room || ':' || p.team_no, 'team_answer', jsonb_build_object('position', p_position, 'choice', p_choice));
  perform public.live_emit('live-host:' || p_room, 'answers', public.live_counts(p_room, p_position) || jsonb_build_object(
    'position', p_position, 'teams', (select count(*) from public.live_teams where room_id = p_room)));
  return jsonb_build_object('status', 'accepted');
end $$;

create or replace function public.live_vote(p_room uuid, p_user uuid, p_position integer, p_choice integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.live_rooms; p public.live_players; q public.live_room_questions; v_now timestamptz := clock_timestamp();
begin
  select * into r from public.live_rooms where id = p_room;
  select * into p from public.live_players where room_id = p_room and user_id = p_user and not kicked;
  if r.id is null or p.room_id is null or p.team_no is null or not public.live_is_teams(r.settings) then
    return jsonb_build_object('status', 'not_in_room');
  end if;
  if r.stage <> 'question' or r.current_q <> p_position or r.paused then return jsonb_build_object('status', 'closed'); end if;
  if clock_timestamp() > r.deadline + interval '1 second' then return jsonb_build_object('status', 'late'); end if;
  if v_now < r.q_started_at then return jsonb_build_object('status', 'reading'); end if;
  if public.live_captain(p_room, p.team_no, p_position) = p_user then return jsonb_build_object('status', 'captain'); end if;
  if exists (select 1 from public.live_team_answers where room_id = p_room and position = p_position and team_no = p.team_no) then
    return jsonb_build_object('status', 'answered');
  end if;
  select * into q from public.live_room_questions where room_id = p_room and position = p_position;
  if p_choice < 0 or p_choice >= jsonb_array_length(q.options) then return jsonb_build_object('status', 'bad_choice'); end if;
  insert into public.live_votes (room_id, position, user_id, team_no, choice, at)
  values (p_room, p_position, p_user, p.team_no, p_choice, clock_timestamp())
  on conflict (room_id, position, user_id) do update set choice = excluded.choice, at = excluded.at;
  perform public.live_emit('live-team:' || p_room || ':' || p.team_no, 'vote', jsonb_build_object('position', p_position, 'user', p_user, 'choice', p_choice));
  return jsonb_build_object('status', 'ok');
end $$;

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
  -- Team rooms: a team whose captain didn't answer gets its advisors' choice.
  if public.live_is_teams(r.settings) then perform public.live_fill_team_answers(p_room); end if;
  v_next := case when public.live_is_auto(r.settings) then clock_timestamp() + make_interval(secs => public.live_auto_seconds()) else r.deadline end;
  if public.live_spells_on(r.settings) and public.live_is_auto(r.settings) then
    v_next := greatest(v_next, clock_timestamp() + interval '10 seconds');
  end if;
  update public.live_rooms set stage = 'reveal', paused = false, paused_left_ms = null, deadline = v_next, last_activity_at = now(),
         powerup_until = case when public.live_spells_on(r.settings) then clock_timestamp() + interval '10 seconds' end
   where id = p_room;
  select * into q from public.live_room_questions where room_id = p_room and position = r.current_q;
  perform public.live_emit('live:' || p_room, 'reveal', jsonb_build_object(
    'position', r.current_q, 'answer', q.answer, 'explanation', q.explanation,
    'counts', public.live_counts(p_room, r.current_q), 'total', r.total_q,
    'next_at', case when public.live_is_auto(r.settings) then v_next end,
    'powerup_until', case when public.live_spells_on(r.settings) then clock_timestamp() + interval '10 seconds' end));
  return jsonb_build_object('status', 'ok');
end $$;

create or replace function public.live_state(p_room uuid, p_user uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.live_rooms; p public.live_players; v_host boolean; q public.live_room_questions;
        v_out jsonb; v_mine public.live_answers; v_rank integer;
begin
  select * into r from public.live_rooms where id = p_room;
  if r.id is null then return null; end if;
  v_host := (r.host = p_user);
  if not v_host then
    select * into p from public.live_players where room_id = p_room and user_id = p_user;
    if p.room_id is null then return null; end if;
    if not p.kicked then update public.live_players set last_seen_at = now() where room_id = p_room and user_id = p_user; end if;
  end if;

  v_out := jsonb_build_object(
    'role', case when v_host then 'host' else 'player' end,
    'room', jsonb_build_object('id', r.id, 'code', r.code, 'title', r.title, 'stage', r.stage,
      'current', r.current_q, 'total', r.total_q, 'deadline', r.deadline, 'paused', r.paused,
      'paused_left_ms', r.paused_left_ms, 'locked', r.locked, 'opens_at', r.q_started_at, 'powerup_until', r.powerup_until,
      'settings', r.settings - 'internal'),
    'server_now', clock_timestamp(),
    'players', public.live_active_count(p_room));

  if r.current_q >= 0 and r.stage <> 'lobby' then
    select * into q from public.live_room_questions where room_id = p_room and position = r.current_q;
    v_out := v_out || jsonb_build_object('question', public.live_open_question(p_room, r.current_q));
    if r.stage in ('reveal', 'leaderboard', 'finished') then
      v_out := v_out || jsonb_build_object('reveal', jsonb_build_object(
        'answer', q.answer, 'explanation', q.explanation, 'counts', public.live_counts(p_room, r.current_q)));
    end if;
  end if;

  if r.stage in ('leaderboard', 'finished') then
    v_out := v_out || jsonb_build_object('board', public.live_public_board(p_room));
  end if;

  if v_host then
    v_out := v_out || jsonb_build_object(
      'counts', case when r.current_q >= 0 then public.live_counts(p_room, r.current_q) else null end,
      'roster', (select coalesce(jsonb_agg(jsonb_build_object(
          'user_id', pl.user_id, 'name', pl.display_name, 'email', pl.email, 'nickname', pl.nickname,
          'shown', public.live_shown_name(r.settings, pl.nickname, pl.display_name),
          'score', pl.score, 'correct', pl.correct, 'away', pl.away_count,
          'online', pl.last_seen_at > now() - interval '45 seconds',
          'answered', exists (select 1 from public.live_answers a where a.room_id = p_room and a.position = r.current_q and a.user_id = pl.user_id))
          order by pl.score desc, pl.total_ms asc), '[]'::jsonb)
        from public.live_players pl where pl.room_id = p_room and not pl.kicked));
  else
    select * into v_mine from public.live_answers where room_id = p_room and position = r.current_q and user_id = p_user;
    select x.rank into v_rank from jsonb_to_recordset(public.live_ranking(p_room)) as x(rank int, user_id uuid) where x.user_id = p_user;
    v_out := v_out || jsonb_build_object('me', jsonb_build_object(
      'kicked', p.kicked, 'nickname', p.nickname, 'score', p.score, 'correct', p.correct, 'rank', v_rank,
      'answer', case when v_mine.user_id is null then null
                     when r.stage = 'question' then jsonb_build_object('choice', v_mine.choice)
                     else jsonb_build_object('choice', v_mine.choice, 'correct', v_mine.correct, 'points', v_mine.points) end));
  end if;
  -- Power-ups: a player's cards, held spell and effects; the host sees who
  -- was hit for the next question.
  if public.live_spells_on(r.settings) then
    if v_host then
      v_out := v_out || jsonb_build_object('casts', (select coalesce(jsonb_agg(jsonb_build_object('spell', e.spell,
          'by', (select public.live_shown_name(r.settings, x.nickname, x.display_name) from public.live_players x where x.room_id = p_room and x.user_id = e.by),
          'target', (select public.live_shown_name(r.settings, x.nickname, x.display_name) from public.live_players x where x.room_id = p_room and x.user_id = e.target))
          order by e.at), '[]'::jsonb)
        from public.live_effects e where e.room_id = p_room and e.position = r.current_q + 1 and e.kind = 'attack'));
    else
      v_out := v_out || jsonb_build_object('spells', public.live_spell_view(p_room, p_user));
    end if;
  end if;
  -- Team rooms: the teams for the host; the student's own team, role and
  -- the team's votes and answer for everyone else.
  if public.live_is_teams(r.settings) then
    if v_host then
      v_out := v_out || jsonb_build_object('teams', (select coalesce(jsonb_agg(jsonb_build_object(
          'no', t.team_no, 'name', t.name, 'score', coalesce(tr.score, 0), 'correct', coalesce(tr.correct, 0), 'rank', tr.rank,
          'answered', exists (select 1 from public.live_team_answers a where a.room_id = p_room and a.position = r.current_q and a.team_no = t.team_no),
          'captain', case when r.current_q >= 0 then public.live_captain(p_room, t.team_no, r.current_q) end,
          'members', (select coalesce(jsonb_agg(jsonb_build_object('user_id', pl.user_id, 'shown', public.live_shown_name(r.settings, pl.nickname, pl.display_name),
                        'name', pl.display_name, 'online', pl.last_seen_at > now() - interval '45 seconds') order by pl.joined_at, pl.user_id), '[]'::jsonb)
                      from public.live_players pl where pl.room_id = p_room and pl.team_no = t.team_no and not pl.kicked)) order by t.team_no), '[]'::jsonb)
        from public.live_teams t
        left join jsonb_to_recordset(public.live_team_ranking(p_room)) as tr(no int, rank int, score int, correct int) on tr.no = t.team_no
        where t.room_id = p_room));
    elsif p.team_no is not null then
      v_out := v_out || jsonb_build_object('team', public.live_team_view(p_room, p_user));
    end if;
  end if;
  return v_out;
end $$;

-- ── Grants ──────────────────────────────────────────────────────────────
-- Same rule as before: only the service key (Netlify) calls live_*;
-- live_can_listen stays callable by signed-in users for Realtime.
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname like 'live\_%'
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    execute format('grant execute on function %s to service_role', f.sig);
  end loop;
end $$;

grant execute on function public.live_can_listen(text) to authenticated;
