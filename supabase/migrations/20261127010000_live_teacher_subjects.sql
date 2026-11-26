-- Labobo Live: which question banks each teacher may use.
-- `subjects` holds bank table names (e.g. 'gct_biochemistry'), ticked by an
-- admin in the Teachers tab. A teacher's quiz builder shows only these, and
-- netlify/functions/live.js refuses bank reads outside them.
alter table public.teachers add column subjects text[] not null default '{}';
