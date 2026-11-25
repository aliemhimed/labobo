-- Crash reports from students' browsers, and web-push subscriptions for the
-- daily study reminder. Both are reached only by Netlify functions with the
-- service key: RLS on, no policies, no grants to anon / authenticated.

create table if not exists public.client_errors (
  id          bigint generated always as identity primary key,
  at          timestamptz not null default now(),
  user_id     text,
  kind        text not null default 'error',      -- error | rejection | render
  message     text not null,
  stack       text,
  url         text,
  user_agent  text,
  release     text,
  fingerprint text not null                        -- message + first stack line, for grouping
);
create index if not exists client_errors_at_idx on public.client_errors (at desc);
create index if not exists client_errors_fp_idx on public.client_errors (fingerprint, at desc);
alter table public.client_errors enable row level security;
revoke all on public.client_errors from anon, authenticated;

create table if not exists public.push_subscriptions (
  endpoint    text primary key,
  user_id     uuid not null,
  p256dh      text,
  auth        text,
  remind_hour smallint not null default 19 check (remind_hour between 0 and 23),
  tz          text not null default 'Asia/Tbilisi',
  created_at  timestamptz not null default now(),
  last_sent   date,
  failures    smallint not null default 0
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon, authenticated;
