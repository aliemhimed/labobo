-- Subscriptions, step 2 of 2: the lock. Applied on 13 November 2026, right
-- after the deploy that ships netlify/functions/access.js and the reworked
-- questions.js went live. It needs that code: the old /api/questions read
-- with the publishable key, so with it students with a pass would have been
-- shown the free lectures only.
--
-- Until now the publishable key could read every question. From the moment
-- subscriptions start it reads only the lectures listed in free_topics; the
-- rest is served by /api/questions with the service key, after it has checked
-- the caller's pass or trial (netlify/functions/_lib/access.js).
--
-- The start time is inside the policy, so applying this early changes
-- nothing until then. Keep it equal to LOCK_START in _lib/access.js:
-- 14 November 2026, 23:59 in Tbilisi (UTC+4).
do $$
declare
  t record;
  has_display boolean;
  eff text;
begin
  for t in
    select tablename from pg_policies
    where schemaname = 'public' and policyname = tablename || '_public_read' and tablename <> 'free_topics'
  loop
    select exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = t.tablename and column_name = 'display_topic'
    ) into has_display;
    -- The name students see, as stored in free_topics. Qualified with the
    -- bank's own name: free_topics has a `topic` column too, and a bare
    -- `topic` inside the subquery below would mean that one, which would
    -- make every row "free".
    eff := case when has_display
      then format('coalesce(nullif(%1$I.display_topic, ''''), %1$I.topic)', t.tablename)
      else format('%I.topic', t.tablename) end;

    execute format('drop policy %I on public.%I', t.tablename || '_public_read', t.tablename);
    execute format(
      'create policy %I on public.%I for select using (
         now() < timestamptz ''2026-11-14 19:59:00+00''
         or exists (select 1 from public.free_topics f where f.tb = %L and f.topic = %s)
       )', t.tablename || '_public_read', t.tablename, t.tablename, eff);
  end loop;
end $$;
