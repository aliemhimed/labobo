-- Admin dashboard, round two.
--   1. Counting moves into the database (admin_overview, admin_users,
--      admin_user_stats): the Netlify function used to download up to
--      5,000-20,000 rows and count them itself, silently capping totals.
--   2. Days follow a time zone: the dashboard passes the admin's zone and
--      charts bucket by local day; visits are recorded on the student's own
--      calendar day (record_visit(user, tz)).
--   3. Retention: returning vs new students, week-on-week retention, and
--      students who have gone quiet.
--   4. admin_log: a record of what admins did.
--   5. announcements: a banner shown to students.
-- Every function here is for the service role (the Netlify functions) only.

-- ── indexes the counting needs ──────────────────────────────────────────
create index if not exists sessions_created_at on public.sessions (created_at);
create index if not exists sessions_device_created on public.sessions (device_id, created_at desc);

-- ── visits on the student's own calendar day ────────────────────────────
-- The one-argument record_visit(text) stays for clients still on the old
-- build; it records the UTC day.
create or replace function public.record_visit(p_user text, p_tz text)
returns void
language sql
set search_path = ''
as $$
  insert into public.daily_visits (user_id, day)
  values (p_user, (now() at time zone p_tz)::date)
  on conflict (user_id, day)
  do update set hits = public.daily_visits.hits + 1, last_seen = now();
$$;

