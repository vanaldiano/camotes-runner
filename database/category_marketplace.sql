-- Camotes Runner Phase 8A: Category Marketplace MVP
-- Safe to run more than once. Adds marketplace tables and seed data only.
-- Does not delete or overwrite existing restaurants, menu items, food orders, bookings, riders, profiles, or auth data.

create extension if not exists pgcrypto;

create table if not exists public.service_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text,
  icon text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.service_subcategories (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.service_categories(id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  icon text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(category_id, slug)
);

create table if not exists public.business_partners (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.service_categories(id) on delete set null,
  subcategory_id uuid references public.service_subcategories(id) on delete set null,
  restaurant_id uuid references public.restaurants(id) on delete set null,
  name text not null,
  description text,
  image_url text,
  address text,
  latitude numeric,
  longitude numeric,
  phone text,
  rating numeric,
  estimated_time text,
  delivery_fee_label text,
  is_open boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.service_categories add column if not exists description text;
alter table public.service_categories add column if not exists icon text;
alter table public.service_categories add column if not exists sort_order integer not null default 0;
alter table public.service_categories add column if not exists is_active boolean not null default true;
alter table public.service_categories add column if not exists created_at timestamptz not null default now();
alter table public.service_categories add column if not exists updated_at timestamptz not null default now();

alter table public.service_subcategories add column if not exists category_id uuid;
alter table public.service_subcategories add column if not exists description text;
alter table public.service_subcategories add column if not exists icon text;
alter table public.service_subcategories add column if not exists sort_order integer not null default 0;
alter table public.service_subcategories add column if not exists is_active boolean not null default true;
alter table public.service_subcategories add column if not exists created_at timestamptz not null default now();
alter table public.service_subcategories add column if not exists updated_at timestamptz not null default now();

alter table public.business_partners add column if not exists category_id uuid;
alter table public.business_partners add column if not exists subcategory_id uuid;
alter table public.business_partners add column if not exists restaurant_id uuid;
alter table public.business_partners add column if not exists description text;
alter table public.business_partners add column if not exists image_url text;
alter table public.business_partners add column if not exists address text;
alter table public.business_partners add column if not exists latitude numeric;
alter table public.business_partners add column if not exists longitude numeric;
alter table public.business_partners add column if not exists phone text;
alter table public.business_partners add column if not exists rating numeric;
alter table public.business_partners add column if not exists estimated_time text;
alter table public.business_partners add column if not exists delivery_fee_label text;
alter table public.business_partners add column if not exists is_open boolean not null default true;
alter table public.business_partners add column if not exists is_active boolean not null default true;
alter table public.business_partners add column if not exists created_at timestamptz not null default now();
alter table public.business_partners add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'service_subcategories_category_id_fkey'
  ) then
    alter table public.service_subcategories
    add constraint service_subcategories_category_id_fkey
    foreign key (category_id) references public.service_categories(id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'service_subcategories_category_slug_key'
  ) then
    alter table public.service_subcategories
    add constraint service_subcategories_category_slug_key unique (category_id, slug);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'business_partners_category_id_fkey'
  ) then
    alter table public.business_partners
    add constraint business_partners_category_id_fkey
    foreign key (category_id) references public.service_categories(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'business_partners_subcategory_id_fkey'
  ) then
    alter table public.business_partners
    add constraint business_partners_subcategory_id_fkey
    foreign key (subcategory_id) references public.service_subcategories(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'business_partners_restaurant_id_fkey'
  ) then
    alter table public.business_partners
    add constraint business_partners_restaurant_id_fkey
    foreign key (restaurant_id) references public.restaurants(id) on delete set null;
  end if;
end $$;

create index if not exists service_categories_active_sort_idx
on public.service_categories(is_active, sort_order, name);

create index if not exists service_subcategories_category_active_sort_idx
on public.service_subcategories(category_id, is_active, sort_order, name);

create index if not exists business_partners_category_active_idx
on public.business_partners(category_id, is_active, is_open, name);

create index if not exists business_partners_subcategory_active_idx
on public.business_partners(subcategory_id, is_active, is_open, name);

create index if not exists business_partners_restaurant_id_idx
on public.business_partners(restaurant_id);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
    or coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
    or exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and role = 'admin'
    );
$$;

