-- =========================================================================
-- Labobo Supabase migration — 2026-05-25
-- Adds the `announcements` table so the admin dashboard can publish
-- site-wide announcements without redeploying code.
-- Safe to run multiple times.
-- Run this in the Supabase SQL Editor.
-- =========================================================================

-- 1) Table -----------------------------------------------------------------
create table if not exists public.announcements (
  id          text         primary key,            -- slug-style, e.g. "report-button-2026-05"
  title       text         not null,
  body        text         not null,               -- HTML allowed (<strong>, <em>, <br>, <a>)
  pub_date    date         not null default current_date,  -- publish date shown to users
  active      boolean      not null default true,   -- toggle off to hide without deleting
  created_at  timestamptz  not null default now(),
  updated_at  timestamptz  not null default now()
);

-- 2) Touch updated_at on every UPDATE --------------------------------------
create or replace function public.touch_announcement_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_announcements_touch on public.announcements;
create trigger trg_announcements_touch
  before update on public.announcements
  for each row execute function public.touch_announcement_updated_at();

-- 3) Indexes ---------------------------------------------------------------
create index if not exists announcements_active_date_idx
  on public.announcements (active, pub_date desc);

-- 4) RLS policies ----------------------------------------------------------
-- Anon can READ active announcements (the public site fetches these).
-- Writes are restricted to the service_role key (used by the admin function).
alter table public.announcements enable row level security;

drop policy if exists "ann_anon_read_active" on public.announcements;
create policy "ann_anon_read_active"
  on public.announcements
  for select
  to anon
  using (active = true);

-- 5) Seed the three existing announcements (idempotent) --------------------
insert into public.announcements (id, title, body, pub_date, active) values
  (
    'medicine-art-launch-2026-05',
    '🎨🩺 New subject: Medicine & Art',
    'A brand-new bank for Medicine &amp; Art is live — <strong>240 questions</strong> across the mock test plus Art &amp; Anatomy, Digital Imaging, Doctors in Art, History of Medicine, Medical Photography, Art as Healing, the AIDS Pandemic &amp; Art and more. Most image-based MCQs include the original artwork right under the question. Find it on the home screen under <strong>Medicine &amp; Art</strong>.',
    '2026-05-25',
    true
  ),
  (
    'report-button-2026-05',
    '🚩 New: Report a problem button',
    'You can now flag questions with wrong answers, typos, or unclear wording. Look for the <strong>🚩 Report</strong> button next to each question. Your feedback helps us fix the bank for everyone — thank you!',
    '2026-05-24',
    true
  ),
  (
    'leaderboard-live-2026-05',
    '🏆 Out now: Weekly Exam Leaderboard',
    'The <strong>weekly leaderboard</strong> for Exam Mode is live! Each subject has its own board, resetting every Monday. Start a <strong>30-question exam</strong> in any subject, pick your handle, and compete for the highest score. Participation is <em>opt-in</em> — your choice every time.<br><br>Good luck 💪',
    '2026-05-24',
    true
  )
on conflict (id) do nothing;

-- 6) Reload PostgREST cache -----------------------------------------------
notify pgrst, 'reload schema';
