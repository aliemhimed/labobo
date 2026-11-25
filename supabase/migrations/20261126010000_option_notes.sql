-- Why each wrong option is wrong: { "<option index>": "note" }, keyed by the
-- option's index in `options` (the stored order, before the quiz shuffles
-- them). Empty until notes are written. Every question bank gets the column
-- so the loaders can select the same columns from all of them; the existing
-- table grants and timed-lock policies already cover it.
do $$
declare t text;
begin
  foreach t in array array[
    'gct_biochemistry','gct_genetics','gct_histology','gct_molecular_biology',
    'gct2_biochemistry','gct2_genetics','gct2_histology','gct2_molecular_biology',
    'gct3_biochemistry','gct3_biophysics','gct3_immunology',
    'gct4_immunology','gct4_microbiology',
    'bs_anatomy','bs_imaging','bs_physiology',
    'bs2_anatomy','bs2_imaging','bs2_physiology',
    'bs4_anatomy','bs4_imaging','bs4_physiology',
    'medicine_art','history_of_medicine','medical_chemistry','medical_physics','scientific_reasoning',
    'clinical_skills','clinical_skills_2'
  ] loop
    execute format('alter table public.%I add column if not exists option_notes jsonb not null default %L::jsonb', t, '{}');
  end loop;
end $$;
