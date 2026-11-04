-- History of Medicine: one question bank shared by Semester 1 and Semester 2
-- (the app lists the same subject in both). Same shape as the other
-- single-table banks: bigint identity id, ord, topic, q, options, answer,
-- explanation/image/images defaulted, the options/answer checks, and public
-- read-only RLS.

create table public.history_of_medicine (like public.medical_physics including all);

alter table public.history_of_medicine enable row level security;
create policy history_of_medicine_public_read on public.history_of_medicine for select using (true);
