-- Camotes Runner Phase 8D: Partner Product/Menu Editing
-- Safe to run more than once. Adds partner product catalogs without changing restaurant menu/cart/checkout data.

create extension if not exists pgcrypto;

create table if not exists public.partner_products (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.business_partners(id) on delete cascade,
  category_id uuid references public.service_categories(id),
  subcategory_id uuid references public.service_subcategories(id),
  name text not null,
  description text,
  price numeric not null default 0,
  image_url text,
  sku text,
  unit_label text,
  sort_order integer default 0,
  is_available boolean default true,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.partner_products add column if not exists partner_id uuid;
alter table public.partner_products add column if not exists category_id uuid;
alter table public.partner_products add column if not exists subcategory_id uuid;
alter table public.partner_products add column if not exists name text;
alter table public.partner_products add column if not exists description text;
alter table public.partner_products add column if not exists price numeric not null default 0;
alter table public.partner_products add column if not exists image_url text;
alter table public.partner_products add column if not exists sku text;
alter table public.partner_products add column if not exists unit_label text;
alter table public.partner_products add column if not exists sort_order integer default 0;
alter table public.partner_products add column if not exists is_available boolean default true;
alter table public.partner_products add column if not exists is_active boolean default true;
alter table public.partner_products add column if not exists created_at timestamptz default now();
alter table public.partner_products add column if not exists updated_at timestamptz default now();

update public.partner_products set price = 0 where price is null;
update public.partner_products set sort_order = 0 where sort_order is null;
update public.partner_products set is_available = true where is_available is null;
update public.partner_products set is_active = true where is_active is null;
update public.partner_products set created_at = now() where created_at is null;
update public.partner_products set updated_at = now() where updated_at is null;

alter table public.partner_products alter column price set default 0;
alter table public.partner_products alter column price set not null;
alter table public.partner_products alter column sort_order set default 0;
alter table public.partner_products alter column is_available set default true;
alter table public.partner_products alter column is_active set default true;
alter table public.partner_products alter column created_at set default now();
alter table public.partner_products alter column updated_at set default now();

do $$
begin
  if not exists (
    select 1 from public.partner_products where partner_id is null
  ) then
    alter table public.partner_products alter column partner_id set not null;
  end if;

  if not exists (
    select 1 from public.partner_products where name is null
  ) then
    alter table public.partner_products alter column name set not null;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'partner_products_partner_id_fkey'
  ) then
    alter table public.partner_products
    add constraint partner_products_partner_id_fkey
    foreign key (partner_id) references public.business_partners(id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'partner_products_category_id_fkey'
  ) then
    alter table public.partner_products
    add constraint partner_products_category_id_fkey
    foreign key (category_id) references public.service_categories(id);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'partner_products_subcategory_id_fkey'
  ) then
    alter table public.partner_products
    add constraint partner_products_subcategory_id_fkey
    foreign key (subcategory_id) references public.service_subcategories(id);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'partner_products_price_nonnegative_check'
  ) then
    alter table public.partner_products
    add constraint partner_products_price_nonnegative_check
    check (price >= 0);
  end if;
end $$;

create table if not exists public.partner_product_audit (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.partner_products(id) on delete set null,
  partner_id uuid references public.business_partners(id) on delete set null,
  action text not null,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz default now()
);

alter table public.partner_product_audit add column if not exists product_id uuid;
alter table public.partner_product_audit add column if not exists partner_id uuid;
alter table public.partner_product_audit add column if not exists action text;
alter table public.partner_product_audit add column if not exists old_data jsonb;
alter table public.partner_product_audit add column if not exists new_data jsonb;
alter table public.partner_product_audit add column if not exists created_at timestamptz default now();

update public.partner_product_audit set action = 'unknown' where action is null;
alter table public.partner_product_audit alter column action set not null;
alter table public.partner_product_audit alter column created_at set default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'partner_product_audit_product_id_fkey'
  ) then
    alter table public.partner_product_audit
    add constraint partner_product_audit_product_id_fkey
    foreign key (product_id) references public.partner_products(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'partner_product_audit_partner_id_fkey'
  ) then
    alter table public.partner_product_audit
    add constraint partner_product_audit_partner_id_fkey
    foreign key (partner_id) references public.business_partners(id) on delete set null;
  end if;
end $$;

create index if not exists partner_products_partner_id_idx
on public.partner_products(partner_id);

create index if not exists partner_products_category_id_idx
on public.partner_products(category_id);

create index if not exists partner_products_subcategory_id_idx
on public.partner_products(subcategory_id);

create index if not exists partner_products_active_available_idx
on public.partner_products(is_active, is_available);

