-- Security audit, 12 Nov 2026. The publishable (anon) key is public, so what
-- it may do has to be decided here and not left to defaults.

-- 1. This backup table was created without row level security, so anyone
--    holding the publishable key could read, change or delete its rows.
alter table public.semester4_length_fix_backup enable row level security;

-- 2. Until now every table granted ALL to anon and authenticated and relied
--    on RLS alone. Take everything away, then give back only what the app
--    uses from the browser. All other access goes through the Netlify
--    Functions with the service key, which is unaffected.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

--    Question banks: public read (the tables that carry a *_public_read policy).
do $$
declare t record;
begin
  for t in
    select tablename from pg_policies
    where schemaname = 'public' and cmd = 'SELECT' and qual = 'true'
      and policyname = tablename || '_public_read'
  loop
    execute format('grant select on public.%I to anon, authenticated', t.tablename);
  end loop;
end $$;

-- 3. profiles: a student may read their own row (RLS) and change only their
--    semester. username, email and created_at are set by the signup trigger
--    and were editable before, which let a student bypass the name filter or
--    copy an admin's email into their profile.
grant select on public.profiles to authenticated;
grant update (semester) on public.profiles to authenticated;

-- 4. New objects start closed: a table, sequence or function created later
--    is not reachable with the publishable key unless a migration grants it.
--    A new question bank therefore needs, next to its *_public_read policy:
--      grant select on public.<table> to anon, authenticated;
--    (A future function that anon/authenticated must call, e.g. from an RLS
--    policy, needs an explicit GRANT EXECUTE.)
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public revoke execute on functions from anon, authenticated;
alter default privileges for role postgres revoke execute on functions from public;

-- 5. Leftover bulk loader: SECURITY DEFINER, callable by anyone, guarded only
--    by a token stored in its body.
drop function if exists public.tmp_load_questions(text, text, jsonb);
