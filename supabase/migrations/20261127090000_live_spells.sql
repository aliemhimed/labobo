-- Labobo Live: Power-ups (spells) in friends' rooms.
--
-- Only rooms with settings.kind = 'student' and settings.spells = true, in
-- individual mode (team spells come later). Rules (see the architecture doc):
--   * 3 correct answers in a row deal 3 cards; the player keeps ONE (held).
--     A streak of 5+ deals rarer cards, and the player in last place gets
--     one rarer card more.
--   * Spells are cast BETWEEN questions (reveal / leaderboard) and act on the
--     NEXT question. One attack per target per question. Antidote blocks the
--     next attack. Point steal acts at once.
--   * Visual spells (cataract, scotoma, aphasia) are drawn by the target's
--     phone; rule spells (paralysis, tachycardia, double_or_nothing,
--     second_opinion) are enforced here.

alter table public.live_players add column streak integer not null default 0;
alter table public.live_players add column cards jsonb;            -- offered cards, e.g. ["cataract","antidote","paralysis"]
alter table public.live_players add column held text;              -- the one spell kept
alter table public.live_players add column shield boolean not null default false;

create table public.live_effects (
  room_id uuid not null references public.live_rooms(id) on delete cascade,
  position integer not null,          -- the question it acts on
  target uuid not null,
  kind text not null check (kind in ('attack', 'self')),
  spell text not null,
  by uuid not null,
  at timestamptz not null default now(),
  primary key (room_id, position, target, kind)
);
alter table public.live_effects enable row level security;
revoke all on public.live_effects from anon, authenticated;

create or replace function public.live_spells_on(p_settings jsonb)
returns boolean language sql immutable as $$
  select coalesce(p_settings->>'kind', '') = 'student' and coalesce((p_settings->>'spells')::boolean, false)
     and coalesce(p_settings->>'mode', 'individual') = 'individual'
$$;

-- What a spell does: 'attack' (needs a target, acts next question), 'instant'
-- (needs a target, acts now), 'self' (acts on you next question), 'shield'.
create or replace function public.live_spell_kind(p_spell text)
returns text language sql immutable as $$
  select case
    when p_spell in ('cataract', 'scotoma', 'aphasia', 'paralysis', 'tachycardia') then 'attack'
    when p_spell = 'point_steal' then 'instant'
    when p_spell in ('second_opinion', 'double_or_nothing') then 'self'
    when p_spell = 'antidote' then 'shield'
  end
$$;

-- Has this player got this effect on this question?
create or replace function public.live_has_effect(p_room uuid, p_position integer, p_user uuid, p_spell text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.live_effects
                  where room_id = p_room and position = p_position and target = p_user and spell = p_spell)
$$;

