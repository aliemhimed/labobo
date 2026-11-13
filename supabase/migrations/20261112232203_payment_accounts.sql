-- The bank accounts students transfer the pass price to, shown in the
-- subscribe dialog. Kept in the database, not in the code: the code is
-- public and the accounts change (edit a row and the site shows it at once,
-- no deploy). Served only to signed-in students by /api/payments, so there
-- is no policy for the publishable key. The rows themselves are added by
-- hand and are deliberately not part of this file.
create table public.payment_accounts (
  id       bigint generated always as identity primary key,
  bank     text not null,
  holder   text not null,
  iban     text not null check (iban = upper(iban) and iban !~ '\s'),
  -- Lower comes first in the dialog.
  position int not null default 0,
  -- Switch an account off without losing it.
  active   boolean not null default true
);
alter table public.payment_accounts enable row level security;
