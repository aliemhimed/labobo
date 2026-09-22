-- handle_new_user is a trigger function only (fires on auth.users insert via
-- on_auth_user_created); it must never be callable directly through
-- PostgREST's /rest/v1/rpc/handle_new_user by anon/authenticated. Revoking
-- EXECUTE does not affect trigger firing (Supabase Auth's own signup flow
-- inserts into auth.users with elevated privileges, not through these roles).
-- Flagged by Supabase's security advisor after this function was added.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
