-- Make the GCT II Biochemistry pre-midterm cases free for everyone, signed in
-- or not, like the first two lectures of each bank. Insert only; running it
-- again does nothing.

insert into public.free_topics (tb, topic)
values ('gct2_biochemistry', 'Biochemistry — Pre-Midterm Cases')
on conflict do nothing;
