-- Study tracking: what students do in Study mode and Flashcards.
-- Finished practice sets and exams already reach `sessions`; study mode and
-- flashcards only ever lived in the browser, so the dashboard couldn't see
-- them. The app now sends each answer (in small batches, see
-- netlify/functions/study.js) and they are counted here.
--   study_activity: per student, per day (their own calendar day), per
--                   question bank and topic: how many answered / right.
--   study_seen:     which questions a student has studied at least once,
--                   for coverage ("has seen 64% of Anatomy").
-- Every function here is for the service role (the Netlify functions) only.

create table if not exists public.study_activity (
  user_id  text        not null,
  day      date        not null,
  bank     text        not null check (bank ~ '^[a-z0-9_]{1,63}$'),
  topic    text        not null check (char_length(topic) between 1 and 120),
  mode     text        not null check (mode in ('study', 'flashcards')),
  answered int         not null default 0,
  correct  int         not null default 0,
  first_at timestamptz not null default now(),
  last_at  timestamptz not null default now(),
  primary key (user_id, day, bank, topic, mode)
);
create index if not exists study_activity_day on public.study_activity (day);
alter table public.study_activity enable row level security;

create table if not exists public.study_seen (
  user_id     text        not null,
  question_id text        not null check (question_id ~ '^[a-z0-9_]+:[0-9]+$'),
  first_at    timestamptz not null default now(),
  primary key (user_id, question_id)
);
alter table public.study_seen enable row level security;

-- p_items: [{"id": "<table>:<row id>", "topic": "Bones", "correct": true}, ...]
-- Folded per bank and topic first: ON CONFLICT can't touch a row twice.
create or replace function public.record_study(p_user text, p_tz text, p_mode text, p_items jsonb)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_day date := (now() at time zone p_tz)::date;
begin
  with items as (
    select x ->> 'id' as qid,
           split_part(x ->> 'id', ':', 1) as bank,
           left(coalesce(nullif(btrim(x ->> 'topic'), ''), 'General'), 120) as topic,
           coalesce(x -> 'correct' = 'true'::jsonb, false) as ok
    from jsonb_array_elements(p_items) as x
    where x ->> 'id' ~ '^[a-z0-9_]{1,63}:[0-9]{1,19}$'
  )
  insert into public.study_activity as a (user_id, day, bank, topic, mode, answered, correct)
  select p_user, v_day, bank, topic, p_mode, count(*)::int, (count(*) filter (where ok))::int
  from items group by bank, topic
  on conflict (user_id, day, bank, topic, mode) do update
    set answered = a.answered + excluded.answered,
        correct  = a.correct + excluded.correct,
        last_at  = now();

  insert into public.study_seen (user_id, question_id)
  select distinct p_user, x ->> 'id'
  from jsonb_array_elements(p_items) as x
  where x ->> 'id' ~ '^[a-z0-9_]{1,63}:[0-9]{1,19}$'
  on conflict do nothing;
end;
$$;

