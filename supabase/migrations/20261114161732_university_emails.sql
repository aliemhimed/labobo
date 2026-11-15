-- A student's @eu.edu.ge address, proved with an emailed code
-- (netlify/functions/_lib/uniEmail.js), so accounts signed in with Gmail can
-- get the university trial. One account per verified address.
-- Only the service key uses it, so RLS is on with no policies or grants.
create table public.university_emails (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null check (email ~ '^[^@\s]+@eu\.edu\.ge$' and char_length(email) <= 120),
  verified_at timestamptz,
  code_hash text,
  code_expires_at timestamptz,
  attempts int not null default 0,
  sent_at timestamptz
);
create unique index university_emails_verified_email on public.university_emails (email) where verified_at is not null;
alter table public.university_emails enable row level security;
revoke all on public.university_emails from anon, authenticated;
comment on table public.university_emails is
  'A student''s @eu.edu.ge address, proved with an emailed code (netlify/functions/_lib/uniEmail.js), so accounts signed in with Gmail can get the trial. One account per verified address. Service key only.';
