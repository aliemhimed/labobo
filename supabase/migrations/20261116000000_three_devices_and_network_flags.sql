-- Allow up to 3 devices per pass or trial: one phone + two tablets or
-- computers ('phone', 'other', 'other_2'), and record a salted hash of each
-- device's network prefix so the admin dashboard can flag simultaneous use
-- across different networks without storing raw IP addresses.
alter table public.user_devices
  drop constraint user_devices_slot_check,
  add constraint user_devices_slot_check check (slot in ('phone', 'other', 'other_2')),
  add column net_hash text check (net_hash is null or char_length(net_hash) <= 32),
  add column split_hits int not null default 0 check (split_hits >= 0),
  add column last_split_at timestamptz;

comment on table public.user_devices is
  'Pass and trial device slots: one phone and two tablets or computers per account, plus hashed network prefixes and simultaneous different-network counters for admin review.';
