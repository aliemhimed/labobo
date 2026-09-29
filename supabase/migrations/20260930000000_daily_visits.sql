-- One row per user per UTC day, counting how many times they opened the app
-- (see netlify/functions/visit.js). Feeds the admin dashboard's daily-visits
-- chart and per-student insights.
create table if not exists public.daily_visits (
  user_id    text        not null,
  day        date        not null,
  hits       int         not null default 1,
  first_seen timestamptz not null default now(),
  last_seen  timestamptz not null default now(),
  primary key (user_id, day)
);
create index if not exists daily_visits_day on public.daily_visits (day);

-- Only the service role (the functions) touches it; no policies on purpose.
alter table public.daily_visits enable row level security;

create or replace function public.record_visit(p_user text)
returns void
language sql
set search_path = ''
as $$
  insert into public.daily_visits (user_id, day)
  values (p_user, (now() at time zone 'utc')::date)
  on conflict (user_id, day)
  do update set hits = public.daily_visits.hits + 1, last_seen = now();
$$;

revoke execute on function public.record_visit(text) from public, anon, authenticated;
grant execute on function public.record_visit(text) to service_role;
