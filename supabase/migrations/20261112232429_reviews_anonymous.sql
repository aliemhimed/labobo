-- A student may post their review without their name. The row still belongs
-- to their account (one review each, and admins see who wrote it); only the
-- name shown publicly changes to "A student".
alter table public.reviews add column anonymous boolean not null default false;
