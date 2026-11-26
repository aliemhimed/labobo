-- Labobo Live: a student's results also name the bank question behind each
-- answer (only when the teacher allows review), so the phone can put the
-- Live answers into the student's spaced review (src/lib/liveReview.js).
create or replace function public.live_results(p_room uuid, p_user uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.live_rooms; v_host boolean; p public.live_players; v_review boolean;
begin
  select * into r from public.live_rooms where id = p_room;
  if r.id is null then return null; end if;
  v_host := (r.host = p_user);
  if v_host then
    return jsonb_build_object(
      'room', jsonb_build_object('id', r.id, 'title', r.title, 'code', r.code, 'stage', r.stage, 'created_at', r.created_at,
                                 'finished_at', r.finished_at, 'total', r.total_q, 'settings', r.settings),
      'players', (select coalesce(jsonb_agg(jsonb_build_object(
          'rank', x.rank, 'name', pl.display_name, 'email', pl.email, 'nickname', pl.nickname,
          'score', pl.score, 'correct', pl.correct, 'away', pl.away_count, 'total_ms', pl.total_ms) order by x.rank), '[]'::jsonb)
        from jsonb_to_recordset(public.live_ranking(p_room)) as x(rank int, user_id uuid)
        join public.live_players pl on pl.room_id = p_room and pl.user_id = x.user_id),
      'questions', (select coalesce(jsonb_agg(jsonb_build_object(
          'position', q.position, 'q', q.q, 'options', q.options, 'answer', q.answer,
          'answered', (select count(*) from public.live_answers a where a.room_id = p_room and a.position = q.position),
          'correct', (select count(*) from public.live_answers a where a.room_id = p_room and a.position = q.position and a.correct),
          'counts', public.live_counts(p_room, q.position)->'by_option') order by q.position), '[]'::jsonb)
        -- Only questions already asked (all of them once the room has finished).
        from public.live_room_questions q
        where q.room_id = p_room and q.position <= case when r.stage = 'finished' then r.total_q - 1 else r.current_q end),
      'average', (select round(avg(score)) from public.live_players where room_id = p_room and not kicked));
  end if;
  select * into p from public.live_players where room_id = p_room and user_id = p_user;
  if p.room_id is null or r.stage <> 'finished' then return null; end if;
  v_review := coalesce((r.settings->>'review')::boolean, true);
  return jsonb_build_object(
    'room', jsonb_build_object('id', r.id, 'title', r.title, 'created_at', r.created_at, 'total', r.total_q),
    'me', jsonb_build_object('score', p.score, 'correct', p.correct,
      'rank', (select x.rank from jsonb_to_recordset(public.live_ranking(p_room)) as x(rank int, user_id uuid) where x.user_id = p_user),
      'players', public.live_active_count(p_room)),
    'board', public.live_public_board(p_room),
    'review', v_review,
    'answers', (select coalesce(jsonb_agg(jsonb_build_object(
        'position', q.position,
        'q', case when v_review then q.q end, 'options', case when v_review then q.options end,
        'answer', case when v_review then q.answer end, 'explanation', case when v_review then q.explanation end,
        'choice', a.choice, 'correct', coalesce(a.correct, false), 'points', coalesce(a.points, 0),
        -- The bank question it came from, so the phone can add it to spaced review.
        'source_table', case when v_review then q.source_table end, 'source_id', case when v_review then q.source_id end) order by q.position), '[]'::jsonb)
      from public.live_room_questions q
      left join public.live_answers a on a.room_id = q.room_id and a.position = q.position and a.user_id = p_user
      where q.room_id = p_room));
end $$;

