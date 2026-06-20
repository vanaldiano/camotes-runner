-- Camotes Runner Phase 5C: Supabase Storage buckets for admin image uploads.
-- Run this in Supabase SQL Editor after database/food_menu_schema.sql.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values
  (
    'restaurant-images',
    'restaurant-images',
    true,
    5242880,
    array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  ),
  (
    'menu-images',
    'menu-images',
    true,
    5242880,
    array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  )
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "MVP can read restaurant images" on storage.objects;
create policy "MVP can read restaurant images"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'restaurant-images');

drop policy if exists "MVP can upload restaurant images" on storage.objects;
create policy "MVP can upload restaurant images"
on storage.objects
for insert
to anon, authenticated
with check (bucket_id = 'restaurant-images');

drop policy if exists "MVP can update restaurant images" on storage.objects;
create policy "MVP can update restaurant images"
on storage.objects
for update
to anon, authenticated
using (bucket_id = 'restaurant-images')
with check (bucket_id = 'restaurant-images');

drop policy if exists "MVP can read menu images" on storage.objects;
create policy "MVP can read menu images"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'menu-images');

drop policy if exists "MVP can upload menu images" on storage.objects;
create policy "MVP can upload menu images"
on storage.objects
for insert
to anon, authenticated
with check (bucket_id = 'menu-images');

drop policy if exists "MVP can update menu images" on storage.objects;
create policy "MVP can update menu images"
on storage.objects
for update
to anon, authenticated
using (bucket_id = 'menu-images')
with check (bucket_id = 'menu-images');
