-- The free plan's daily set from the locked lectures: per student, subject,
-- mode and Tbilisi day, the questions drawn (netlify/functions/daily.js).
-- Only the service key uses it, so RLS is on with no policies or grants.
create table public.daily_sets (
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null check (char_length(subject) between 1 and 40),
  mode text not null check (mode in ('practice', 'exam')),
  day date not null,
  scope text not null check (scope in ('all', 'before', 'after', 'custom')),
  question_ids text[] not null check (cardinality(question_ids) between 1 and 30),
  created_at timestamptz not null default now(),
  primary key (user_id, subject, mode, day)
);

alter table public.daily_sets enable row level security;
revoke all on public.daily_sets from anon, authenticated;

comment on table public.daily_sets is
  'Free plan: one practice set and one exam (max 30 questions) per subject per Tbilisi day from the locked lectures. Written by the daily function with the service key.';
