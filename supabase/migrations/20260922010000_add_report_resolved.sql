-- Phase 6: let admins mark a question report as resolved instead of only
-- deleting it, so a fixed report's history isn't lost and the "needs
-- attention" count on the dashboard stays accurate.

alter table public.question_reports
  add column if not exists resolved boolean not null default false;

create index if not exists idx_question_reports_resolved
  on public.question_reports (resolved, created_at desc);
