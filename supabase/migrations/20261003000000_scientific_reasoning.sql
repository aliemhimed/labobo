-- Scientific Reasoning: one question bank shared by Semester 1 and Semester 2
-- (the app lists the same subject in both). Same shape as the other
-- single-table banks: bigint identity id, ord, topic, q, options, answer,
-- explanation/image/images defaulted, the options/answer checks, and public
-- read-only RLS.

create table public.scientific_reasoning (like public.medical_physics including all);

alter table public.scientific_reasoning enable row level security;
create policy scientific_reasoning_public_read on public.scientific_reasoning for select using (true);
