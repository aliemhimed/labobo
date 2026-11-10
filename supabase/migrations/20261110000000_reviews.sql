-- Student reviews: stars and a few words, shown on the home page once an
-- admin approves them.
--   One review per student (writing again replaces it and sends it back for
--   approval). New and edited reviews start as 'pending'; the admin dashboard
--   moves them to 'approved' (shown) or 'hidden'.
-- Read and written only through netlify/functions/reviews.js and admin.js
-- with the service key, so the table has RLS on and no policies.

create table if not exists public.reviews (
  id         bigint      generated always as identity primary key,
  user_id    text        not null unique,
  name       text        not null check (char_length(name) between 1 and 40),
  rating     smallint    not null check (rating between 1 and 5),
  body       text        not null check (char_length(body) between 1 and 400),
  status     text        not null default 'pending' check (status in ('pending', 'approved', 'hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by text
);
create index if not exists reviews_status_updated on public.reviews (status, updated_at desc);
alter table public.reviews enable row level security;