-- Deal 3 different cards.
create or replace function public.live_deal(p_room uuid, p_user uuid, p_streak integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_common text[] := array['cataract', 'scotoma', 'aphasia', 'second_opinion', 'antidote'];
        v_rare text[] := array['paralysis', 'tachycardia', 'point_steal', 'double_or_nothing'];
        v_rares integer; v_last boolean; v_cards jsonb;
begin
  select (select max(x.rank) from jsonb_to_recordset(public.live_ranking(p_room)) as x(rank int, user_id uuid))
       = (select x.rank from jsonb_to_recordset(public.live_ranking(p_room)) as x(rank int, user_id uuid) where x.user_id = p_user)
    into v_last;
  v_rares := least(3, (case when p_streak >= 5 then 2 when random() < 0.25 then 1 else 0 end) + (case when coalesce(v_last, false) then 1 else 0 end));
  select coalesce(jsonb_agg(s), '[]'::jsonb) into v_cards from (
    (select s from unnest(v_rare) s order by random() limit v_rares)
    union all
    (select s from unnest(v_common) s order by random() limit 3 - v_rares)
  ) x;
  return v_cards;
end $$;

-- After each answer: keep the streak, and deal cards every 3 in a row.
create or replace function public.live_spell_after_answer(p_room uuid, p_user uuid, p_correct boolean)
returns void language plpgsql security definer set search_path = public as $$
declare p public.live_players;
begin
  update public.live_players set streak = case when p_correct then streak + 1 else 0 end
   where room_id = p_room and user_id = p_user returning * into p;
  if p_correct and p.streak > 0 and p.streak % 3 = 0 and p.cards is null and p.held is null then
    update public.live_players set cards = public.live_deal(p_room, p_user, p.streak)
     where room_id = p_room and user_id = p_user;
  end if;
end $$;

-- Keep one of the offered cards.
create or replace function public.live_pick_spell(p_room uuid, p_user uuid, p_index integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare p public.live_players;
begin
  select * into p from public.live_players where room_id = p_room and user_id = p_user and not kicked;
  if p.room_id is null then return jsonb_build_object('status', 'not_in_room'); end if;
  if p.cards is null or p_index < 0 or p_index >= jsonb_array_length(p.cards) then return jsonb_build_object('status', 'no_cards'); end if;
  if p.held is not null then return jsonb_build_object('status', 'already_holding'); end if;
  update public.live_players set held = p.cards->>p_index, cards = null where room_id = p_room and user_id = p_user;
  return jsonb_build_object('status', 'ok', 'held', p.cards->>p_index);
end $$;

-- Cast the held spell, between questions. Acts on the next question
-- (point steal at once). p_target for attack and instant spells.
create or replace function public.live_cast(p_room uuid, p_user uuid, p_target uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.live_rooms; p public.live_players; t public.live_players; v_kind text; v_pos integer; v_rows integer; v_amt integer;
begin
  select * into r from public.live_rooms where id = p_room;
  select * into p from public.live_players where room_id = p_room and user_id = p_user and not kicked;
  if r.id is null or p.room_id is null or not public.live_spells_on(r.settings) then return jsonb_build_object('status', 'not_allowed'); end if;
  if p.held is null then return jsonb_build_object('status', 'nothing_held'); end if;
  if r.stage not in ('reveal', 'leaderboard') then return jsonb_build_object('status', 'not_now'); end if;
  v_pos := r.current_q + 1;
  if v_pos >= r.total_q then return jsonb_build_object('status', 'no_more_questions'); end if;
  v_kind := public.live_spell_kind(p.held);

  if v_kind = 'shield' then
    update public.live_players set shield = true, held = null where room_id = p_room and user_id = p_user;
    perform public.live_emit('live:' || p_room, 'spell', jsonb_build_object('spell', p.held, 'by', public.live_shown_name(r.settings, p.nickname, p.display_name)));
    return jsonb_build_object('status', 'ok');
  end if;

  if v_kind = 'self' then
    insert into public.live_effects (room_id, position, target, kind, spell, by) values (p_room, v_pos, p_user, 'self', p.held, p_user)
    on conflict do nothing;
    get diagnostics v_rows = row_count;
    if v_rows = 0 then return jsonb_build_object('status', 'already'); end if;
    update public.live_players set held = null where room_id = p_room and user_id = p_user;
    return jsonb_build_object('status', 'ok');
  end if;

  -- attack / instant: a target who is another player still in the room
  select * into t from public.live_players where room_id = p_room and user_id = p_target and not kicked;
  if t.room_id is null or p_target = p_user then return jsonb_build_object('status', 'bad_target'); end if;
  if t.shield then
    update public.live_players set shield = false where room_id = p_room and user_id = p_target;
    update public.live_players set held = null where room_id = p_room and user_id = p_user;
    perform public.live_emit('live:' || p_room, 'spell', jsonb_build_object('spell', p.held, 'blocked', true,
      'by', public.live_shown_name(r.settings, p.nickname, p.display_name), 'target', public.live_shown_name(r.settings, t.nickname, t.display_name)));
    return jsonb_build_object('status', 'blocked');
  end if;
  if v_kind = 'instant' then
    v_amt := least(30, t.score);
    update public.live_players set score = score - v_amt where room_id = p_room and user_id = p_target;
    update public.live_players set score = score + v_amt, held = null where room_id = p_room and user_id = p_user;
  else
    insert into public.live_effects (room_id, position, target, kind, spell, by) values (p_room, v_pos, p_target, 'attack', p.held, p_user)
    on conflict do nothing;
    get diagnostics v_rows = row_count;
    if v_rows = 0 then return jsonb_build_object('status', 'target_busy'); end if;
    update public.live_players set held = null where room_id = p_room and user_id = p_user;
  end if;
  perform public.live_emit('live:' || p_room, 'spell', jsonb_build_object('spell', p.held,
    'by', public.live_shown_name(r.settings, p.nickname, p.display_name), 'target', public.live_shown_name(r.settings, t.nickname, t.display_name),
    'amount', v_amt));
  return jsonb_build_object('status', 'ok');
end $$;

-- A player's power-ups and what is acting on them now.
create or replace function public.live_spell_view(p_room uuid, p_user uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare r public.live_rooms; p public.live_players; q public.live_room_questions; v_hide jsonb := '[]'::jsonb;
begin
  select * into r from public.live_rooms where id = p_room;
  select * into p from public.live_players where room_id = p_room and user_id = p_user;
  if r.current_q >= 0 and public.live_has_effect(p_room, r.current_q, p_user, 'second_opinion') then
    select * into q from public.live_room_questions where room_id = p_room and position = r.current_q;
    -- Two wrong options removed (one when there are only three options).
    select coalesce(jsonb_agg(i), '[]'::jsonb) into v_hide from (
      select i from generate_series(0, jsonb_array_length(q.options) - 1) i
       where i <> q.answer order by md5(p_room::text || r.current_q || p_user::text || i)
       limit greatest(0, least(2, jsonb_array_length(q.options) - 2))) x;
  end if;
  return jsonb_build_object(
    'streak', p.streak, 'cards', p.cards, 'held', p.held, 'shield', p.shield,
    'held_kind', public.live_spell_kind(p.held),
    'effects', (select coalesce(jsonb_agg(jsonb_build_object('spell', e.spell, 'kind', e.kind,
                  'by', (select public.live_shown_name(r.settings, x.nickname, x.display_name) from public.live_players x where x.room_id = p_room and x.user_id = e.by))), '[]'::jsonb)
                from public.live_effects e where e.room_id = p_room and e.position = r.current_q and e.target = p_user),
    'hide', v_hide,
    'targets', case when public.live_spell_kind(p.held) in ('attack', 'instant') then
      (select coalesce(jsonb_agg(jsonb_build_object('user_id', x.user_id, 'shown', public.live_shown_name(r.settings, x.nickname, x.display_name), 'score', x.score,
         'busy', exists (select 1 from public.live_effects e where e.room_id = p_room and e.position = r.current_q + 1 and e.target = x.user_id and e.kind = 'attack'))
         order by x.score desc), '[]'::jsonb)
       from public.live_players x where x.room_id = p_room and not x.kicked and x.user_id <> p_user) end);
end $$;

-- ── Existing functions, extended for power-ups ───────────────────────

create or replace function public.live_answer(p_room uuid, p_user uuid, p_position integer, p_choice integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.live_rooms; q public.live_room_questions; v_now timestamptz := clock_timestamp();
        v_ms integer; v_frac numeric; v_ok boolean; v_pts integer; v_rows integer; v_counts jsonb;
begin
  select * into r from public.live_rooms where id = p_room;
  if r.id is null or not exists (select 1 from public.live_players where room_id = p_room and user_id = p_user and not kicked) then
    return jsonb_build_object('status', 'not_in_room');
  end if;
  -- Team rooms: only the team's captain answers.
  if public.live_is_teams(r.settings) then return public.live_team_answer(p_room, p_user, p_position, p_choice); end if;
  if r.stage <> 'question' or r.current_q <> p_position then return jsonb_build_object('status', 'closed'); end if;
  if r.paused then return jsonb_build_object('status', 'paused'); end if;
  -- Power-ups: Paralysis blocks the first 5 seconds; Tachycardia leaves 60% of the time.
  if public.live_spells_on(r.settings) and public.live_has_effect(p_room, p_position, p_user, 'paralysis')
     and v_now < r.q_started_at + interval '5 seconds' then
    return jsonb_build_object('status', 'paralyzed');
  end if;
  if v_now > (case when public.live_spells_on(r.settings) and public.live_has_effect(p_room, p_position, p_user, 'tachycardia')
                   then r.q_started_at + (r.deadline - r.q_started_at) * 0.6 else r.deadline end) + interval '1 second' then
    return jsonb_build_object('status', 'late');
  end if;
  select * into q from public.live_room_questions where room_id = p_room and position = p_position;
  if p_choice < 0 or p_choice >= jsonb_array_length(q.options) then return jsonb_build_object('status', 'bad_choice'); end if;
  v_ms := greatest(0, (extract(epoch from (v_now - r.q_started_at)) * 1000)::int);
  v_frac := least(1, greatest(0, extract(epoch from (v_now - r.q_started_at)) / greatest(1, extract(epoch from (r.deadline - r.q_started_at)))));
  v_ok := (p_choice = q.answer);
  v_pts := case when v_ok then round(100 - 50 * v_frac)::int else 0 end;
  -- Power-ups: Double or nothing doubles a right answer and costs 50 for a wrong one.
  if public.live_spells_on(r.settings) and public.live_has_effect(p_room, p_position, p_user, 'double_or_nothing') then
    v_pts := case when v_ok then v_pts * 2 else -50 end;
  end if;
  insert into public.live_answers (room_id, position, user_id, choice, received_at, ms, correct, points)
  values (p_room, p_position, p_user, p_choice, v_now, v_ms, v_ok, v_pts)
  on conflict do nothing;
  get diagnostics v_rows = row_count;
  if v_rows = 0 then return jsonb_build_object('status', 'duplicate'); end if;
  update public.live_players
     set score = greatest(0, score + v_pts), correct = correct + (case when v_ok then 1 else 0 end),
         total_ms = total_ms + v_ms, last_seen_at = now()
   where room_id = p_room and user_id = p_user;
  v_counts := public.live_counts(p_room, p_position);
  perform public.live_emit('live-host:' || p_room, 'answers', v_counts || jsonb_build_object(
    'position', p_position, 'players', public.live_active_count(p_room)));
  if public.live_spells_on(r.settings) then perform public.live_spell_after_answer(p_room, p_user, v_ok); end if;
  return jsonb_build_object('status', 'accepted');
end $$;

create or replace function public.live_state(p_room uuid, p_user uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.live_rooms; p public.live_players; v_host boolean; q public.live_room_questions;
        v_out jsonb; v_mine public.live_answers; v_rank integer;
begin
  select * into r from public.live_rooms where id = p_room;
  if r.id is null then return null; end if;
  v_host := (r.host = p_user);
  if not v_host then
    select * into p from public.live_players where room_id = p_room and user_id = p_user;
    if p.room_id is null then return null; end if;
    if not p.kicked then update public.live_players set last_seen_at = now() where room_id = p_room and user_id = p_user; end if;
  end if;

  v_out := jsonb_build_object(
    'role', case when v_host then 'host' else 'player' end,
    'room', jsonb_build_object('id', r.id, 'code', r.code, 'title', r.title, 'stage', r.stage,
      'current', r.current_q, 'total', r.total_q, 'deadline', r.deadline, 'paused', r.paused,
      'paused_left_ms', r.paused_left_ms, 'locked', r.locked,
      'settings', r.settings - 'internal'),
    'server_now', clock_timestamp(),
    'players', public.live_active_count(p_room));

  if r.current_q >= 0 and r.stage <> 'lobby' then
    select * into q from public.live_room_questions where room_id = p_room and position = r.current_q;
    v_out := v_out || jsonb_build_object('question', public.live_open_question(p_room, r.current_q));
    if r.stage in ('reveal', 'leaderboard', 'finished') then
      v_out := v_out || jsonb_build_object('reveal', jsonb_build_object(
        'answer', q.answer, 'explanation', q.explanation, 'counts', public.live_counts(p_room, r.current_q)));
    end if;
  end if;

  if r.stage in ('leaderboard', 'finished') then
    v_out := v_out || jsonb_build_object('board', public.live_public_board(p_room));
  end if;

  if v_host then
    v_out := v_out || jsonb_build_object(
      'counts', case when r.current_q >= 0 then public.live_counts(p_room, r.current_q) else null end,
      'roster', (select coalesce(jsonb_agg(jsonb_build_object(
          'user_id', pl.user_id, 'name', pl.display_name, 'email', pl.email, 'nickname', pl.nickname,
          'shown', public.live_shown_name(r.settings, pl.nickname, pl.display_name),
          'score', pl.score, 'correct', pl.correct, 'away', pl.away_count,
          'online', pl.last_seen_at > now() - interval '45 seconds',
          'answered', exists (select 1 from public.live_answers a where a.room_id = p_room and a.position = r.current_q and a.user_id = pl.user_id))
          order by pl.score desc, pl.total_ms asc), '[]'::jsonb)
        from public.live_players pl where pl.room_id = p_room and not pl.kicked));
  else
    select * into v_mine from public.live_answers where room_id = p_room and position = r.current_q and user_id = p_user;
    select x.rank into v_rank from jsonb_to_recordset(public.live_ranking(p_room)) as x(rank int, user_id uuid) where x.user_id = p_user;
    v_out := v_out || jsonb_build_object('me', jsonb_build_object(
      'kicked', p.kicked, 'nickname', p.nickname, 'score', p.score, 'correct', p.correct, 'rank', v_rank,
      'answer', case when v_mine.user_id is null then null
                     when r.stage = 'question' then jsonb_build_object('choice', v_mine.choice)
                     else jsonb_build_object('choice', v_mine.choice, 'correct', v_mine.correct, 'points', v_mine.points) end));
  end if;
  -- Power-ups: a player's cards, held spell and effects; the host sees who
  -- was hit for the next question.
  if public.live_spells_on(r.settings) then
    if v_host then
      v_out := v_out || jsonb_build_object('casts', (select coalesce(jsonb_agg(jsonb_build_object('spell', e.spell,
          'by', (select public.live_shown_name(r.settings, x.nickname, x.display_name) from public.live_players x where x.room_id = p_room and x.user_id = e.by),
          'target', (select public.live_shown_name(r.settings, x.nickname, x.display_name) from public.live_players x where x.room_id = p_room and x.user_id = e.target))
          order by e.at), '[]'::jsonb)
        from public.live_effects e where e.room_id = p_room and e.position = r.current_q + 1 and e.kind = 'attack'));
    else
      v_out := v_out || jsonb_build_object('spells', public.live_spell_view(p_room, p_user));
    end if;
  end if;
  -- Team rooms: the teams for the host; the student's own team, role and
  -- the team's votes and answer for everyone else.
  if public.live_is_teams(r.settings) then
    if v_host then
      v_out := v_out || jsonb_build_object('teams', (select coalesce(jsonb_agg(jsonb_build_object(
          'no', t.team_no, 'name', t.name, 'score', coalesce(tr.score, 0), 'correct', coalesce(tr.correct, 0), 'rank', tr.rank,
          'answered', exists (select 1 from public.live_team_answers a where a.room_id = p_room and a.position = r.current_q and a.team_no = t.team_no),
          'captain', case when r.current_q >= 0 then public.live_captain(p_room, t.team_no, r.current_q) end,
          'members', (select coalesce(jsonb_agg(jsonb_build_object('user_id', pl.user_id, 'shown', public.live_shown_name(r.settings, pl.nickname, pl.display_name),
                        'name', pl.display_name, 'online', pl.last_seen_at > now() - interval '45 seconds') order by pl.joined_at, pl.user_id), '[]'::jsonb)
                      from public.live_players pl where pl.room_id = p_room and pl.team_no = t.team_no and not pl.kicked)) order by t.team_no), '[]'::jsonb)
        from public.live_teams t
        left join jsonb_to_recordset(public.live_team_ranking(p_room)) as tr(no int, rank int, score int, correct int) on tr.no = t.team_no
        where t.room_id = p_room));
    elsif p.team_no is not null then
      v_out := v_out || jsonb_build_object('team', public.live_team_view(p_room, p_user));
    end if;
  end if;
  return v_out;
end $$;

-- ── Grants ──────────────────────────────────────────────────────────────
-- Same rule as before: only the service key (Netlify) calls live_*;
-- live_can_listen stays callable by signed-in users for Realtime.
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname like 'live\_%'
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    execute format('grant execute on function %s to service_role', f.sig);
  end loop;
end $$;

grant execute on function public.live_can_listen(text) to authenticated;
