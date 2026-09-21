-- Phase 1 lock-down. Every write and every read of user-linked data now goes
-- through the Netlify Functions, which use the service_role key (it bypasses
-- RLS). The publishable anon key therefore no longer needs any policy on these
-- tables, and holding it must not let anyone edit or read them directly.
--
-- DEPLOY ORDER: ship the functions first (they fall back to the anon key when
-- SUPA_SERVICE_KEY is unset, so the old and new code both work), confirm
-- SUPA_SERVICE_KEY is set in Netlify, then run this migration.

-- leaderboard_entries: drop every anon/public policy (several were duplicates;
-- "anon update" with qual=true let anyone rewrite any score).
drop policy if exists "lb_anon_insert" on public.leaderboard_entries;
drop policy if exists "anon insert"    on public.leaderboard_entries;
drop policy if exists "lb_anon_read"   on public.leaderboard_entries;
drop policy if exists "anon read"      on public.leaderboard_entries;
drop policy if exists "anon update"    on public.leaderboard_entries;
drop policy if exists "lb_anon_update" on public.leaderboard_entries;

-- users / sessions / question_reports: inserts now come from /api/supa-insert,
-- which validates and whitelists the columns before writing.
drop policy if exists "anon insert" on public.users;
drop policy if exists "anon insert" on public.sessions;
drop policy if exists "anon insert" on public.question_reports;

-- Length limits enforced by the database as well, not just the function.
alter table public.question_reports
  add constraint question_reports_note_len   check (note is null or char_length(note) <= 500) not valid,
  add constraint question_reports_text_len   check (question_text is null or char_length(question_text) <= 2000) not valid;
alter table public.leaderboard_entries
  add constraint leaderboard_score_range     check (score_pct between 0 and 100) not valid,
  add constraint leaderboard_handle_len      check (char_length(handle) between 3 and 20) not valid;

-- Advisor: mutable search_path on the announcements trigger function.
alter function public.touch_announcement_updated_at() set search_path = '';