alter table public.service_categories enable row level security;
alter table public.service_subcategories enable row level security;
alter table public.business_partners enable row level security;

drop policy if exists "Customers can view active service categories" on public.service_categories;
create policy "Customers can view active service categories"
on public.service_categories
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Admins can manage service categories" on public.service_categories;
create policy "Admins can manage service categories"
on public.service_categories
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Customers can view active service subcategories" on public.service_subcategories;
create policy "Customers can view active service subcategories"
on public.service_subcategories
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Admins can manage service subcategories" on public.service_subcategories;
create policy "Admins can manage service subcategories"
on public.service_subcategories
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Customers can view active business partners" on public.business_partners;
create policy "Customers can view active business partners"
on public.business_partners
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Admins can manage business partners" on public.business_partners;
create policy "Admins can manage business partners"
on public.business_partners
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

insert into public.service_categories (name, slug, description, icon, sort_order)
values
  ('Restaurants / Food', 'restaurants-food', 'Meals, snacks, drinks, and local food delivery.', 'restaurant', 1),
  ('Groceries', 'groceries', 'Everyday store pickup and delivery.', 'shopping_basket', 2),
  ('Medicine / Pharmacy', 'medicine-pharmacy', 'Medicine, vitamins, and pharmacy assistance.', 'medical_services', 3),
  ('School Supplies', 'school-supplies', 'Printing, paper, books, and class essentials.', 'edit_note', 4),
  ('Tours', 'tours', 'Island tours, transport, and travel help.', 'beach_access', 5),
  ('Errands', 'errands', 'Document pickup, bills payment, shopping, and delivery help.', 'package_2', 6),
  ('Ride', 'ride', 'Motorcycle rides and special trips around Camotes.', 'two_wheeler', 7)
on conflict (slug) do nothing;

insert into public.service_subcategories (category_id, name, slug, sort_order)
select c.id, v.name, v.slug, v.sort_order
from public.service_categories c
join (
  values
    ('restaurants-food', 'Fast Food', 'fast-food', 1),
    ('restaurants-food', 'Milk Tea', 'milk-tea', 2),
    ('restaurants-food', 'Coffee', 'coffee', 3),
    ('restaurants-food', 'BBQ / Grill', 'bbq-grill', 4),
    ('restaurants-food', 'Carinderia', 'carinderia', 5),
    ('restaurants-food', 'Bakery', 'bakery', 6),
    ('restaurants-food', 'Snacks', 'snacks', 7),
    ('restaurants-food', 'Seafood', 'seafood', 8),
    ('groceries', 'Mini Mart', 'mini-mart', 1),
    ('groceries', 'Sari-sari Store', 'sari-sari-store', 2),
    ('groceries', 'Drinks', 'drinks', 3),
    ('groceries', 'Frozen Goods', 'frozen-goods', 4),
    ('groceries', 'Fresh Produce', 'fresh-produce', 5),
    ('groceries', 'Household Items', 'household-items', 6),
    ('medicine-pharmacy', 'Pharmacy', 'pharmacy', 1),
    ('medicine-pharmacy', 'Vitamins', 'vitamins', 2),
    ('medicine-pharmacy', 'First Aid', 'first-aid', 3),
    ('medicine-pharmacy', 'Personal Care', 'personal-care', 4),
    ('medicine-pharmacy', 'Baby Care', 'baby-care', 5),
    ('school-supplies', 'Printing', 'printing', 1),
    ('school-supplies', 'Books', 'books', 2),
    ('school-supplies', 'Paper Supplies', 'paper-supplies', 3),
    ('school-supplies', 'Art Materials', 'art-materials', 4),
    ('school-supplies', 'Uniforms', 'uniforms', 5),
    ('school-supplies', 'Electronics Accessories', 'electronics-accessories', 6),
    ('tours', 'Island Tour', 'island-tour', 1),
    ('tours', 'Motor Rental', 'motor-rental', 2),
    ('tours', 'Boat Tour', 'boat-tour', 3),
    ('tours', 'Accommodation', 'accommodation', 4),
    ('tours', 'Tour Guide', 'tour-guide', 5),
    ('errands', 'Document Pickup', 'document-pickup', 1),
    ('errands', 'Bills Payment', 'bills-payment', 2),
    ('errands', 'Personal Shopping', 'personal-shopping', 3),
    ('errands', 'Delivery Assistance', 'delivery-assistance', 4),
    ('ride', 'Motorcycle Ride', 'motorcycle-ride', 1),
    ('ride', 'Multicab / Van', 'multicab-van', 2),
    ('ride', 'Special Trip', 'special-trip', 3)
) as v(category_slug, name, slug, sort_order)
  on c.slug = v.category_slug