-- ── overview: students, quizzes, visits, retention ──────────────────────
-- "Active" = opened the app or finished a quiz that day. Retention weeks are
-- rolling 7-day windows ending today (week 0), the 7 days before (week 1)…
create or replace function public.admin_overview(p_tz text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_today date := (now() at time zone p_tz)::date;
  v_students jsonb;
  v_sessions jsonb;
  v_visits jsonb;
  v_retention jsonb;
begin
  select jsonb_build_object(
    'total', (select count(*) from public.profiles),
    'last_7d', (select count(*) from public.profiles where created_at >= now() - interval '7 days'),
    'no_semester', (select count(*) from public.profiles where semester is null),
    'by_semester', (select coalesce(jsonb_agg(jsonb_build_object('key', k, 'n', n) order by n desc), '[]'::jsonb)
                    from (select coalesce(semester, 'none') as k, count(*) as n from public.profiles group by 1) x),
    'signups_by_day', (select jsonb_agg(jsonb_build_object('day', g.d, 'n', coalesce(c.n, 0)) order by g.d)
                       from (select v_today - i as d from generate_series(0, 29) as i) g
                       left join (select (created_at at time zone p_tz)::date as d, count(*) as n
                                  from public.profiles where created_at >= now() - interval '31 days' group by 1) c
                         on c.d = g.d)
  ) into v_students;

  with s as (
    select device_id, subject, mode, pct, total, created_at, (created_at at time zone p_tz)::date as d
    from public.sessions where created_at >= now() - interval '30 days'
  )
  select jsonb_build_object(
    'last_24h', count(*) filter (where created_at >= now() - interval '1 day'),
    'last_7d', count(*) filter (where created_at >= now() - interval '7 days'),
    'last_30d', count(*),
    'active_users_24h', count(distinct device_id) filter (where created_at >= now() - interval '1 day'),
    'active_users_7d', count(distinct device_id) filter (where created_at >= now() - interval '7 days'),
    'avg_pct', round(avg(pct), 1),
    'questions_answered', coalesce(sum(total), 0),
    'all_time', (select count(*) from public.sessions),
    'by_day', (select jsonb_agg(jsonb_build_object('day', g.d, 'n', coalesce(c.n, 0), 'users', coalesce(c.users, 0)) order by g.d)
               from (select v_today - i as d from generate_series(0, 13) as i) g
               left join (select d, count(*) as n, count(distinct device_id) as users from s group by d) c on c.d = g.d),
    'by_mode', (select coalesce(jsonb_agg(jsonb_build_object('key', k, 'n', n) order by n desc), '[]'::jsonb)
                from (select coalesce(mode, 'unknown') as k, count(*) as n from s group by 1) x),
    'by_subject', (select coalesce(jsonb_agg(jsonb_build_object('subject', k, 'n', n, 'avg_pct', a) order by n desc), '[]'::jsonb)
                   from (select coalesce(subject, 'Unknown') as k, count(*) as n, round(avg(pct), 1) as a from s group by 1) x)
  ) into v_sessions
  from s;

  with v as (
    select user_id, day, hits from public.daily_visits where day between v_today - 29 and v_today
  )
  select jsonb_build_object(
    'today', count(*) filter (where day = v_today),
    'today_hits', coalesce(sum(hits) filter (where day = v_today), 0),
    'unique_7d', count(distinct user_id) filter (where day >= v_today - 6),
    'unique_30d', count(distinct user_id),
    'hits_30d', coalesce(sum(hits), 0),
    'all_time', (select count(*) from public.daily_visits),
    'by_day', (select jsonb_agg(jsonb_build_object('day', g.d, 'n', coalesce(c.n, 0), 'hits', coalesce(c.hits, 0)) order by g.d)
               from (select v_today - i as d from generate_series(0, 29) as i) g
               left join (select day, count(*) as n, sum(hits) as hits from v group by day) c on c.day = g.d)
  ) into v_visits
  from v;

  with act as (
    select user_id as uid, day as d from public.daily_visits
    union
    select s.device_id, (s.created_at at time zone p_tz)::date
    from public.sessions s join public.profiles p on p.id::text = s.device_id
  ),
  per_user as (
    select uid, min(d) as first_d, max(d) as last_d, count(*) as days from act group by uid
  ),
  weeks as (
    select w, v_today - 6 - 7 * w as wstart, v_today - 7 * w as wend from generate_series(0, 8) as w
  ),
  wa as (
    select wk.w, a.uid from weeks wk join act a on a.d between wk.wstart and wk.wend group by wk.w, a.uid
  )
  select jsonb_build_object(
    'active_7d', (select count(*) from wa where w = 0),
    'returning_7d', (select count(*) from per_user where last_d >= v_today - 6 and first_d < v_today - 6),
    'new_7d', (select count(*) from per_user where first_d >= v_today - 6),
    'prev_active', (select count(*) from wa where w = 1),
    'retained', (select count(*) from wa a join wa b on b.uid = a.uid and b.w = 1 where a.w = 0),
    'weekly', (select jsonb_agg(jsonb_build_object(
                 'start', wk.wstart, 'end', wk.wend,
                 'active', (select count(*) from wa where wa.w = wk.w),
                 'prev_active', (select count(*) from wa where wa.w = wk.w + 1),
                 'retained', (select count(*) from wa a join wa b on b.uid = a.uid and b.w = wk.w + 1 where a.w = wk.w)
               ) order by wk.w desc)
               from weeks wk where wk.w < 8),
    'quiet_count', (select count(*) from per_user where last_d between v_today - 29 and v_today - 7),
    'lapsed_count', (select count(*) from per_user where last_d < v_today - 29),
    'quiet', (select coalesce(jsonb_agg(q order by q.last_active desc), '[]'::jsonb) from (
                select pu.uid as id, p.username, p.email, p.semester, pu.last_d as last_active,
                       v_today - pu.last_d as days_away, pu.days as active_days,
                       (select count(*) from public.sessions s where s.device_id = pu.uid) as quizzes
                from per_user pu join public.profiles p on p.id::text = pu.uid
                where pu.last_d between v_today - 29 and v_today - 7
                order by pu.last_d desc
                limit 50) q)
  ) into v_retention;

  return jsonb_build_object(
    'today', v_today,
    'students', v_students,
    'sessions', v_sessions,
    'visits', v_visits,
    'retention', v_retention
  );
end;
$$;

-- ── every student with activity totals ──────────────────────────────────
-- Reads auth.users for the sign-in method and last sign-in (no 1,000-user
-- page limit, unlike the Auth admin API), hence security definer.
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
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', p.id, 'username', p.username, 'email', p.email, 'semester', p.semester, 'created_at', p.created_at,
    'provider', a.raw_app_meta_data ->> 'provider', 'last_sign_in_at', a.last_sign_in_at,
    'confirmed', a.email_confirmed_at is not null,
    'quizzes', coalesce(s.quizzes, 0), 'questions', coalesce(s.questions, 0),
    'avg_pct', s.avg_pct, 'best_pct', s.best_pct, 'last_quiz_at', s.last_quiz_at, 'top_subject', s.top_subject,
    'visit_days', coalesce(v.visit_days, 0), 'visits', coalesce(v.visits, 0), 'last_visit_day', v.last_visit_day
  ) order by p.created_at desc), '[]'::jsonb)
  from public.profiles p
  left join auth.users a on a.id = p.id
  left join s on s.device_id = p.id::text
  left join v on v.user_id = p.id::text;
$$;

