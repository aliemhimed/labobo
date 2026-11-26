-- Labobo Live: teams name themselves, and the teacher can reject a name.
--
-- In the lobby, once teams are made, each team's first captain (the member
-- who captains question 1) types a team name. The name shows on the
-- teacher's screen and the projector. The teacher can reject it: the team
-- goes back to "Team <n>" and its phones are told to choose another name.
-- Names are also checked against the site's bad-word list by the Netlify
-- function before they get here, and must differ from the other teams'.

alter table public.live_teams add column name_status text not null default 'default'
  check (name_status in ('default', 'chosen', 'rejected'));

create or replace function public.live_name_team(p_room uuid, p_user uuid, p_name text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.live_rooms; p public.live_players; v_name text := left(trim(coalesce(p_name, '')), 24);
begin
  select * into r from public.live_rooms where id = p_room;
  select * into p from public.live_players where room_id = p_room and user_id = p_user and not kicked;
  if r.id is null or p.room_id is null or p.team_no is null then return jsonb_build_object('status', 'not_in_room'); end if;
  if r.stage <> 'lobby' then return jsonb_build_object('status', 'started'); end if;
  if public.live_captain(p_room, p.team_no, 0) is distinct from p_user then return jsonb_build_object('status', 'not_namer'); end if;
  if length(v_name) < 2 then return jsonb_build_object('status', 'too_short'); end if;
  if exists (select 1 from public.live_teams where room_id = p_room and team_no <> p.team_no and lower(name) = lower(v_name)) then
    return jsonb_build_object('status', 'taken');
  end if;
  update public.live_teams set name = v_name, name_status = 'chosen' where room_id = p_room and team_no = p.team_no;
  update public.live_rooms set last_activity_at = now() where id = p_room;
  perform public.live_emit('live-team:' || p_room || ':' || p.team_no, 'team_name', jsonb_build_object('name', v_name));
  perform public.live_emit('live-host:' || p_room, 'players', jsonb_build_object('team_named', p.team_no));
  return jsonb_build_object('status', 'ok', 'name', v_name);
end $$;

-- Teacher: reject a team's name. Host only, in the lobby.
create or replace function public.live_reject_team_name(p_room uuid, p_host uuid, p_team integer)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.live_rooms where id = p_room and host = p_host) then
    return jsonb_build_object('status', 'not_allowed');
  end if;
  update public.live_teams set name = 'Team ' || team_no, name_status = 'rejected' where room_id = p_room and team_no = p_team;
  if not found then return jsonb_build_object('status', 'not_found'); end if;
  perform public.live_emit('live-team:' || p_room || ':' || p_team, 'name_rejected', '{}'::jsonb);
  perform public.live_emit('live-host:' || p_room, 'players', jsonb_build_object('team_rejected', p_team));
  return jsonb_build_object('status', 'ok');
end $$;

create or replace function public.live_team_view(p_room uuid, p_user uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare r public.live_rooms; p public.live_players; t public.live_teams; v_captain uuid; v_namer uuid; a public.live_team_answers; v_rank integer; v_score integer;
begin
  select * into r from public.live_rooms where id = p_room;
  select * into p from public.live_players where room_id = p_room and user_id = p_user;
  if p.team_no is null then return null; end if;
  select * into t from public.live_teams where room_id = p_room and team_no = p.team_no;
  -- The first captain names the team (in the lobby).
  v_namer := public.live_captain(p_room, p.team_no, 0);
  v_captain := case when r.current_q >= 0 then public.live_captain(p_room, p.team_no, r.current_q) end;
  select * into a from public.live_team_answers where room_id = p_room and position = r.current_q and team_no = p.team_no;
  select x.rank, x.score into v_rank, v_score from jsonb_to_recordset(public.live_team_ranking(p_room)) as x(no int, rank int, score int) where x.no = p.team_no;
  return jsonb_build_object(
    'no', t.team_no, 'name', t.name, 'name_status', t.name_status, 'namer', v_namer, 'am_namer', v_namer = p_user,
    'namer_name', (select public.live_shown_name(r.settings, x.nickname, x.display_name) from public.live_players x where x.room_id = p_room and x.user_id = v_namer),
    'rank', v_rank, 'score', coalesce(v_score, 0),
    'teams', (select count(*) from public.live_teams where room_id = p_room),
    'captain', v_captain, 'am_captain', v_captain = p_user,
    'members', (select coalesce(jsonb_agg(jsonb_build_object('user_id', pl.user_id,
                  'shown', public.live_shown_name(r.settings, pl.nickname, pl.display_name)) order by pl.joined_at, pl.user_id), '[]'::jsonb)
                from public.live_players pl where pl.room_id = p_room and pl.team_no = p.team_no and not pl.kicked),
    'votes', (select coalesce(jsonb_agg(jsonb_build_object('user_id', v.user_id, 'choice', v.choice,
                'shown', (select public.live_shown_name(r.settings, x.nickname, x.display_name) from public.live_players x where x.room_id = p_room and x.user_id = v.user_id))
                order by v.at), '[]'::jsonb)
              from public.live_votes v where v.room_id = p_room and v.position = r.current_q and v.team_no = p.team_no),
    'answer', case when a.room_id is null then null
                   when r.stage = 'question' then jsonb_build_object('choice', a.choice, 'auto', a.auto)
                   else jsonb_build_object('choice', a.choice, 'auto', a.auto, 'correct', a.correct, 'points', a.points) end);
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
