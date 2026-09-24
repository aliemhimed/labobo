-- Record which question a report is about. question_text alone is ambiguous:
-- e.g. 34 histology image questions share the text "What type of epithelium is
-- shown in this micrograph?". Stores the app's stable question id,
-- "<table>:<row id>" (see src/lib/questions.js). Nullable: older reports
-- predate it.
alter table public.question_reports
  add column if not exists question_id text,
  add constraint question_reports_question_id_format
    check (question_id is null or question_id ~ '^[a-z0-9_]+:[0-9]+$');

-- The one older report whose text matches exactly one question.
update public.question_reports set question_id = 'medical_physics:202'
where id = 30 and question_id is null and question_text = 'Sound waves in air are:';