on conflict (category_id, slug) do nothing;

insert into public.business_partners (
  category_id,
  subcategory_id,
  restaurant_id,
  name,
  description,
  address,
  latitude,
  longitude,
  phone,
  rating,
  estimated_time,
  delivery_fee_label,
  is_open,
  is_active
)
select
  c.id,
  s.id,
  (select r.id from public.restaurants r where lower(r.name) = lower('M Cafe') limit 1),
  'M Cafe',
  'Local cafe meals, coffee, rice meals, burgers, and cold drinks.',
  'Camotes Island',
  10.6460,
  124.3510,
  '09123456789',
  4.8,
  '35-45 min',
  'PHP 50 delivery',
  true,
  true
from public.service_categories c
join public.service_subcategories s on s.category_id = c.id and s.slug = 'coffee'
where c.slug = 'restaurants-food'
  and not exists (select 1 from public.business_partners where name = 'M Cafe');

insert into public.business_partners (
  category_id, subcategory_id, name, description, address, rating, estimated_time, delivery_fee_label, is_open, is_active
)
select c.id, s.id, 'Local BBQ House', 'Grilled favorites and local BBQ meals.', 'San Francisco, Camotes', 4.6, '40-50 min', 'PHP 60 delivery', true, true
from public.service_categories c
join public.service_subcategories s on s.category_id = c.id and s.slug = 'bbq-grill'
where c.slug = 'restaurants-food'
  and not exists (select 1 from public.business_partners where name = 'Local BBQ House');

insert into public.business_partners (
  category_id, subcategory_id, name, description, address, rating, estimated_time, delivery_fee_label, is_open, is_active
)
select c.id, s.id, 'Camotes Mini Mart', 'Daily essentials, snacks, drinks, and household items.', 'Consuelo, Camotes', 4.7, '30-45 min', 'PHP 55 delivery', true, true
from public.service_categories c
join public.service_subcategories s on s.category_id = c.id and s.slug = 'mini-mart'
where c.slug = 'groceries'
  and not exists (select 1 from public.business_partners where name = 'Camotes Mini Mart');

insert into public.business_partners (
  category_id, subcategory_id, name, description, address, rating, estimated_time, delivery_fee_label, is_open, is_active
)
select c.id, s.id, 'Island Pharmacy', 'Medicine pickup, vitamins, first aid, and personal care.', 'Poro, Camotes', 4.9, '35-50 min', 'PHP 60 delivery', true, true
from public.service_categories c
join public.service_subcategories s on s.category_id = c.id and s.slug = 'pharmacy'
where c.slug = 'medicine-pharmacy'
  and not exists (select 1 from public.business_partners where name = 'Island Pharmacy');

insert into public.business_partners (
  category_id, subcategory_id, name, description, address, rating, estimated_time, delivery_fee_label, is_open, is_active
)
select c.id, s.id, 'School Supply Center', 'Paper supplies, notebooks, printing materials, and school essentials.', 'San Francisco, Camotes', 4.5, '30-40 min', 'PHP 45 delivery', true, true
from public.service_categories c
join public.service_subcategories s on s.category_id = c.id and s.slug = 'paper-supplies'
where c.slug = 'school-supplies'
  and not exists (select 1 from public.business_partners where name = 'School Supply Center');

insert into public.business_partners (
  category_id, subcategory_id, name, description, address, rating, estimated_time, delivery_fee_label, is_open, is_active
)
select c.id, s.id, 'Camotes Island Tour', 'Island tour transport and local trip assistance.', 'Camotes Island', 4.9, 'Schedule ahead', 'Custom trip rate', true, true
from public.service_categories c
join public.service_subcategories s on s.category_id = c.id and s.slug = 'island-tour'
where c.slug = 'tours'
  and not exists (select 1 from public.business_partners where name = 'Camotes Island Tour');
