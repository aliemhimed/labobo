-- The devices that may use a pass or trial: one phone and one other device
-- (tablet or computer) per account (netlify/functions/_lib/devices.js).
-- Only the service key uses it, so RLS is on with no policies or grants.
create table public.user_devices (
  user_id uuid not null references auth.users(id) on delete cascade,
  slot text not null check (slot in ('phone', 'other')),
  device_id text not null check (char_length(device_id) = 36),
  label text check (char_length(label) <= 80),
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  -- When the student last moved this slot themselves (once per 30 days).
  switched_at timestamptz,
  primary key (user_id, slot)
);

alter table public.user_devices enable row level security;
revoke all on public.user_devices from anon, authenticated;

comment on table public.user_devices is
  'Pass and trial device slots: one phone and one tablet or computer per account. Written by the Netlify functions with the service key; admins can clear an account''s rows.';
