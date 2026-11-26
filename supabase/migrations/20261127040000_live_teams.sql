-- Labobo Live, slice 2: teacher rooms in teams.
--
-- Room settings: mode 'teams', team_size 2-5 (default 3).
--   * Teams are made at random when the teacher presses "Make teams" in the
--     lobby, or at the start; latecomers join the smallest team; the teacher
--     can move a student to another team.
--   * Each question one member is the captain, in turn (by join order), so
--     everyone gets to decide. Only the captain's answer counts. The others
--     are advisors: their picks show live to the whole team on the private
--     topic live-team:<room>:<team no>.
--   * If the captain hasn't answered when the question closes, the team gets
--     its advisors' most-picked option (ties go to the earliest pick). That
--     also covers a captain whose phone dropped.
--   * Scoring is the same (100 points instant, falling to 50 at the deadline;
--     an advisors' fallback counts as answered at the deadline). Every member
--     gets the team's points, so history and spaced review work as before.

alter table public.live_players add column team_no integer;

create table public.live_teams (
  room_id uuid not null references public.live_rooms(id) on delete cascade,
  team_no integer not null,
  name text not null,
  primary key (room_id, team_no)
);

-- One answer per team per question.
create table public.live_team_answers (
  room_id uuid not null references public.live_rooms(id) on delete cascade,
  position integer not null,
  team_no integer not null,
  user_id uuid,                       -- the captain; null when the advisors' pick was used
  choice integer not null,
  ms integer not null,
  correct boolean not null,
  points integer not null,
  auto boolean not null default false,
  received_at timestamptz not null default clock_timestamp(),
  primary key (room_id, position, team_no)
);

-- Advisors' picks (they may change their pick until the team has answered).
create table public.live_votes (
  room_id uuid not null references public.live_rooms(id) on delete cascade,
  position integer not null,
  user_id uuid not null,
  team_no integer not null,
  choice integer not null,
  at timestamptz not null default clock_timestamp(),
  primary key (room_id, position, user_id)
);

alter table public.live_teams enable row level security;
alter table public.live_team_answers enable row level security;
alter table public.live_votes enable row level security;
revoke all on public.live_teams, public.live_team_answers, public.live_votes from anon, authenticated;

-- ── Team helpers ────────────────────────────────────────────────────────

create or replace function public.live_is_teams(p_settings jsonb)
returns boolean language sql immutable as $$ select coalesce(p_settings->>'mode', 'individual') = 'teams' $$;

-- This question's captain: members in join order, taking turns.
create or replace function public.live_captain(p_room uuid, p_team integer, p_position integer)
returns uuid language sql stable security definer set search_path = public as $$
  select user_id from public.live_players
   where room_id = p_room and team_no = p_team and not kicked
   order by joined_at, user_id
  offset (greatest(p_position, 0) % greatest(1, (select count(*) from public.live_players
                                                 where room_id = p_room and team_no = p_team and not kicked)))
  limit 1;
$$;

-- Teams ranked: points desc, then lower total answer time.
create or replace function public.live_team_ranking(p_room uuid, p_limit integer default null)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(x order by x.rank), '[]'::jsonb) from (
    select row_number() over (order by coalesce(a.score, 0) desc, coalesce(a.ms, 0) asc, t.team_no asc) as rank,
           t.team_no as no, t.name, coalesce(a.score, 0) as score, coalesce(a.correct, 0) as correct
      from public.live_teams t
      left join (select team_no, sum(points)::int score, count(*) filter (where correct)::int correct, sum(ms)::bigint ms
                   from public.live_team_answers where room_id = p_room group by team_no) a on a.team_no = t.team_no
     where t.room_id = p_room
     order by 1
     limit p_limit
  ) x;
$$;

