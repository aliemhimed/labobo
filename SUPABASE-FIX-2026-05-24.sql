-- =========================================================================
-- Labobo Supabase schema fix — 2026-05-24
-- Run this in the Supabase SQL Editor.
-- Adds the missing columns the live site is trying to write into.
-- Safe to run multiple times (uses IF NOT EXISTS).
-- =========================================================================

-- -----------------------------------------------------------
-- 1) sessions table — missing 'pct' column
-- -----------------------------------------------------------
-- The exam/practice result writer sends: device_id, subject, mode, score,
-- total, pct. PGRST204 said 'pct' was missing.
alter table public.sessions
  add column if not exists pct numeric;

-- Backfill pct for any prior rows where it's null but score/total exist
update public.sessions
   set pct = round((score::numeric / nullif(total, 0)) * 100, 2)
 where pct is null
   and score is not null
   and total is not null
   and total > 0;

-- -----------------------------------------------------------
-- 2) leaderboard_entries table — make sure it has every column
-- -----------------------------------------------------------
-- PGRST204 said 'time_seconds' was missing. Add it + any other column
-- that might be missing, so the Netlify Function's insert/patch works.
create table if not exists public.leaderboard_entries (
  id              bigserial primary key,
  device_id       text        not null,
  handle          text        not null,
  subject         text        not null,
  score_pct       numeric     not null,
  total_questions int         not null,
  time_seconds    int,
  week_start      date        not null,
  completed_at    timestamptz default now()
);

-- In case the table already existed without one of these columns:
alter table public.leaderboard_entries add column if not exists device_id       text;
alter table public.leaderboard_entries add column if not exists handle          text;
alter table public.leaderboard_entries add column if not exists subject         text;
alter table public.leaderboard_entries add column if not exists score_pct       numeric;
alter table public.leaderboard_entries add column if not exists total_questions int;
alter table public.leaderboard_entries add column if not exists time_seconds    int;
alter table public.leaderboard_entries add column if not exists week_start      date;
alter table public.leaderboard_entries add column if not exists completed_at    timestamptz default now();

-- Useful index for the weekly query
create index if not exists leaderboard_subject_week_idx
  on public.leaderboard_entries (subject, week_start, score_pct desc, time_seconds asc);

-- One entry per device per subject per week (so upsert works cleanly)
create unique index if not exists leaderboard_unique_device_week
  on public.leaderboard_entries (device_id, subject, week_start);

-- -----------------------------------------------------------
-- 3) RLS policies for leaderboard_entries
-- -----------------------------------------------------------
alter table public.leaderboard_entries enable row level security;

drop policy if exists "lb_anon_read"   on public.leaderboard_entries;
drop policy if exists "lb_anon_insert" on public.leaderboard_entries;
drop policy if exists "lb_anon_update" on public.leaderboard_entries;

create policy "lb_anon_read"
  on public.leaderboard_entries
  for select
  to anon
  using (true);

create policy "lb_anon_insert"
  on public.leaderboard_entries
  for insert
  to anon
  with check (true);

create policy "lb_anon_update"
  on public.leaderboard_entries
  for update
  to anon
  using (true)
  with check (true);

-- -----------------------------------------------------------
-- 4) Force PostgREST to reload the schema cache (this is what
--    PGRST204 errors are really complaining about — the API
--    cached an older schema).
-- -----------------------------------------------------------
notify pgrst, 'reload schema';
