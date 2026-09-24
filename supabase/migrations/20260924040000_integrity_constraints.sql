-- (One leaderboard row per user/subject/week is already enforced by the
-- pre-existing unique index leaderboard_unique_device_week.)

-- Every question must be answerable. The Body Systems, Clinical and
-- Medicine & Art tables (and their Semester 2 copies) were created with
-- *_options_is_array and *_answer_in_range checks; GCT, GCT II, Chemistry and
-- Physics never had them. Add whichever are missing, same definitions and
-- naming, plus an option-count limit everywhere (2-6: the app labels A-F).
do $$
declare
  t text;
  rel regclass;
begin
  foreach t in array array[
    'gct_biochemistry', 'gct_genetics', 'gct_molecular_biology', 'gct_histology',
    'bs_anatomy', 'bs_physiology', 'bs_imaging',
    'medical_chemistry', 'medical_physics', 'clinical_skills', 'medicine_art',
    'gct2_biochemistry', 'gct2_genetics', 'gct2_molecular_biology', 'gct2_histology',
    'bs2_anatomy', 'bs2_physiology', 'bs2_imaging',
    'clinical_skills_2', 'medicine_art_2'
  ] loop
    rel := format('public.%I', t)::regclass;

    if not exists (select 1 from pg_constraint where conrelid = rel and contype = 'c' and conname like '%options_is_array') then
      execute format('alter table %s add constraint %I check (jsonb_typeof(options) = ''array'')',
                     rel, t || '_options_is_array');
    end if;

    if not exists (select 1 from pg_constraint where conrelid = rel and contype = 'c' and conname like '%answer_in_range') then
      execute format('alter table %s add constraint %I check (answer >= 0 and answer < jsonb_array_length(options))',
                     rel, t || '_answer_in_range');
    end if;

    if not exists (select 1 from pg_constraint where conrelid = rel and contype = 'c' and conname like '%options_count') then
      execute format('alter table %s add constraint %I check (case when jsonb_typeof(options) = ''array'' then jsonb_array_length(options) between 2 and 6 else false end)',
                     rel, t || '_options_count');
    end if;
  end loop;
end $$;
