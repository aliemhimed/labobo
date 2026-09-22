-- Phase: mandatory Supabase Auth + Semester 1/2 curriculum split.
--
-- 1. `profiles` is rebuilt (it was empty, 0 rows, unreferenced by any FK)
--    into the standard Supabase "one row per auth user" shape, with a
--    `semester` column and an auto-provisioning trigger.
-- 2. Nine new, empty tables for the four Semester 2 subjects, mirroring the
--    exact per-subject table layout their Semester 1 counterparts use.

-- ── profiles ──────────────────────────────────────────────────────────────
drop table if exists public.profiles;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text,
  email text,
  semester text,                          -- '1' | '2' | null (not chosen yet)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
-- No insert/delete policy: rows are created only by the trigger below
-- (security definer), never directly by a client.

create or replace function public.touch_profile_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql set search_path = '';

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_profile_updated_at();

-- Auto-create a profile row the moment someone signs up (Google or email),
-- so the app never has to handle "authenticated but no profile yet".
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', new.email),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = '';

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Back-fill profiles for the 2 accounts that already exist.
insert into public.profiles (id, username, email)
select id,
       coalesce(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', email),
       email
from auth.users
on conflict (id) do nothing;

-- ── Semester 2 question banks (empty; content added later) ─────────────────
-- Same shape as their Semester 1 counterparts: bigint identity id, ord,
-- topic, q, options, answer, explanation/image/images defaulted, public
-- read-only RLS. clinical_skills_2 also carries display_topic like
-- clinical_skills does.

create table public.gct2_biochemistry (like public.gct_biochemistry including all);
create table public.gct2_genetics (like public.gct_genetics including all);
create table public.gct2_molecular_biology (like public.gct_molecular_biology including all);
create table public.gct2_histology (like public.gct_histology including all);

create table public.bs2_anatomy (like public.bs_anatomy including all);
create table public.bs2_physiology (like public.bs_physiology including all);
create table public.bs2_imaging (like public.bs_imaging including all);

create table public.clinical_skills_2 (like public.clinical_skills including all);
create table public.medicine_art_2 (like public.medicine_art including all);

do $$
declare
  t text;
begin
  foreach t in array array[
    'gct2_biochemistry', 'gct2_genetics', 'gct2_molecular_biology', 'gct2_histology',
    'bs2_anatomy', 'bs2_physiology', 'bs2_imaging',
    'clinical_skills_2', 'medicine_art_2'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy %I on public.%I for select using (true)',
      t || '_public_read', t
    );
  end loop;
end $$;