create index if not exists partner_product_audit_product_id_idx
on public.partner_product_audit(product_id);

create index if not exists partner_product_audit_partner_id_idx
on public.partner_product_audit(partner_id);

create or replace function public.set_partner_product_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists partner_products_set_updated_at on public.partner_products;
create trigger partner_products_set_updated_at
before update on public.partner_products
for each row
execute function public.set_partner_product_updated_at();

create or replace function public.audit_partner_product_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.partner_product_audit (product_id, partner_id, action, new_data)
    values (new.id, new.partner_id, 'insert', to_jsonb(new));
    return new;
  elsif tg_op = 'UPDATE' then
    insert into public.partner_product_audit (product_id, partner_id, action, old_data, new_data)
    values (new.id, new.partner_id, 'update', to_jsonb(old), to_jsonb(new));
    return new;
  end if;

  return null;
end;
$$;

drop trigger if exists partner_products_audit_changes on public.partner_products;
create trigger partner_products_audit_changes
after insert or update on public.partner_products
for each row
execute function public.audit_partner_product_changes();

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

create or replace function public.is_partner_user(target_partner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.partner_users
    where partner_id = target_partner_id
      and user_id = auth.uid()
      and is_active = true
  );
$$;

insert into public.partner_products (
  partner_id,
  category_id,
  subcategory_id,
  name,
  description,
  price,
  unit_label,
  sort_order,
  is_available,
  is_active
)
select bp.id, bp.category_id, bp.subcategory_id, seed.name, seed.description, seed.price, seed.unit_label, seed.sort_order, true, true
from public.business_partners bp
join (
  values
    ('M Cafe', 'Iced Coffee', 'Cold local cafe coffee.', 95::numeric, 'cup', 10),
    ('M Cafe', 'Burger Meal', 'Burger with side and drink.', 180::numeric, 'meal', 20),
    ('M Cafe', 'Rice Meal', 'Rice meal with local favorite viand.', 160::numeric, 'meal', 30),
    ('Camotes Mini Mart', 'Bottled Water', 'Drinking water for delivery.', 25::numeric, 'bottle', 10),
    ('Camotes Mini Mart', 'Soft Drinks', 'Assorted cold soft drinks.', 45::numeric, 'bottle', 20),
    ('Camotes Mini Mart', 'Rice 1kg', 'Packed rice for home essentials.', 70::numeric, '1kg', 30),
    ('Island Pharmacy', 'Paracetamol', 'Basic pain and fever relief.', 8::numeric, 'tablet', 10),
    ('Island Pharmacy', 'Vitamin C', 'Daily vitamin supplement.', 6::numeric, 'tablet', 20),
    ('School Supply Center', 'Notebook', 'School notebook.', 35::numeric, 'piece', 10),
    ('School Supply Center', 'Ballpen', 'Writing pen for school and office.', 12::numeric, 'piece', 20),
    ('Camotes Island Tour', 'Island Tour Package', 'Local island tour arrangement.', 1500::numeric, 'package', 10)
) as seed(partner_name, name, description, price, unit_label, sort_order)
  on lower(bp.name) = lower(seed.partner_name)
where not exists (
  select 1
  from public.partner_products existing
  where existing.partner_id = bp.id
    and lower(existing.name) = lower(seed.name)
);

alter table public.partner_products enable row level security;
alter table public.partner_product_audit enable row level security;

drop policy if exists "Public can read active available partner products" on public.partner_products;
create policy "Public can read active available partner products"
on public.partner_products
for select
to anon, authenticated
using (
  is_active = true
  and is_available = true
  and exists (
    select 1
    from public.business_partners bp
    where bp.id = partner_id
      and bp.is_active = true
      and bp.status = 'active'
  )
);

drop policy if exists "Admins can manage partner products" on public.partner_products;
create policy "Admins can manage partner products"
on public.partner_products
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Partner users can manage own partner products" on public.partner_products;
create policy "Partner users can manage own partner products"
on public.partner_products
for all
to authenticated
using (public.is_partner_user(partner_id))
with check (public.is_partner_user(partner_id));

drop policy if exists "Admins can read partner product audit" on public.partner_product_audit;
create policy "Admins can read partner product audit"
on public.partner_product_audit
for select
to authenticated
using (public.is_admin());

drop policy if exists "Partner users can read own partner product audit" on public.partner_product_audit;
create policy "Partner users can read own partner product audit"
on public.partner_product_audit
for select
to authenticated
using (partner_id is not null and public.is_partner_user(partner_id));

-- Customers can read active/available products only. Product editing remains admin/partner-user only.