-- ── one student's quiz and visit history ────────────────────────────────
create or replace function public.admin_user_stats(p_user text, p_tz text)
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
  with s as (
    select subject, mode, score, total, pct, created_at, (created_at at time zone p_tz)::date as d
    from public.sessions where device_id = p_user
  ),
  vis as (
    select day, hits from public.daily_visits where user_id = p_user
  ),
  act as (select d from s union select day from vis),
  isl as (select d, d - (row_number() over (order by d))::int as grp from act),
  anchor as (select max(d) as a from act where d >= v_today - 1)
  select jsonb_build_object(
    'totals', jsonb_build_object(
      'quizzes', (select count(*) from s),
      'questions', (select coalesce(sum(total), 0) from s),
      'avg_pct', (select round(avg(pct), 1) from s),
      'best_pct', (select max(pct) from s),
      'last_quiz_at', (select max(created_at) from s),
      'first_quiz_at', (select min(created_at) from s),
      'active_days', (select count(*) from act),
      'visit_days', (select count(*) from vis),
      'visits', (select coalesce(sum(hits), 0) from vis),
      -- consecutive active days ending today (or yesterday, if today isn't yet)
      'streak', (select count(*) from isl where grp = (select i.grp from isl i, anchor where i.d = anchor.a))
    ),
    'by_subject', (select coalesce(jsonb_agg(jsonb_build_object('key', k, 'n', n, 'avg_pct', a, 'best_pct', b, 'last', l) order by n desc), '[]'::jsonb)
                   from (select coalesce(subject, 'Unknown') as k, count(*) as n, round(avg(pct), 1) as a, max(pct) as b, max(created_at) as l
                         from s group by 1) x),
    'by_mode', (select coalesce(jsonb_agg(jsonb_build_object('key', k, 'n', n, 'avg_pct', a, 'best_pct', b, 'last', l) order by n desc), '[]'::jsonb)
                from (select coalesce(mode, 'unknown') as k, count(*) as n, round(avg(pct), 1) as a, max(pct) as b, max(created_at) as l
                      from s group by 1) x),
    'activity_by_day', (select jsonb_agg(jsonb_build_object('day', g.d, 'n', coalesce(c.n, 0)) order by g.d)
                        from (select v_today - i as d from generate_series(0, 29) as i) g
                        left join (select d, count(*) as n from s group by d) c on c.d = g.d),
    'visits_by_day', (select jsonb_agg(jsonb_build_object('day', g.d, 'n', coalesce(vis.hits, 0)) order by g.d)
                      from (select v_today - i as d from generate_series(0, 29) as i) g
                      left join vis on vis.day = g.d),
    'trend', (select coalesce(jsonb_agg(jsonb_build_object('pct', pct, 'at', created_at, 'subject', subject) order by created_at), '[]'::jsonb)
              from (select pct, created_at, subject from s where pct is not null order by created_at desc limit 30) t),
    'recent', (select coalesce(jsonb_agg(jsonb_build_object('subject', subject, 'mode', mode, 'score', score, 'total', total, 'pct', pct, 'created_at', created_at) order by created_at desc), '[]'::jsonb)
               from (select * from s order by created_at desc limit 20) r)
  ) into v_out;
  return v_out;
end;
$$;

revoke execute on function public.record_visit(text, text) from public, anon, authenticated;
grant execute on function public.record_visit(text, text) to service_role;
revoke execute on function public.admin_overview(text) from public, anon, authenticated;
grant execute on function public.admin_overview(text) to service_role;
revoke execute on function public.admin_users() from public, anon, authenticated;
grant execute on function public.admin_users() to service_role;
revoke execute on function public.admin_user_stats(text, text) from public, anon, authenticated;
grant execute on function public.admin_user_stats(text, text) to service_role;

-- ── what admins did ─────────────────────────────────────────────────────
create table if not exists public.admin_log (
  id          bigint      generated always as identity primary key,
  at          timestamptz not null default now(),
  admin_email text        not null,
  action      text        not null,
  target      text,
  details     jsonb       not null default '{}'::jsonb
);
create index if not exists admin_log_at on public.admin_log (at desc);
alter table public.admin_log enable row level security;

-- ── banner for students ─────────────────────────────────────────────────
-- Live while starts_at <= now() < ends_at (or no end). `semester` null =
-- everyone. Read through netlify/functions/announcements.js.
create table if not exists public.announcements (
  id         bigint      generated always as identity primary key,
  message    text        not null check (char_length(message) between 1 and 500),
  tone       text        not null default 'info' check (tone in ('info', 'warning', 'success')),
  semester   text        check (semester in ('1', '2')),
  starts_at  timestamptz not null default now(),
  ends_at    timestamptz,
  created_at timestamptz not null default now(),
  created_by text
);
create index if not exists announcements_created on public.announcements (created_at desc);
alter table public.announcements enable row level security;
