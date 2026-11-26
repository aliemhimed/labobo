-- Labobo Live: room lists say each room's mode, so case rooms (teacher-marked)
-- link back to their own screen instead of the quiz results page.

create or replace function public.live_history(p_user uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'room', r.id, 'title', r.title, 'date', r.created_at, 'total', r.total_q,
    'mode', coalesce(r.settings->>'mode', 'individual'), 'released', r.marks_released,
    'score', p.score, 'correct', p.correct,
    'rank', (select x.rank from jsonb_to_recordset(public.live_ranking(r.id)) as x(rank int, user_id uuid) where x.user_id = p_user),
    'players', public.live_active_count(r.id)) order by r.created_at desc), '[]'::jsonb)
  from public.live_players p join public.live_rooms r on r.id = p.room_id
  where p.user_id = p_user and not p.kicked and r.stage = 'finished';
$$;

create or replace function public.live_hosted(p_host uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'room', r.id, 'title', r.title, 'code', r.code, 'stage', r.stage, 'date', r.created_at, 'total', r.total_q,
    'mode', coalesce(r.settings->>'mode', 'individual'), 'released', r.marks_released,
    'players', public.live_active_count(r.id),
    'average', (select round(avg(score)) from public.live_players where room_id = r.id and not kicked))
    order by r.created_at desc), '[]'::jsonb)
  from public.live_rooms r where r.host = p_host;
$$;

revoke all on function public.live_history(uuid), public.live_hosted(uuid) from public, anon, authenticated;
grant execute on function public.live_history(uuid), public.live_hosted(uuid) to service_role;