-- ── one student's studying ──────────────────────────────────────────────
create or replace function public.admin_user_study(p_user text, p_tz text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_today date := (now() at time zone p_tz)::date;
  v_out jsonb;
begin
  with a as (select * from public.study_activity where user_id = p_user),
       seen as (select split_part(question_id, ':', 1) as bank, count(*) as n
                from public.study_seen where user_id = p_user group by 1)
  select jsonb_build_object(
    'totals', jsonb_build_object(
      'answered', (select coalesce(sum(answered), 0) from a),
      'correct', (select coalesce(sum(correct), 0) from a),
      'study_answered', (select coalesce(sum(answered), 0) from a where mode = 'study'),
      'flashcards', (select coalesce(sum(answered), 0) from a where mode = 'flashcards'),
      'days', (select count(distinct day) from a),
      'seen', (select coalesce(sum(n), 0) from seen),
      'first_at', (select min(first_at) from a),
      'last_at', (select max(last_at) from a)
    ),
    'by_bank', (select coalesce(jsonb_agg(jsonb_build_object(
                  'bank', x.bank, 'answered', x.answered, 'correct', x.correct,
                  'seen', coalesce(seen.n, 0), 'last_at', x.last_at) order by x.answered desc), '[]'::jsonb)
                from (select bank, sum(answered) as answered, sum(correct) as correct, max(last_at) as last_at
                      from a group by bank) x
                left join seen on seen.bank = x.bank),
    'by_topic', (select coalesce(jsonb_agg(jsonb_build_object(
                   'bank', bank, 'topic', topic, 'answered', answered, 'correct', correct, 'last_at', last_at)
                   order by last_at desc), '[]'::jsonb)
                 from (select bank, topic, sum(answered) as answered, sum(correct) as correct, max(last_at) as last_at
                       from a group by bank, topic order by max(last_at) desc limit 60) t),
    'by_day', (select jsonb_agg(jsonb_build_object('day', g.d, 'n', coalesce(c.n, 0)) order by g.d)
               from (select v_today - i as d from generate_series(0, 29) as i) g
               left join (select day, sum(answered) as n from a group by day) c on c.day = g.d)
  ) into v_out;
  return v_out;
end;
$$;

-- ── everyone's studying, for the Overview ───────────────────────────────
create or replace function public.admin_study_overview(p_tz text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_today date := (now() at time zone p_tz)::date;
  v_out jsonb;
begin
  with a as (select * from public.study_activity where day between v_today - 29 and v_today)
  select jsonb_build_object(
    'answered_today', coalesce(sum(answered) filter (where day = v_today), 0),
    'answered_7d', coalesce(sum(answered) filter (where day >= v_today - 6), 0),
    'answered_30d', coalesce(sum(answered), 0),
    'students_today', count(distinct user_id) filter (where day = v_today),
    'students_7d', count(distinct user_id) filter (where day >= v_today - 6),
    'students_30d', count(distinct user_id),
    'all_time', (select coalesce(sum(answered), 0) from public.study_activity),
    'by_day', (select jsonb_agg(jsonb_build_object('day', g.d, 'n', coalesce(c.n, 0), 'users', coalesce(c.users, 0)) order by g.d)
               from (select v_today - i as d from generate_series(0, 13) as i) g
               left join (select day, sum(answered) as n, count(distinct user_id) as users from a group by day) c
                 on c.day = g.d),
    'by_bank', (select coalesce(jsonb_agg(jsonb_build_object(
                  'bank', bank, 'answered', n, 'correct', ok, 'students', users) order by n desc), '[]'::jsonb)
                from (select bank, sum(answered) as n, sum(correct) as ok, count(distinct user_id) as users
                      from a group by bank) x),
    'top_topics', (select coalesce(jsonb_agg(jsonb_build_object(
                     'bank', bank, 'topic', topic, 'answered', n, 'correct', ok, 'students', users) order by n desc), '[]'::jsonb)
                   from (select bank, topic, sum(answered) as n, sum(correct) as ok, count(distinct user_id) as users
                         from a group by bank, topic order by sum(answered) desc limit 15) t)
  ) into v_out
  from a;
  return v_out;
end;
$$;

-- ── the student list gains study totals ─────────────────────────────────
create or replace function public.admin_users()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with s as (
    select device_id, count(*) as quizzes, coalesce(sum(total), 0) as questions,
           round(avg(pct), 1) as avg_pct, max(pct) as best_pct, max(created_at) as last_quiz_at,
           mode() within group (order by subject) as top_subject
    from public.sessions group by device_id
  ),
  v as (
    select user_id, count(*) as visit_days, sum(hits) as visits, max(day) as last_visit_day
    from public.daily_visits group by user_id
  ),
  st as (
    select user_id, sum(answered) as study_answered, count(distinct day) as study_days, max(last_at) as last_study_at
    from public.study_activity group by user_id
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', p.id, 'username', p.username, 'email', p.email, 'semester', p.semester, 'created_at', p.created_at,
    'provider', a.raw_app_meta_data ->> 'provider', 'last_sign_in_at', a.last_sign_in_at,
    'confirmed', a.email_confirmed_at is not null,
    'quizzes', coalesce(s.quizzes, 0), 'questions', coalesce(s.questions, 0),
    'avg_pct', s.avg_pct, 'best_pct', s.best_pct, 'last_quiz_at', s.last_quiz_at, 'top_subject', s.top_subject,
    'visit_days', coalesce(v.visit_days, 0), 'visits', coalesce(v.visits, 0), 'last_visit_day', v.last_visit_day,
    'study_answered', coalesce(st.study_answered, 0), 'study_days', coalesce(st.study_days, 0),
    'last_study_at', st.last_study_at
  ) order by p.created_at desc), '[]'::jsonb)
  from public.profiles p
  left join auth.users a on a.id = p.id
  left join s on s.device_id = p.id::text
  left join v on v.user_id = p.id::text
  left join st on st.user_id = p.id::text;
$$;

revoke execute on function public.record_study(text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.record_study(text, text, text, jsonb) to service_role;
revoke execute on function public.admin_user_study(text, text) from public, anon, authenticated;
grant execute on function public.admin_user_study(text, text) to service_role;
revoke execute on function public.admin_study_overview(text) from public, anon, authenticated;
grant execute on function public.admin_study_overview(text) to service_role;
revoke execute on function public.admin_users() from public, anon, authenticated;
grant execute on function public.admin_users() to service_role;
