-- Study guides move out of the site build and into the database, so a new
-- guide goes live without a deploy (study-guides/publish.cjs writes here,
-- netlify/functions/guide.js reads).
--
-- The guide text is locked like its lectures' questions, and that check is
-- in the guide function. So only the service key reads these tables: RLS is
-- on with no policies and no grants for the publishable key.

-- One row per subject that has guides: what the app says about the set.
create table public.study_guide_sets (
  subject text primary key check (char_length(subject) between 1 and 40),
  scope text not null,
  note text not null,
  parts text[] not null,
  updated_at timestamptz not null default now()
);

create table public.study_guides (
  subject text not null references public.study_guide_sets(subject) on delete cascade,
  path text not null check (path ~ '^[a-z0-9-]+/[a-z0-9-]+$'),
  ord integer not null,
  part text not null,
  folder text not null,
  slug text not null,
  lecture integer,
  label text not null,
  title text not null,
  lede text not null default '',
  -- The lectures this guide covers, as named in free_topics for `tb`.
  topics text[] not null default '{}',
  tb text,
  minutes integer not null default 5,
  videos integer not null default 0,
  pictures integer not null default 0,
  quiz integer not null default 0,
  -- An <article class="lb-guide"> fragment, checked by study-guides/build.cjs.
  html text not null check (html like '<article class="lb-guide"%'),
  updated_at timestamptz not null default now(),
  primary key (subject, path)
);

alter table public.study_guide_sets enable row level security;
alter table public.study_guides enable row level security;
revoke all on public.study_guide_sets, public.study_guides from anon, authenticated;

comment on table public.study_guides is
  'Study guides (text and list details). Read only by the guide function with the service key, which applies the pass / free_topics rule.';

-- The guides' pictures. Public, as they were under /guides/img on the site;
-- the site reaches them through its own address (public/_redirects).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('guide-images', 'guide-images', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
