-- Labobo Live, slice 1: teacher rooms in individual mode.
--
-- Design (see the "Labobo Live — Architecture" doc):
--   * Phones never read these tables. Every read and write goes through the
--     Netlify function netlify/functions/live.js with the service key, which
--     calls the live_* functions below. RLS is on with no policies, and the
--     anon/authenticated roles get no grants.
--   * The database is the referee: each function checks the stage, the
--     deadline and who is asking, and changes state in one step.
--   * Events are pushed with Supabase Realtime Broadcast from these functions
--     (realtime.send, private channels). Topics:
--       live:<room id>       every player and the host; never carries a
--                            correct answer before the question closes
--       live-host:<room id>  the host only (teacher view and projector):
--                            joins, answer counts, who left the app
--     Clients may listen but not send: realtime.messages gets a SELECT
--     policy only (live_can_listen), so nobody can fake a game event.
--   * A room freezes a shuffled copy of its questions at creation
--     (live_room_questions), keeping a link to the bank question.
--   * Scoring: a correct answer earns 100 points if instant, falling evenly
--     to 50 at the deadline; wrong = 0. Ties go to the lower total time.
--     Answers get 1 second of grace for network delay.

-- ── Tables ──────────────────────────────────────────────────────────────

create table public.teachers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  granted_by text,
  granted_at timestamptz not null default now()
);

