-- Announcements feature removed: drop the table (and its trigger with it) and
-- the trigger function.
drop table if exists public.announcements;
drop function if exists public.touch_announcement_updated_at();
