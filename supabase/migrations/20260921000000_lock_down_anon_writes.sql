-- Phase 1 lock-down. Every write and every read of user-linked data now goes
-- through the Netlify Functions, which use the service_role key (it bypasses
-- RLS). The publishable anon key therefore no longer needs any policy on these
-- tables, and holding it must not let anyone edit or read them directly.
--
-- Requires SUPA_SERVICE_KEY to be set wherever the functions run (Netlify
-- production has it; a local `netlify dev` needs it in .env), otherwise the
-- functions fall back to the anon key and these writes are rejected.

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
  add constraint question_reports_note_len   check (note is null or char_length(note) <= 500),
  add constraint question_reports_text_len   check (question_text is null or char_length(question_text) <= 2000);
alter table public.leaderboard_entries
  add constraint leaderboard_score_range     check (score_pct between 0 and 100),
  add constraint leaderboard_handle_len      check (char_length(handle) between 3 and 20);