-- Put one player in the smallest team (ties: the lowest number).
create or replace function public.live_assign_team(p_room uuid, p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_team integer;
begin
  select t.team_no into v_team
    from public.live_teams t
    left join public.live_players pl on pl.room_id = t.room_id and pl.team_no = t.team_no and not pl.kicked
   where t.room_id = p_room
   group by t.team_no order by count(pl.user_id), t.team_no limit 1;
  if v_team is not null then
    update public.live_players set team_no = v_team where room_id = p_room and user_id = p_user and team_no is null;
  end if;
end $$;

-- (Re)make the teams at random, in the lobby. Host only.
create or replace function public.live_make_teams(p_room uuid, p_host uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.live_rooms; v_size integer; v_players integer; v_teams integer;
begin
  select * into r from public.live_rooms where id = p_room and host = p_host;
  if r.id is null then return jsonb_build_object('status', 'not_allowed'); end if;
  if not public.live_is_teams(r.settings) then return jsonb_build_object('status', 'not_teams'); end if;
  if r.stage <> 'lobby' then return jsonb_build_object('status', 'started'); end if;
  v_size := greatest(2, least(5, coalesce((r.settings->>'team_size')::int, 3)));
  select count(*) into v_players from public.live_players where room_id = p_room and not kicked;
  v_teams := greatest(1, round(v_players::numeric / v_size)::int);
  delete from public.live_teams where room_id = p_room;
  insert into public.live_teams (room_id, team_no, name)
  select p_room, n, 'Team ' || n from generate_series(1, v_teams) n;
  update public.live_players pl set team_no = s.team
    from (select user_id, ((row_number() over (order by random())) - 1) % v_teams + 1 as team
            from public.live_players where room_id = p_room and not kicked) s
   where pl.room_id = p_room and pl.user_id = s.user_id;
  update public.live_rooms set last_activity_at = now() where id = p_room;
  perform public.live_emit('live:' || p_room, 'teams', jsonb_build_object('teams', v_teams));
  perform public.live_emit('live-host:' || p_room, 'players', jsonb_build_object('count', v_players));
  return jsonb_build_object('status', 'ok', 'teams', v_teams);
end $$;

-- The captain's answer for the team. Same rules and scoring as a single answer.
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

-- An advisor's pick, shown live to the team. Can be changed until the team answers.
create or replace function public.live_vote(p_room uuid, p_user uuid, p_position integer, p_choice integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.live_rooms; p public.live_players; q public.live_room_questions;
begin
  select * into r from public.live_rooms where id = p_room;
  select * into p from public.live_players where room_id = p_room and user_id = p_user and not kicked;
  if r.id is null or p.room_id is null or p.team_no is null or not public.live_is_teams(r.settings) then
    return jsonb_build_object('status', 'not_in_room');
  end if;
  if r.stage <> 'question' or r.current_q <> p_position or r.paused then return jsonb_build_object('status', 'closed'); end if;
  if clock_timestamp() > r.deadline + interval '1 second' then return jsonb_build_object('status', 'late'); end if;
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

-- At close: teams with no captain answer get their advisors' most-picked
-- option, scored as if answered at the deadline.
create or replace function public.live_fill_team_answers(p_room uuid)
returns void language plpgsql security definer set search_path = public as $$
declare r public.live_rooms; q public.live_room_questions; v record; v_ms integer;
begin
  select * into r from public.live_rooms where id = p_room;
  select * into q from public.live_room_questions where room_id = p_room and position = r.current_q;
  v_ms := greatest(0, (extract(epoch from (r.deadline - r.q_started_at)) * 1000)::int);
  for v in
    select team_no, choice from (
      select team_no, choice, row_number() over (partition by team_no order by count(*) desc, min(at) asc) rn
        from public.live_votes where room_id = p_room and position = r.current_q group by team_no, choice) x
     where rn = 1
       and not exists (select 1 from public.live_team_answers a where a.room_id = p_room and a.position = r.current_q and a.team_no = x.team_no)
  loop
    insert into public.live_team_answers (room_id, position, team_no, user_id, choice, ms, correct, points, auto)
    values (p_room, r.current_q, v.team_no, null, v.choice, v_ms, v.choice = q.answer, case when v.choice = q.answer then 50 else 0 end, true)
    on conflict do nothing;
    if found then
      update public.live_players
         set score = score + (case when v.choice = q.answer then 50 else 0 end),
             correct = correct + (case when v.choice = q.answer then 1 else 0 end), total_ms = total_ms + v_ms
       where room_id = p_room and team_no = v.team_no and not kicked;
    end if;
  end loop;
end $$;

-- What a student sees of their own team right now.
create or replace function public.live_team_view(p_room uuid, p_user uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare r public.live_rooms; p public.live_players; t public.live_teams; v_captain uuid; a public.live_team_answers; v_rank integer; v_score integer;
begin
  select * into r from public.live_rooms where id = p_room;
  select * into p from public.live_players where room_id = p_room and user_id = p_user;
  if p.team_no is null then return null; end if;
  select * into t from public.live_teams where room_id = p_room and team_no = p.team_no;
  v_captain := case when r.current_q >= 0 then public.live_captain(p_room, p.team_no, r.current_q) end;
  select * into a from public.live_team_answers where room_id = p_room and position = r.current_q and team_no = p.team_no;
  select x.rank, x.score into v_rank, v_score from jsonb_to_recordset(public.live_team_ranking(p_room)) as x(no int, rank int, score int) where x.no = p.team_no;
  return jsonb_build_object(
    'no', t.team_no, 'name', t.name, 'rank', v_rank, 'score', coalesce(v_score, 0),
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

-- ── Existing functions, extended for team rooms ──────────────────────

create or replace function public.live_counts(p_room uuid, p_position integer)
returns jsonb language sql stable security definer set search_path = public as $$
  -- Team rooms count one answer per team.
  select case when public.live_is_teams((select settings from public.live_rooms where id = p_room)) then (
    select jsonb_build_object('answered', count(*), 'by_option', coalesce((select jsonb_object_agg(choice, n) from (
        select choice, count(*) n from public.live_team_answers
         where room_id = p_room and position = p_position group by choice) c), '{}'::jsonb))
      from public.live_team_answers where room_id = p_room and position = p_position)
  else (select jsonb_build_object(
    'answered', count(*),
    'by_option', coalesce((select jsonb_object_agg(choice, n) from (
        select choice, count(*) n from public.live_answers
         where room_id = p_room and position = p_position group by choice) c), '{}'::jsonb))
  from public.live_answers where room_id = p_room and position = p_position) end;
$$;

create or replace function public.live_public_board(p_room uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select case
           when coalesce(r.settings->>'leaderboard', 'top5') = 'none' then '[]'::jsonb
           -- Team rooms rank teams.
           when public.live_is_teams(r.settings) then (select coalesce(jsonb_agg(e - 'no'), '[]'::jsonb) from jsonb_array_elements(
             public.live_team_ranking(p_room, case when r.settings->>'leaderboard' = 'all' then null else 5 end)) e)
           else case coalesce(r.settings->>'leaderboard', 'top5')
           when 'none' then '[]'::jsonb
           when 'all' then (select coalesce(jsonb_agg(e - 'user_id'), '[]'::jsonb) from jsonb_array_elements(public.live_ranking(p_room)) e)
           else (select coalesce(jsonb_agg(e - 'user_id'), '[]'::jsonb) from jsonb_array_elements(public.live_ranking(p_room, 5)) e)
         end end
    from public.live_rooms r where r.id = p_room;
$$;

create or replace function public.live_can_listen(p_topic text)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare v_kind text := split_part(p_topic, ':', 1); v_room uuid;
begin
  begin
    v_room := split_part(p_topic, ':', 2)::uuid;
  exception when others then
    return false;
  end;
  if exists (select 1 from public.live_rooms where id = v_room and host = auth.uid()) then
    return v_kind in ('live', 'live-host', 'live-team');
  end if;
  if v_kind = 'live' then
    return exists (select 1 from public.live_players where room_id = v_room and user_id = auth.uid() and not kicked);
  end if;
  -- live-team:<room>:<team no>: the members of that team only.
  if v_kind = 'live-team' then
    return exists (select 1 from public.live_players where room_id = v_room and user_id = auth.uid() and not kicked
                     and team_no::text = split_part(p_topic, ':', 3));
  end if;
  return false;
end $$;

create or replace function public.live_join(p_code text, p_user uuid, p_display text, p_email text, p_nickname text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.live_rooms; p public.live_players; v_status text;
begin
  select * into r from public.live_rooms where code = p_code and stage <> 'finished';
  if r.id is null then return jsonb_build_object('status', 'not_found'); end if;
  if r.host = p_user then return jsonb_build_object('status', 'host', 'room', r.id); end if;
  select * into p from public.live_players where room_id = r.id and user_id = p_user;
  if p.room_id is not null then
    if p.kicked then return jsonb_build_object('status', 'kicked'); end if;
    update public.live_players set last_seen_at = now(),
           nickname = coalesce(nullif(left(trim(p_nickname), 24), ''), nickname)
     where room_id = r.id and user_id = p_user;
    v_status := 'rejoined';
  else
    if r.locked then return jsonb_build_object('status', 'locked'); end if;
    insert into public.live_players (room_id, user_id, display_name, email, nickname)
    values (r.id, p_user, left(coalesce(p_display, ''), 80), left(coalesce(p_email, ''), 120), left(trim(coalesce(p_nickname, '')), 24));
    v_status := 'joined';
  end if;
  -- Team rooms: someone joining after the teams were made goes to the smallest team.
  if public.live_is_teams(r.settings) and exists (select 1 from public.live_teams where room_id = r.id) then
    perform public.live_assign_team(r.id, p_user);
  end if;
  update public.live_rooms set last_activity_at = now() where id = r.id;
  perform public.live_emit('live-host:' || r.id, 'players', jsonb_build_object('count', public.live_active_count(r.id)));
  return jsonb_build_object('status', v_status, 'room', r.id);
end $$;

create or replace function public.live_next(p_room uuid, p_host uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.live_rooms; v_pos integer; v_now timestamptz := clock_timestamp(); v_secs integer; v_deadline timestamptz;
begin
  select * into r from public.live_rooms where id = p_room and host = p_host for update;
  if r.id is null then return jsonb_build_object('status', 'not_allowed'); end if;
  if r.stage = 'finished' then return jsonb_build_object('status', 'finished'); end if;
  if r.stage = 'question' then return jsonb_build_object('status', 'question_open'); end if;
  -- Team rooms: make the teams at the start if the teacher hasn't, and
  -- place anyone still without a team.
  if public.live_is_teams(r.settings) then
    if not exists (select 1 from public.live_teams where room_id = p_room) then
      perform public.live_make_teams(p_room, p_host);
    end if;
    perform public.live_assign_team(p_room, pl.user_id)
       from public.live_players pl where pl.room_id = p_room and pl.team_no is null and not pl.kicked;
  end if;
  v_pos := r.current_q + 1;
  if v_pos >= r.total_q then return public.live_finish(p_room, p_host); end if;
  v_secs := greatest(5, least(300, coalesce((r.settings->>'seconds')::int, 20)));
  v_deadline := v_now + make_interval(secs => v_secs);
  update public.live_rooms set stage = 'question', current_q = v_pos, q_started_at = v_now, deadline = v_deadline,
         paused = false, paused_left_ms = null, last_activity_at = now()
   where id = p_room;
  perform public.live_emit('live:' || p_room, 'question', jsonb_build_object(
    'question', public.live_open_question(p_room, v_pos), 'total', r.total_q,
    'deadline', v_deadline, 'server_now', v_now, 'seconds', v_secs,
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
  if v_now > r.deadline + interval '1 second' then return jsonb_build_object('status', 'late'); end if;
  select * into q from public.live_room_questions where room_id = p_room and position = p_position;
  if p_choice < 0 or p_choice >= jsonb_array_length(q.options) then return jsonb_build_object('status', 'bad_choice'); end if;
  v_ms := greatest(0, (extract(epoch from (v_now - r.q_started_at)) * 1000)::int);
  v_frac := least(1, greatest(0, extract(epoch from (v_now - r.q_started_at)) / greatest(1, extract(epoch from (r.deadline - r.q_started_at)))));
  v_ok := (p_choice = q.answer);
  v_pts := case when v_ok then round(100 - 50 * v_frac)::int else 0 end;
  insert into public.live_answers (room_id, position, user_id, choice, received_at, ms, correct, points)
  values (p_room, p_position, p_user, p_choice, v_now, v_ms, v_ok, v_pts)
  on conflict do nothing;
  get diagnostics v_rows = row_count;
  if v_rows = 0 then return jsonb_build_object('status', 'duplicate'); end if;
  update public.live_players
     set score = score + v_pts, correct = correct + (case when v_ok then 1 else 0 end),
         total_ms = total_ms + v_ms, last_seen_at = now()
   where room_id = p_room and user_id = p_user;
  v_counts := public.live_counts(p_room, p_position);
  perform public.live_emit('live-host:' || p_room, 'answers', v_counts || jsonb_build_object(
    'position', p_position, 'players', public.live_active_count(p_room)));
  return jsonb_build_object('status', 'accepted');
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
  update public.live_rooms set stage = 'reveal', paused = false, paused_left_ms = null, deadline = v_next, last_activity_at = now() where id = p_room;
  select * into q from public.live_room_questions where room_id = p_room and position = r.current_q;
  perform public.live_emit('live:' || p_room, 'reveal', jsonb_build_object(
    'position', r.current_q, 'answer', q.answer, 'explanation', q.explanation,
    'counts', public.live_counts(p_room, r.current_q), 'total', r.total_q,
    'next_at', case when public.live_is_auto(r.settings) then v_next end));
  return jsonb_build_object('status', 'ok');
end $$;

create or replace function public.live_moderate(p_room uuid, p_host uuid, p_action text, p_user uuid, p_value text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.live_rooms where id = p_room and host = p_host) then
    return jsonb_build_object('status', 'not_allowed');
  end if;
  if p_action = 'kick' then
    update public.live_players set kicked = true where room_id = p_room and user_id = p_user;
    perform public.live_emit('live:' || p_room, 'kicked', jsonb_build_object('user', p_user));
  elsif p_action = 'rename' then
    update public.live_players set nickname = left(trim(coalesce(p_value, '')), 24) where room_id = p_room and user_id = p_user;
  elsif p_action = 'move' then
    -- Move a player to another team (team rooms).
    update public.live_players set team_no = p_value::int
     where room_id = p_room and user_id = p_user
       and exists (select 1 from public.live_teams where room_id = p_room and team_no = p_value::int);
    perform public.live_emit('live:' || p_room, 'teams', '{}'::jsonb);
  elsif p_action = 'lock' then
    update public.live_rooms set locked = (p_value = 'true') where id = p_room;
  else
    return jsonb_build_object('status', 'unknown_action');
  end if;
  update public.live_rooms set last_activity_at = now() where id = p_room;
  perform public.live_emit('live-host:' || p_room, 'players', jsonb_build_object('count', public.live_active_count(p_room)));
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
      'paused_left_ms', r.paused_left_ms, 'locked', r.locked,
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

create or replace function public.live_results(p_room uuid, p_user uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.live_rooms; v_host boolean; p public.live_players; v_review boolean;
begin
  select * into r from public.live_rooms where id = p_room;
  if r.id is null then return null; end if;
  v_host := (r.host = p_user);
  if v_host then
    return jsonb_build_object(
      'room', jsonb_build_object('id', r.id, 'title', r.title, 'code', r.code, 'stage', r.stage, 'created_at', r.created_at,
                                 'finished_at', r.finished_at, 'total', r.total_q, 'settings', r.settings),
      'players', (select coalesce(jsonb_agg(jsonb_build_object(
          'rank', x.rank, 'name', pl.display_name, 'email', pl.email, 'nickname', pl.nickname,
          'score', pl.score, 'correct', pl.correct, 'away', pl.away_count, 'total_ms', pl.total_ms) order by x.rank), '[]'::jsonb)
        from jsonb_to_recordset(public.live_ranking(p_room)) as x(rank int, user_id uuid)
        join public.live_players pl on pl.room_id = p_room and pl.user_id = x.user_id),
      'questions', (select coalesce(jsonb_agg(jsonb_build_object(
          'position', q.position, 'q', q.q, 'options', q.options, 'answer', q.answer,
          'answered', (select count(*) from public.live_answers a where a.room_id = p_room and a.position = q.position),
          'correct', (select count(*) from public.live_answers a where a.room_id = p_room and a.position = q.position and a.correct),
          'counts', public.live_counts(p_room, q.position)->'by_option') order by q.position), '[]'::jsonb)
        -- Only questions already asked (all of them once the room has finished).
        from public.live_room_questions q
        where q.room_id = p_room and q.position <= case when r.stage = 'finished' then r.total_q - 1 else r.current_q end),
      'average', (select round(avg(score)) from public.live_players where room_id = p_room and not kicked),
      'teams', case when public.live_is_teams(r.settings) then (select coalesce(jsonb_agg(e || jsonb_build_object('members',
          (select coalesce(jsonb_agg(pl.display_name order by pl.joined_at), '[]'::jsonb) from public.live_players pl
            where pl.room_id = p_room and pl.team_no = (e->>'no')::int and not pl.kicked)) order by (e->>'rank')::int), '[]'::jsonb)
        from jsonb_array_elements(public.live_team_ranking(p_room)) e) end);
  end if;
  select * into p from public.live_players where room_id = p_room and user_id = p_user;
  if p.room_id is null or r.stage <> 'finished' then return null; end if;
  v_review := coalesce((r.settings->>'review')::boolean, true);
  return jsonb_build_object(
    'room', jsonb_build_object('id', r.id, 'title', r.title, 'created_at', r.created_at, 'total', r.total_q),
    'me', jsonb_build_object('score', p.score, 'correct', p.correct,
      'rank', (select x.rank from jsonb_to_recordset(public.live_ranking(p_room)) as x(rank int, user_id uuid) where x.user_id = p_user),
      'players', public.live_active_count(p_room)),
    'board', public.live_public_board(p_room),
    'team', case when public.live_is_teams(r.settings) and p.team_no is not null then (
      select jsonb_build_object('name', t.name, 'rank', tr.rank, 'teams', (select count(*) from public.live_teams where room_id = p_room))
        from public.live_teams t left join jsonb_to_recordset(public.live_team_ranking(p_room)) as tr(no int, rank int) on tr.no = t.team_no
       where t.room_id = p_room and t.team_no = p.team_no) end,
    'review', v_review,
    'answers', (select coalesce(jsonb_agg(jsonb_build_object(
        'position', q.position,
        'q', case when v_review then q.q end, 'options', case when v_review then q.options end,
        'answer', case when v_review then q.answer end, 'explanation', case when v_review then q.explanation end,
        'choice', coalesce(a.choice, ta.choice), 'correct', coalesce(a.correct, ta.correct, false), 'points', coalesce(a.points, ta.points, 0),
        -- The bank question it came from, so the phone can add it to spaced review.
        'source_table', case when v_review then q.source_table end, 'source_id', case when v_review then q.source_id end) order by q.position), '[]'::jsonb)
      from public.live_room_questions q
      left join public.live_answers a on a.room_id = q.room_id and a.position = q.position and a.user_id = p_user
      left join public.live_team_answers ta on ta.room_id = q.room_id and ta.position = q.position and ta.team_no = p.team_no
      where q.room_id = p_room));
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
