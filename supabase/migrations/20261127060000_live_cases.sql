-- Labobo Live: case-scenario rooms (teacher-marked, self-paced, in teams).
--
-- Decisions (see the architecture doc / memory):
--   * A case set has cases; a case = one scenario + 1-6 questions. Each
--     question is 'options' (a choice + optional explanation) or 'open'
--     (written answer only) and has its own max mark.
--   * Room mode 'cases'. Teams are made and named in the lobby exactly as in
--     team quizzes (live_is_teams covers 'cases' too). The teacher presses
--     Start (live_next), the room goes to stage 'cases', and every team works
--     through the cases in order at its own pace. No timer.
--   * One shared answer per team: any member edits the team's draft
--     (live_case_draft), everyone sees it, one presses Submit
--     (live_case_submit). Submitting locks that case; the team moves on.
--   * The teacher marks per question (0..max, optional comment) while teams
--     still work, then ends the room and releases the marks. Option answers
--     are checked automatically and shown to the teacher; students see marks,
--     comments and the right options only after release.

alter table public.live_rooms drop constraint if exists live_rooms_stage_check;
alter table public.live_rooms add constraint live_rooms_stage_check
  check (stage in ('lobby', 'question', 'reveal', 'leaderboard', 'cases', 'finished'));
alter table public.live_rooms add column marks_released boolean not null default false;

