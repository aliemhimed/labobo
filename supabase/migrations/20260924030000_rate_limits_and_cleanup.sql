-- Per-user rate limiting for the Netlify Functions (see allowRequest in
-- netlify/functions/_lib/common.js). One row per allowed request; a user's
-- rows for an action are pruned as soon as they fall out of the window.
create table if not exists public.rate_limit_hits (
  id         bigint      generated always as identity primary key,
  user_id    text        not null,
  action     text        not null,
  created_at timestamptz not null default now()
);
create index if not exists rate_limit_hits_lookup
  on public.rate_limit_hits (user_id, action, created_at);
-- Only the service role (the functions) touches it; no policies on purpose.
alter table public.rate_limit_hits enable row level security;

-- Returns true and records a hit if the user is under `p_max` hits for
-- `p_action` in the last `p_window_seconds`; otherwise returns false.
create or replace function public.check_rate_limit(
  p_user text, p_action text, p_max int, p_window_seconds int
) returns boolean
language plpgsql
set search_path = ''
as $$
declare
  hits int;
begin
  -- Serialise concurrent calls for the same user/action so two requests
  -- can't both see "one below the cap".
  perform pg_advisory_xact_lock(hashtext(p_user || ':' || p_action));

  delete from public.rate_limit_hits
   where user_id = p_user and action = p_action
     and created_at < now() - make_interval(secs => p_window_seconds);

  select count(*) into hits from public.rate_limit_hits
   where user_id = p_user and action = p_action;
  if hits >= p_max then
    return false;
  end if;

  insert into public.rate_limit_hits (user_id, action) values (p_user, p_action);
  return true;
end;
$$;

-- Callable only by the functions: anyone else could fill another user's quota.
revoke execute on function public.check_rate_limit(text, text, int, int) from public, anon, authenticated;
grant execute on function public.check_rate_limit(text, text, int, int) to service_role;

-- Legacy device-name table, replaced by profiles; empty and unused.
drop table if exists public.users;

-- Advisor (auth_rls_initplan): evaluate auth.uid() once per query, not per row.
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select using ((select auth.uid()) = id);
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
