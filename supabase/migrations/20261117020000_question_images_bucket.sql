-- Question pictures, kept out of the site build like the study guides'.
-- Public, as they would be under /images on the site; the site reaches them
-- through its own address (public/_redirects), so ad blockers that block
-- *.supabase.co do not hide them. Paths mirror /images/<folder>/<file>.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('question-images', 'question-images', true, 2097152,
        array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'])
on conflict (id) do nothing;
