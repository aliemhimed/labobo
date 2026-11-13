-- Subscriptions, step 1 of 2: the new tables. Nothing here changes what
-- students can see; the lock itself is 20261114000000_lock_paid_lectures.sql.

-- A student's pass. One row per account, replaced when the pass is renewed.
-- Written only by the admin function (service key).
create table public.subscriptions (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  expires_at timestamptz not null,
  granted_at timestamptz not null default now(),
  granted_by text,
  note       text check (note is null or char_length(note) <= 300)
);
alter table public.subscriptions enable row level security;

-- The one-time 3-day trial, keyed by the university address so that deleting
-- the account and signing up again does not give a second one (no foreign
-- key on purpose).
create table public.trials (
  email      text primary key check (email = lower(email)),
  user_id    uuid not null,
  started_at timestamptz not null default now(),
  expires_at timestamptz not null
);
alter table public.trials enable row level security;
create index trials_user_id_idx on public.trials (user_id);

-- Which lectures stay free. `topic` is the name students see: display_topic
-- where the bank has one, otherwise topic. Public: the app shows a lock on
-- everything that is not listed here.
create table public.free_topics (
  tb    text not null,
  topic text not null,
  primary key (tb, topic)
);
alter table public.free_topics enable row level security;
create policy free_topics_public_read on public.free_topics for select using (true);
grant select on public.free_topics to anon, authenticated;

-- Seed: the first two lectures of every bank. Where topics are numbered
-- ("Lec 1", "Wk 2", "Lecture 1 -") take numbers 1 and 2; otherwise the first
-- two topics in order, skipping past papers, mock tests, cases and prep sets.
do $$
declare
  t record;
  has_display boolean;
  eff text;
  n int;
begin
  for t in
    select tablename from pg_policies
    where schemaname = 'public' and policyname = tablename || '_public_read' and tablename <> 'free_topics'
  loop
    select exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = t.tablename and column_name = 'display_topic'
    ) into has_display;
    eff := case when has_display then 'coalesce(nullif(display_topic, ''''), topic)' else 'topic' end;

    execute format(
      'insert into public.free_topics (tb, topic)
       select distinct %L, %s from public.%I
       where topic ~ ''(Lec|Wk|Lecture)\s+0?[12]\s*[:\-]'' and %s is not null
       on conflict do nothing', t.tablename, eff, t.tablename, eff);
    get diagnostics n = row_count;

    if n = 0 then
      execute format(
        'insert into public.free_topics (tb, topic)
         select %L, x.topic from (
           select %s as topic, min(ord) as first_ord from public.%I
           where %s is not null and %s !~* ''(past paper|mock|cases|prep|exam)''
           group by 1 order by 2 limit 2
         ) x on conflict do nothing', t.tablename, eff, t.tablename, eff, eff);
    end if;
  end loop;
end $$;
