-- Paying for a pass: the student transfers the money to a bank account,
-- writes their reference in the payment, and uploads the receipt. An admin
-- checks it and switches the pass on (netlify/functions/payments.js and
-- admin.js). Nothing here changes what students can see.

create table public.payment_requests (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references auth.users (id) on delete cascade,
  -- What the student was told to write in the bank transfer, e.g. LB-7K2QXM.
  reference    text not null,
  -- The uploaded receipt, in the private `receipts` storage bucket.
  receipt_path text not null,
  status       text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at   timestamptz not null default now(),
  decided_at   timestamptz,
  decided_by   text,
  -- Shown to the student when a receipt is rejected.
  note         text check (note is null or char_length(note) <= 300)
);
alter table public.payment_requests enable row level security;
create index payment_requests_user_idx on public.payment_requests (user_id, created_at desc);
create index payment_requests_status_idx on public.payment_requests (status, created_at);
-- One receipt waiting per student; sending another replaces it.
create unique index payment_requests_one_pending on public.payment_requests (user_id) where status = 'pending';

-- Receipts show names and account numbers: a private bucket, read only by
-- the admin function through short-lived signed links.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('receipts', 'receipts', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;
