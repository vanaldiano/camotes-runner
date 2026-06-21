-- Camotes Runner Phase 8H.1: Partner product image upload support.
-- Safe to run more than once. Does not delete or overwrite existing partner products.

alter table public.partner_products
add column if not exists image_path text;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'partner-products',
  'partner-products',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can read partner product images" on storage.objects;
create policy "Public can read partner product images"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'partner-products');

drop policy if exists "Authenticated users can upload partner product images" on storage.objects;
create policy "Authenticated users can upload partner product images"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'partner-products');

drop policy if exists "Authenticated users can update partner product images" on storage.objects;
create policy "Authenticated users can update partner product images"
on storage.objects
for update
to authenticated
using (bucket_id = 'partner-products')
with check (bucket_id = 'partner-products');

-- Hardening note:
-- Partner Preview is still admin-controlled. When real partner login is enabled,
-- replace the authenticated upload/update policies with admin/partner-scoped
-- checks so users can only write to their own partner folder.
