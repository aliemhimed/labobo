-- Semester 4: GCT IV (Immunology, Microbiology) and Body Systems IV
-- (Anatomy, Physiology, Medical Imaging). Same shape as the Semester 2
-- banks they copy: bigint identity id, ord, topic, q, options, answer,
-- explanation/image/images defaulted, the options/answer/count checks, and
-- public read-only RLS. Past-paper questions live in the GCT IV tables
-- under their own "… — Past Papers" topic, so they show up as a filter.

create table public.gct4_immunology   (like public.gct2_biochemistry including all);
create table public.gct4_microbiology (like public.gct2_biochemistry including all);

create table public.bs4_anatomy    (like public.bs2_anatomy including all);
create table public.bs4_physiology (like public.bs2_physiology including all);
create table public.bs4_imaging    (like public.bs2_imaging including all);

do $$
declare
  t text;
begin
  foreach t in array array[
    'gct4_immunology', 'gct4_microbiology',
    'bs4_anatomy', 'bs4_physiology', 'bs4_imaging'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy %I on public.%I for select using (true)',
      t || '_public_read', t
    );
  end loop;
end $$;

-- Announcements can now target Semester 4 as well.
alter table public.announcements drop constraint announcements_semester_check;
alter table public.announcements add constraint announcements_semester_check
  check (semester in ('1', '2', '4'));
