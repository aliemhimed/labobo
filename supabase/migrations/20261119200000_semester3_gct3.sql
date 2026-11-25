-- Semester 3: GCT III (Biochemistry, Immunology, Biophysics). Same shape as
-- the GCT II banks: bigint identity id, ord, topic, q, options, answer,
-- explanation/image/images, the options/answer/count checks. Read access
-- follows the timed lock used by the other banks: open before the lock
-- date, afterwards only lectures listed in free_topics (or a pass, served
-- by the questions function with the service key). Past papers live in the
-- same tables under "<Subject> — Past Papers" topics.

create table public.gct3_biochemistry (like public.gct2_biochemistry including all);
create table public.gct3_immunology   (like public.gct2_biochemistry including all);
create table public.gct3_biophysics   (like public.gct2_biochemistry including all);

do $$
declare
  t text;
begin
  foreach t in array array['gct3_biochemistry', 'gct3_immunology', 'gct3_biophysics']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy %I on public.%I for select using ('
      || '(now() < ''2026-11-14 19:59:00+00''::timestamptz) or exists ('
      || 'select 1 from public.free_topics f where f.tb = %L and f.topic = %I.topic))',
      t || '_public_read', t, t, t
    );
    execute format('grant select on public.%I to anon, authenticated', t);
  end loop;
end $$;

-- Announcements can now target Semester 3 as well.
alter table public.announcements drop constraint announcements_semester_check;
alter table public.announcements add constraint announcements_semester_check
  check (semester in ('1', '2', '3', '4'));
