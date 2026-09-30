-- 1. Progress synced to the account (see netlify/functions/progress.js and
--    src/lib/progressSync.js). One row per user per subject, holding what the
--    app keeps in localStorage for that subject: finished-quiz history, wrong
--    answers (+ when each was cleared) and the flashcard schedule. `version`
--    goes up by one on every save; a save must name the version it was based
--    on, so two devices can't silently overwrite each other.
create table if not exists public.user_progress (
  user_id    text        not null,
  prefix     text        not null check (prefix ~ '^[a-z0-9_]{1,20}$'),
  data       jsonb       not null default '{}'::jsonb,
  version    int         not null default 1,
  updated_at timestamptz not null default now(),
  primary key (user_id, prefix)
);
-- Only the service role (the functions) touches it; no policies on purpose.
alter table public.user_progress enable row level security;

-- 2. How often each answer option is picked, per question, across every
--    finished practice set and exam (see netlify/functions/answers.js).
--    `picks` maps the original option index (or "blank") to a count, so the
--    share answering correctly is worked out against the *current* answer
--    key, and fixing a key re-scores the history at once.
create table if not exists public.question_stats (
  question_id text        primary key check (question_id ~ '^[a-z0-9_]+:[0-9]+$'),
  attempts    int         not null default 0,
  picks       jsonb       not null default '{}'::jsonb,
  last_at     timestamptz not null default now()
);
create index if not exists question_stats_attempts on public.question_stats (attempts desc);
alter table public.question_stats enable row level security;

-- {"0":2,"blank":1} + {"0":1,"2":4} = {"0":3,"2":4,"blank":1}
create or replace function public.jsonb_add_counts(a jsonb, b jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    jsonb_object_agg(k, coalesce((a ->> k)::int, 0) + coalesce((b ->> k)::int, 0)),
    '{}'::jsonb)
  from (
    select jsonb_object_keys(coalesce(a, '{}'::jsonb))
    union
    select jsonb_object_keys(coalesce(b, '{}'::jsonb))
  ) as keys(k);
$$;

-- p_items: [{"id": "<table>:<row id>", "pick": "2" | "blank"}, ...]
-- The batch is folded per question first: ON CONFLICT can't touch the same
-- row twice in one statement.
create or replace function public.record_answers(p_items jsonb)
returns void
language sql
set search_path = ''
as $$
  with items as (
    select x ->> 'id' as question_id,
           case when x ->> 'pick' ~ '^[0-5]$' then x ->> 'pick' else 'blank' end as pick
    from jsonb_array_elements(p_items) as x
    where x ->> 'id' ~ '^[a-z0-9_]+:[0-9]+$'
  ),
  per_pick as (
    select question_id, pick, count(*)::int as n from items group by question_id, pick
  ),
  per_question as (
    select question_id, sum(n)::int as attempts, jsonb_object_agg(pick, n) as picks
    from per_pick group by question_id
  )
  insert into public.question_stats as s (question_id, attempts, picks, last_at)
  select question_id, attempts, picks, now() from per_question
  on conflict (question_id) do update
    set attempts = s.attempts + excluded.attempts,
        picks    = public.jsonb_add_counts(s.picks, excluded.picks),
        last_at  = now();
$$;

revoke execute on function public.jsonb_add_counts(jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.jsonb_add_counts(jsonb, jsonb) to service_role;
revoke execute on function public.record_answers(jsonb) from public, anon, authenticated;
grant execute on function public.record_answers(jsonb) to service_role;

-- 3. Reports are marked resolved instead of deleted, so there's a record of
--    what was dealt with (and a report can be reopened).
alter table public.question_reports
  add column if not exists resolved_at timestamptz,
  add column if not exists resolved_by text;
create index if not exists question_reports_open
  on public.question_reports (created_at desc) where resolved_at is null;