create table public.custom_questions (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users(id) on delete cascade,
  q text not null check (length(q) between 1 and 2000),
  options jsonb not null check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) between 2 and 6),
  answer integer not null check (answer >= 0 and answer < 6),
  explanation text not null default '',
  -- private | pending (teacher allowed Labobo to use it, waiting for the admin) | approved | rejected
  review_status text not null default 'private' check (review_status in ('private', 'pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index custom_questions_owner_idx on public.custom_questions (owner);

create table public.live_quizzes (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(title) between 1 and 120),
  subject text not null default '',
  settings jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index live_quizzes_owner_idx on public.live_quizzes (owner);

create table public.live_quiz_items (
  quiz_id uuid not null references public.live_quizzes(id) on delete cascade,
  position integer not null check (position >= 0),
  source_table text,
  source_id bigint,
  custom_id uuid references public.custom_questions(id) on delete cascade,
  primary key (quiz_id, position),
  check ((source_table is not null and source_id is not null and custom_id is null)
      or (source_table is null and source_id is null and custom_id is not null))
);

create table public.live_rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null check (code ~ '^[0-9]{6}$'),
  host uuid not null references auth.users(id) on delete cascade,
  quiz_id uuid references public.live_quizzes(id) on delete set null,
  title text not null default '',
  -- { seconds, mode, names: 'nicknames'|'real', leaderboard: 'all'|'top5'|'none', review: bool }
  settings jsonb not null default '{}',
  stage text not null default 'lobby' check (stage in ('lobby', 'question', 'reveal', 'leaderboard', 'finished')),
  current_q integer not null default -1,
  total_q integer not null default 0,
  q_started_at timestamptz,
  deadline timestamptz,
  paused boolean not null default false,
  paused_left_ms integer,
  locked boolean not null default false,
  created_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  finished_at timestamptz
);
-- A code is unique only among rooms still running; finished rooms free it.
create unique index live_rooms_active_code on public.live_rooms (code) where stage <> 'finished';
create index live_rooms_host_idx on public.live_rooms (host, created_at desc);

create table public.live_room_questions (
  room_id uuid not null references public.live_rooms(id) on delete cascade,
  position integer not null,
  q text not null,
  options jsonb not null,           -- already shuffled for this room
  answer integer not null,          -- index into the shuffled options
  explanation text not null default '',
  image text not null default '',
  source_table text,
  source_id bigint,
  custom_id uuid,
  primary key (room_id, position)
);

create table public.live_players (
  room_id uuid not null references public.live_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null default '',
  email text not null default '',
  nickname text not null default '',
  score integer not null default 0,
  correct integer not null default 0,
  total_ms bigint not null default 0,
  away_count integer not null default 0,
  kicked boolean not null default false,
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (room_id, user_id)
);
create index live_players_user_idx on public.live_players (user_id, joined_at desc);

create table public.live_answers (
  room_id uuid not null references public.live_rooms(id) on delete cascade,
  position integer not null,
  user_id uuid not null,
  choice integer not null,
  received_at timestamptz not null default clock_timestamp(),
  ms integer not null,
  correct boolean not null,
  points integer not null,
  primary key (room_id, position, user_id)
);

alter table public.teachers enable row level security;
alter table public.custom_questions enable row level security;
alter table public.live_quizzes enable row level security;
alter table public.live_quiz_items enable row level security;
alter table public.live_rooms enable row level security;
alter table public.live_room_questions enable row level security;
alter table public.live_players enable row level security;
alter table public.live_answers enable row level security;

-- ── Helpers ─────────────────────────────────────────────────────────────

-- Push one event to a room topic (private channel).
create or replace function public.live_emit(p_topic text, p_event text, p_payload jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform realtime.send(p_payload, p_event, p_topic, true);
end $$;

-- The name the projector shows for a player, by the room's setting. In
-- nickname mode a student who gave no nickname shows by first name only.
create or replace function public.live_shown_name(p_settings jsonb, p_nickname text, p_display text)
returns text language sql immutable as $$
  select case when coalesce(p_settings->>'names', 'nicknames') = 'real'
              then coalesce(nullif(p_display, ''), nullif(p_nickname, ''), 'Student')
              else coalesce(nullif(p_nickname, ''), nullif(split_part(split_part(trim(p_display), ' ', 1), '@', 1), ''), 'Student') end;
$$;

-- Players still in the room (not kicked).
create or replace function public.live_active_count(p_room uuid)
returns integer language sql stable security definer set search_path = public as $$
  select count(*)::int from public.live_players where room_id = p_room and not kicked;
$$;

-- Ranked players: score desc, then lower total time.
create or replace function public.live_ranking(p_room uuid, p_limit integer default null)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(x order by x.rank), '[]'::jsonb) from (
    select row_number() over (order by p.score desc, p.total_ms asc, p.joined_at asc) as rank,
           public.live_shown_name(r.settings, p.nickname, p.display_name) as name,
           p.score, p.correct, p.user_id
      from public.live_players p join public.live_rooms r on r.id = p.room_id
     where p.room_id = p_room and not p.kicked
     order by p.score desc, p.total_ms asc, p.joined_at asc
     limit p_limit
  ) x;
$$;

-- What the players may see of the leaderboard, by the room's setting.
create or replace function public.live_public_board(p_room uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select case coalesce(r.settings->>'leaderboard', 'top5')
           when 'none' then '[]'::jsonb
           when 'all' then (select coalesce(jsonb_agg(e - 'user_id'), '[]'::jsonb) from jsonb_array_elements(public.live_ranking(p_room)) e)
           else (select coalesce(jsonb_agg(e - 'user_id'), '[]'::jsonb) from jsonb_array_elements(public.live_ranking(p_room, 5)) e)
         end
    from public.live_rooms r where r.id = p_room;
$$;

-- Answer counts per option for the current question.
create or replace function public.live_counts(p_room uuid, p_position integer)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'answered', count(*),
    'by_option', coalesce((select jsonb_object_agg(choice, n) from (
        select choice, count(*) n from public.live_answers
         where room_id = p_room and position = p_position group by choice) c), '{}'::jsonb))
  from public.live_answers where room_id = p_room and position = p_position;
$$;

-- The question as a player may see it while it is open: no answer.
create or replace function public.live_open_question(p_room uuid, p_position integer)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('position', q.position, 'q', q.q, 'options', q.options, 'image', q.image)
    from public.live_room_questions q where q.room_id = p_room and q.position = p_position;
$$;

-- Realtime authorization: who may LISTEN to a topic. There is no INSERT
-- policy, so clients can never send on these channels.
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
    return v_kind in ('live', 'live-host');
  end if;
  if v_kind = 'live' then
    return exists (select 1 from public.live_players where room_id = v_room and user_id = auth.uid() and not kicked);
  end if;
  return false;
end $$;

create policy live_listen on realtime.messages
  for select to authenticated
  using (realtime.messages.extension = 'broadcast' and public.live_can_listen(realtime.topic()));

-- ── Room lifecycle ──────────────────────────────────────────────────────

-- Create a room with its frozen questions. p_questions: [{q, options, answer,
-- explanation, image, source_table, source_id, custom_id}], options already
-- shuffled by the caller. Returns { id, code }.
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
  insert into public.live_room_questions (room_id, position, q, options, answer, explanation, image, source_table, source_id, custom_id)
  select v_id, (e.ord - 1)::int, e.v->>'q', e.v->'options', (e.v->>'answer')::int,
         coalesce(e.v->>'explanation', ''), coalesce(e.v->>'image', ''),
         e.v->>'source_table', (e.v->>'source_id')::bigint, (e.v->>'custom_id')::uuid
    from jsonb_array_elements(p_questions) with ordinality e(v, ord);
  return jsonb_build_object('id', v_id, 'code', v_code);
end $$;

-- Join (or rejoin) a running room by code. Returns { status, room }.
-- status: joined | rejoined | not_found | locked | kicked
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
  update public.live_rooms set last_activity_at = now() where id = r.id;
  perform public.live_emit('live-host:' || r.id, 'players', jsonb_build_object('count', public.live_active_count(r.id)));
  return jsonb_build_object('status', v_status, 'room', r.id);
end $$;

-- Open the next question (or finish after the last). Host only.
create or replace function public.live_next(p_room uuid, p_host uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.live_rooms; v_pos integer; v_now timestamptz := clock_timestamp(); v_secs integer; v_deadline timestamptz;
begin
  select * into r from public.live_rooms where id = p_room and host = p_host for update;
  if r.id is null then return jsonb_build_object('status', 'not_allowed'); end if;
  if r.stage = 'finished' then return jsonb_build_object('status', 'finished'); end if;
  if r.stage = 'question' then return jsonb_build_object('status', 'question_open'); end if;
  v_pos := r.current_q + 1;
  if v_pos >= r.total_q then return public.live_finish(p_room, p_host); end if;
  v_secs := greatest(5, least(300, coalesce((r.settings->>'seconds')::int, 20)));
  v_deadline := v_now + make_interval(secs => v_secs);
  update public.live_rooms set stage = 'question', current_q = v_pos, q_started_at = v_now, deadline = v_deadline,
         paused = false, paused_left_ms = null, last_activity_at = now()
   where id = p_room;
  perform public.live_emit('live:' || p_room, 'question', jsonb_build_object(
    'question', public.live_open_question(p_room, v_pos), 'total', r.total_q,
    'deadline', v_deadline, 'server_now', v_now, 'seconds', v_secs));
  return jsonb_build_object('status', 'ok', 'position', v_pos, 'deadline', v_deadline);
end $$;

-- A player's answer. The first answer counts; late ones are refused.
-- Returns { status }: accepted | duplicate | late | closed | paused | not_in_room
-- The player learns whether it was right only at the reveal.
create or replace function public.live_answer(p_room uuid, p_user uuid, p_position integer, p_choice integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.live_rooms; q public.live_room_questions; v_now timestamptz := clock_timestamp();
        v_ms integer; v_frac numeric; v_ok boolean; v_pts integer; v_rows integer; v_counts jsonb;
begin
  select * into r from public.live_rooms where id = p_room;
  if r.id is null or not exists (select 1 from public.live_players where room_id = p_room and user_id = p_user and not kicked) then
    return jsonb_build_object('status', 'not_in_room');
  end if;
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

-- Close the open question and reveal the answer. The host may close early;
-- anyone in the room may close it once the deadline (+1 s grace) has passed,
-- so the game never sticks when the teacher's laptop drops.
create or replace function public.live_close(p_room uuid, p_user uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.live_rooms; q public.live_room_questions; v_host boolean;
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
  update public.live_rooms set stage = 'reveal', paused = false, paused_left_ms = null, last_activity_at = now() where id = p_room;
  select * into q from public.live_room_questions where room_id = p_room and position = r.current_q;
  perform public.live_emit('live:' || p_room, 'reveal', jsonb_build_object(
    'position', r.current_q, 'answer', q.answer, 'explanation', q.explanation,
    'counts', public.live_counts(p_room, r.current_q), 'total', r.total_q));
  return jsonb_build_object('status', 'ok');
end $$;

-- Show the leaderboard between questions. Host only.
create or replace function public.live_show_board(p_room uuid, p_host uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.live_rooms;
begin
  select * into r from public.live_rooms where id = p_room and host = p_host for update;
  if r.id is null then return jsonb_build_object('status', 'not_allowed'); end if;
  if r.stage <> 'reveal' then return jsonb_build_object('status', 'not_reveal'); end if;
  update public.live_rooms set stage = 'leaderboard', last_activity_at = now() where id = p_room;
  perform public.live_emit('live:' || p_room, 'leaderboard', jsonb_build_object('board', public.live_public_board(p_room)));
  return jsonb_build_object('status', 'ok');
end $$;

create or replace function public.live_finish(p_room uuid, p_host uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.live_rooms;
begin
  select * into r from public.live_rooms where id = p_room and host = p_host;
  if r.id is null then return jsonb_build_object('status', 'not_allowed'); end if;
  if r.stage = 'finished' then return jsonb_build_object('status', 'finished'); end if;
  update public.live_rooms set stage = 'finished', finished_at = now(), paused = false, last_activity_at = now() where id = p_room;
  perform public.live_emit('live:' || p_room, 'finished', jsonb_build_object('board', public.live_public_board(p_room)));
  return jsonb_build_object('status', 'finished');
end $$;

-- Pause or resume. A paused question keeps its remaining time.
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
    v_deadline := case when r.stage = 'question' then v_now + make_interval(secs => coalesce(r.paused_left_ms, 0) / 1000.0) else r.deadline end;
    -- Keep speed scoring fair: shift the start by the pause too.
    update public.live_rooms set paused = false, paused_left_ms = null, deadline = v_deadline,
           q_started_at = case when r.stage = 'question' then v_deadline - (r.deadline - r.q_started_at) else q_started_at end,
           last_activity_at = now()
     where id = p_room;
    perform public.live_emit('live:' || p_room, 'resumed', jsonb_build_object('deadline', v_deadline, 'server_now', v_now));
  end if;
  return jsonb_build_object('status', 'ok');
end $$;

-- Teacher controls on players and the room.
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
  elsif p_action = 'lock' then
    update public.live_rooms set locked = (p_value = 'true') where id = p_room;
  else
    return jsonb_build_object('status', 'unknown_action');
  end if;
  update public.live_rooms set last_activity_at = now() where id = p_room;
  perform public.live_emit('live-host:' || p_room, 'players', jsonb_build_object('count', public.live_active_count(p_room)));
  return jsonb_build_object('status', 'ok');
end $$;

-- The phone reports that the student left the app during a question.
create or replace function public.live_away(p_room uuid, p_user uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.live_rooms;
begin
  select * into r from public.live_rooms where id = p_room;
  if r.id is null or r.stage <> 'question' then return jsonb_build_object('status', 'ignored'); end if;
  update public.live_players set away_count = away_count + 1 where room_id = p_room and user_id = p_user and not kicked;
  if found then
    perform public.live_emit('live-host:' || p_room, 'away', jsonb_build_object('user', p_user));
  end if;
  return jsonb_build_object('status', 'ok');
end $$;

-- ── Reads ───────────────────────────────────────────────────────────────

-- Everything a phone, the teacher view or the projector needs to (re)draw
-- the room right now. Never includes the correct answer while a question is
-- open. Returns null if the caller is neither the host nor a player.
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
  return v_out;
end $$;

-- Full results of a room. The host sees everyone (real names and emails);
-- a player sees their own answers, plus the questions if the teacher allowed
-- review, plus the leaderboard the teacher allowed. Only after it finishes
-- for players; any time for the host.
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
      'average', (select round(avg(score)) from public.live_players where room_id = p_room and not kicked));
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
    'review', v_review,
    'answers', (select coalesce(jsonb_agg(jsonb_build_object(
        'position', q.position,
        'q', case when v_review then q.q end, 'options', case when v_review then q.options end,
        'answer', case when v_review then q.answer end, 'explanation', case when v_review then q.explanation end,
        'choice', a.choice, 'correct', coalesce(a.correct, false), 'points', coalesce(a.points, 0)) order by q.position), '[]'::jsonb)
      from public.live_room_questions q
      left join public.live_answers a on a.room_id = q.room_id and a.position = q.position and a.user_id = p_user
      where q.room_id = p_room));
end $$;

-- A student's past teacher sessions, newest first.
create or replace function public.live_history(p_user uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'room', r.id, 'title', r.title, 'date', r.created_at, 'total', r.total_q,
    'score', p.score, 'correct', p.correct,
    'rank', (select x.rank from jsonb_to_recordset(public.live_ranking(r.id)) as x(rank int, user_id uuid) where x.user_id = p_user),
    'players', public.live_active_count(r.id)) order by r.created_at desc), '[]'::jsonb)
  from public.live_players p join public.live_rooms r on r.id = p.room_id
  where p.user_id = p_user and not p.kicked and r.stage = 'finished';
$$;

-- A teacher's rooms, newest first.
create or replace function public.live_hosted(p_host uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'room', r.id, 'title', r.title, 'code', r.code, 'stage', r.stage, 'date', r.created_at, 'total', r.total_q,
    'players', public.live_active_count(r.id),
    'average', (select round(avg(score)) from public.live_players where room_id = r.id and not kicked))
    order by r.created_at desc), '[]'::jsonb)
  from public.live_rooms r where r.host = p_host;
$$;

-- ── Grants ──────────────────────────────────────────────────────────────
-- Only the service key (Netlify) may call the live_* functions. The one
-- exception is live_can_listen, which Realtime evaluates as the listener.

revoke all on public.teachers, public.custom_questions, public.live_quizzes, public.live_quiz_items,
  public.live_rooms, public.live_room_questions, public.live_players, public.live_answers from anon, authenticated;

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