create table public.case_sets (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(title) between 1 and 120),
  subject text not null default '',
  -- [{ scenario, questions: [{ kind: 'options'|'open', q, options: [..], answer, max }] }]
  cases jsonb not null default '[]' check (jsonb_typeof(cases) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index case_sets_owner_idx on public.case_sets (owner);

-- A room's frozen copy of its cases.
create table public.live_room_cases (
  room_id uuid not null references public.live_rooms(id) on delete cascade,
  position integer not null,
  scenario text not null,
  questions jsonb not null,
  primary key (room_id, position)
);

-- One per team per case: the shared draft, then the submitted answer, then marks.
create table public.live_case_answers (
  room_id uuid not null references public.live_rooms(id) on delete cascade,
  position integer not null,
  team_no integer not null,
  answers jsonb not null default '[]',          -- [{ choice: int|null, text: string }] per question
  updated_by uuid,
  updated_at timestamptz not null default now(),
  submitted_at timestamptz,
  submitted_by uuid,
  marks jsonb not null default '[]',            -- [{ mark: int|null, comment: string }] per question
  primary key (room_id, position, team_no)
);

alter table public.case_sets enable row level security;
alter table public.live_room_cases enable row level security;
alter table public.live_case_answers enable row level security;
revoke all on public.case_sets, public.live_room_cases, public.live_case_answers from anon, authenticated;

-- Case rooms use teams too (making, naming, the team channel, the team view).
create or replace function public.live_is_teams(p_settings jsonb)
returns boolean language sql immutable as $$ select coalesce(p_settings->>'mode', 'individual') in ('teams', 'cases') $$;

create or replace function public.live_is_cases(p_settings jsonb)
returns boolean language sql immutable as $$ select coalesce(p_settings->>'mode', 'individual') = 'cases' $$;

-- Create a case room with its frozen cases. p_cases as in case_sets.cases.
create or replace function public.live_create_case_room(p_host uuid, p_title text, p_settings jsonb, p_cases jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_code text; v_id uuid; v_n integer := jsonb_array_length(p_cases); v_try integer := 0;
begin
  if v_n < 1 then raise exception 'no cases'; end if;
  update public.live_rooms set stage = 'finished', finished_at = now()
   where stage <> 'finished' and last_activity_at < now() - interval '3 hours';
  loop
    v_try := v_try + 1;
    v_code := lpad((floor(random() * 1000000))::int::text, 6, '0');
    begin
      insert into public.live_rooms (code, host, title, settings, total_q)
      values (v_code, p_host, left(coalesce(p_title, ''), 120), coalesce(p_settings, '{}') || '{"mode":"cases"}', v_n)
      returning id into v_id;
      exit;
    exception when unique_violation then
      if v_try > 20 then raise exception 'no free room code'; end if;
    end;
  end loop;
  insert into public.live_room_cases (room_id, position, scenario, questions)
  select v_id, (e.ord - 1)::int, coalesce(e.v->>'scenario', ''), e.v->'questions'
    from jsonb_array_elements(p_cases) with ordinality e(v, ord);
  return jsonb_build_object('id', v_id, 'code', v_code);
end $$;

-- Which case a team is on: the first one it hasn't submitted.
create or replace function public.live_case_current(p_room uuid, p_team integer)
returns integer language sql stable security definer set search_path = public as $$
  select count(*)::int from public.live_case_answers
   where room_id = p_room and team_no = p_team and submitted_at is not null;
$$;

-- Save the team's draft for its current case (any member). Last write wins.
create or replace function public.live_case_draft(p_room uuid, p_user uuid, p_position integer, p_answers jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.live_rooms; p public.live_players; c public.live_room_cases;
begin
  select * into r from public.live_rooms where id = p_room;
  select * into p from public.live_players where room_id = p_room and user_id = p_user and not kicked;
  if r.id is null or p.room_id is null or p.team_no is null or not public.live_is_cases(r.settings) then
    return jsonb_build_object('status', 'not_in_room');
  end if;
  if r.stage <> 'cases' then return jsonb_build_object('status', 'closed'); end if;
  if p_position <> public.live_case_current(p_room, p.team_no) then return jsonb_build_object('status', 'not_current'); end if;
  select * into c from public.live_room_cases where room_id = p_room and position = p_position;
  if c.room_id is null then return jsonb_build_object('status', 'closed'); end if;
  if jsonb_typeof(p_answers) <> 'array' or jsonb_array_length(p_answers) > jsonb_array_length(c.questions) then
    return jsonb_build_object('status', 'bad_answers');
  end if;
  insert into public.live_case_answers (room_id, position, team_no, answers, updated_by, updated_at)
  values (p_room, p_position, p.team_no, p_answers, p_user, now())
  on conflict (room_id, position, team_no) do update
     set answers = excluded.answers, updated_by = excluded.updated_by, updated_at = excluded.updated_at
   where public.live_case_answers.submitted_at is null;
  perform public.live_emit('live-team:' || p_room || ':' || p.team_no, 'case_draft', jsonb_build_object('position', p_position, 'by', p_user));
  update public.live_rooms set last_activity_at = now() where id = p_room;
  return jsonb_build_object('status', 'ok');
end $$;

-- Submit the team's current case (locks it).
create or replace function public.live_case_submit(p_room uuid, p_user uuid, p_position integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.live_rooms; p public.live_players; v_rows integer;
begin
  select * into r from public.live_rooms where id = p_room;
  select * into p from public.live_players where room_id = p_room and user_id = p_user and not kicked;
  if r.id is null or p.room_id is null or p.team_no is null or not public.live_is_cases(r.settings) then
    return jsonb_build_object('status', 'not_in_room');
  end if;
  if r.stage <> 'cases' then return jsonb_build_object('status', 'closed'); end if;
  if p_position <> public.live_case_current(p_room, p.team_no) then return jsonb_build_object('status', 'not_current'); end if;
  insert into public.live_case_answers (room_id, position, team_no, answers, updated_by, submitted_at, submitted_by)
  values (p_room, p_position, p.team_no, '[]', p_user, now(), p_user)
  on conflict (room_id, position, team_no) do update set submitted_at = now(), submitted_by = p_user
   where public.live_case_answers.submitted_at is null;
  get diagnostics v_rows = row_count;
  if v_rows = 0 then return jsonb_build_object('status', 'duplicate'); end if;
  perform public.live_emit('live-team:' || p_room || ':' || p.team_no, 'case_submit', jsonb_build_object('position', p_position));
  perform public.live_emit('live-host:' || p_room, 'players', jsonb_build_object('case_submit', p.team_no));
  update public.live_rooms set last_activity_at = now() where id = p_room;
  return jsonb_build_object('status', 'ok', 'finished', public.live_case_current(p_room, p.team_no) >= r.total_q);
end $$;

-- Teacher marks one question of one team's case (0..max, optional comment).
create or replace function public.live_case_mark(p_room uuid, p_host uuid, p_position integer, p_team integer, p_question integer, p_mark integer, p_comment text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.live_rooms; c public.live_room_cases; v_max integer; v_marks jsonb;
begin
  select * into r from public.live_rooms where id = p_room and host = p_host;
  if r.id is null then return jsonb_build_object('status', 'not_allowed'); end if;
  select * into c from public.live_room_cases where room_id = p_room and position = p_position;
  if c.room_id is null or p_question < 0 or p_question >= jsonb_array_length(c.questions) then return jsonb_build_object('status', 'not_found'); end if;
  v_max := coalesce((c.questions->p_question->>'max')::int, 5);
  if p_mark is not null and (p_mark < 0 or p_mark > v_max) then return jsonb_build_object('status', 'bad_mark', 'max', v_max); end if;
  select marks into v_marks from public.live_case_answers
   where room_id = p_room and position = p_position and team_no = p_team and submitted_at is not null;
  if not found then return jsonb_build_object('status', 'not_submitted'); end if;
  -- Pad the marks array to the number of questions, then set this one.
  while jsonb_array_length(v_marks) < jsonb_array_length(c.questions) loop
    v_marks := v_marks || '[{"mark":null,"comment":""}]'::jsonb;
  end loop;
  v_marks := jsonb_set(v_marks, array[p_question::text], jsonb_build_object('mark', p_mark, 'comment', left(coalesce(p_comment, ''), 1000)));
  update public.live_case_answers set marks = v_marks
   where room_id = p_room and position = p_position and team_no = p_team;
  return jsonb_build_object('status', 'ok');
end $$;

-- Teacher releases the marks (after ending the room); teams then see them.
create or replace function public.live_case_release(p_room uuid, p_host uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.live_rooms;
begin
  select * into r from public.live_rooms where id = p_room and host = p_host;
  if r.id is null then return jsonb_build_object('status', 'not_allowed'); end if;
  if r.stage <> 'finished' then
    update public.live_rooms set stage = 'finished', finished_at = now() where id = p_room;
  end if;
  update public.live_rooms set marks_released = true, last_activity_at = now() where id = p_room;
  perform public.live_emit('live:' || p_room, 'released', '{}'::jsonb);
  return jsonb_build_object('status', 'ok');
end $$;

-- A team's total so far: marked points / possible points of its submitted cases.
create or replace function public.live_case_totals(p_room uuid, p_team integer)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'marks', coalesce(sum((m->>'mark')::int), 0),
    'max', (select coalesce(sum(coalesce((q->>'max')::int, 5)), 0) from public.live_room_cases c, jsonb_array_elements(c.questions) q where c.room_id = p_room))
  from public.live_case_answers a
  left join lateral jsonb_array_elements(a.marks) m on true
  where a.room_id = p_room and a.team_no = p_team;
$$;

-- Everything a case-room screen needs. Host: all cases with answers, every
-- team's progress, answers and marks. Player: their team's current case
-- (no right answers), its draft, their progress; after release, every case
-- with their answers, marks, comments and the right options.
create or replace function public.live_case_view(p_room uuid, p_user uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare r public.live_rooms; p public.live_players; v_host boolean; v_cur integer; c public.live_room_cases;
begin
  select * into r from public.live_rooms where id = p_room;
  if r.id is null or not public.live_is_cases(r.settings) then return null; end if;
  v_host := (r.host = p_user);
  if v_host then
    return jsonb_build_object(
      'role', 'host', 'stage', r.stage, 'released', r.marks_released, 'total', r.total_q,
      'cases', (select coalesce(jsonb_agg(jsonb_build_object('position', c2.position, 'scenario', c2.scenario, 'questions', c2.questions) order by c2.position), '[]'::jsonb)
                from public.live_room_cases c2 where c2.room_id = p_room),
      'teams', (select coalesce(jsonb_agg(jsonb_build_object(
          'no', t.team_no, 'name', t.name,
          'done', public.live_case_current(p_room, t.team_no),
          'totals', public.live_case_totals(p_room, t.team_no),
          'members', (select coalesce(jsonb_agg(public.live_shown_name(r.settings, pl.nickname, pl.display_name) order by pl.joined_at), '[]'::jsonb)
                      from public.live_players pl where pl.room_id = p_room and pl.team_no = t.team_no and not pl.kicked),
          'answers', (select coalesce(jsonb_agg(jsonb_build_object('position', a.position, 'answers', a.answers, 'submitted', a.submitted_at is not null,
                                                                   'submitted_at', a.submitted_at, 'marks', a.marks) order by a.position), '[]'::jsonb)
                      from public.live_case_answers a where a.room_id = p_room and a.team_no = t.team_no)) order by t.team_no), '[]'::jsonb)
        from public.live_teams t where t.room_id = p_room));
  end if;

  select * into p from public.live_players where room_id = p_room and user_id = p_user;
  if p.room_id is null then return null; end if;
  if p.team_no is null then
    return jsonb_build_object('role', 'player', 'stage', r.stage, 'released', r.marks_released, 'total', r.total_q, 'team', null);
  end if;
  v_cur := public.live_case_current(p_room, p.team_no);
  if r.marks_released then
    return jsonb_build_object('role', 'player', 'stage', r.stage, 'released', true, 'total', r.total_q, 'done', v_cur,
      'totals', public.live_case_totals(p_room, p.team_no),
      'review', (select coalesce(jsonb_agg(jsonb_build_object('position', c2.position, 'scenario', c2.scenario, 'questions', c2.questions,
                   'answers', a.answers, 'marks', a.marks, 'submitted', a.submitted_at is not null) order by c2.position), '[]'::jsonb)
                 from public.live_room_cases c2
                 left join public.live_case_answers a on a.room_id = c2.room_id and a.position = c2.position and a.team_no = p.team_no
                 where c2.room_id = p_room));
  end if;
  select * into c from public.live_room_cases where room_id = p_room and position = v_cur;
  return jsonb_build_object('role', 'player', 'stage', r.stage, 'released', false, 'total', r.total_q, 'done', v_cur,
    'current', case when r.stage = 'cases' and c.room_id is not null then jsonb_build_object(
        'position', c.position, 'scenario', c.scenario,
        -- Questions without the right answer.
        'questions', (select coalesce(jsonb_agg(q - 'answer' order by i), '[]'::jsonb) from jsonb_array_elements(c.questions) with ordinality x(q, i)),
        'draft', (select jsonb_build_object('answers', a.answers, 'updated_by', a.updated_by, 'updated_at', a.updated_at)
                  from public.live_case_answers a where a.room_id = p_room and a.position = v_cur and a.team_no = p.team_no)) end);
end $$;

-- Start: case rooms go straight to stage 'cases'.
create or replace function public.live_next(p_room uuid, p_host uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.live_rooms; v_pos integer; v_now timestamptz := clock_timestamp(); v_secs integer; v_deadline timestamptz;
begin
  select * into r from public.live_rooms where id = p_room and host = p_host for update;
  if r.id is null then return jsonb_build_object('status', 'not_allowed'); end if;
  if r.stage = 'finished' then return jsonb_build_object('status', 'finished'); end if;
  if r.stage = 'question' then return jsonb_build_object('status', 'question_open'); end if;
  if r.stage = 'cases' then return jsonb_build_object('status', 'started'); end if;
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
