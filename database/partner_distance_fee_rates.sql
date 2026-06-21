-- Phase 8E.5: Partner service-based distance fee rates.
-- Safe to rerun. Does not delete or overwrite existing orders, partners, restaurants, rides, or auth data.

create extension if not exists pgcrypto with schema extensions;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.partner_delivery_rate_profiles (
  id uuid primary key default extensions.gen_random_uuid(),
  category_id uuid null references public.service_categories(id) on delete set null,
  subcategory_id uuid null references public.service_subcategories(id) on delete set null,
  partner_id uuid null references public.business_partners(id) on delete cascade,
  name text not null,
  service_type text not null,
  minimum_fee numeric not null default 50,
  base_fee numeric not null default 50,
  base_km numeric not null default 2,
  per_km_fee numeric not null default 8,
  service_fee numeric not null default 0,
  is_manual_quote boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.partner_delivery_rate_profiles add column if not exists category_id uuid;
alter table public.partner_delivery_rate_profiles add column if not exists subcategory_id uuid;
alter table public.partner_delivery_rate_profiles add column if not exists partner_id uuid;
alter table public.partner_delivery_rate_profiles add column if not exists name text;
alter table public.partner_delivery_rate_profiles add column if not exists service_type text;
alter table public.partner_delivery_rate_profiles add column if not exists minimum_fee numeric not null default 50;
alter table public.partner_delivery_rate_profiles add column if not exists base_fee numeric not null default 50;
alter table public.partner_delivery_rate_profiles add column if not exists base_km numeric not null default 2;
alter table public.partner_delivery_rate_profiles add column if not exists per_km_fee numeric not null default 8;
alter table public.partner_delivery_rate_profiles add column if not exists service_fee numeric not null default 0;
alter table public.partner_delivery_rate_profiles add column if not exists is_manual_quote boolean not null default false;
alter table public.partner_delivery_rate_profiles add column if not exists is_active boolean not null default true;
alter table public.partner_delivery_rate_profiles add column if not exists created_at timestamptz not null default now();
alter table public.partner_delivery_rate_profiles add column if not exists updated_at timestamptz not null default now();

update public.partner_delivery_rate_profiles
set
  name = coalesce(name, 'Partner delivery rate'),
  service_type = coalesce(service_type, 'default'),
  updated_at = coalesce(updated_at, now())
where name is null or service_type is null or updated_at is null;

alter table public.partner_delivery_rate_profiles alter column name set not null;
alter table public.partner_delivery_rate_profiles alter column service_type set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'partner_delivery_rate_profiles_amounts_check'
  ) then
    alter table public.partner_delivery_rate_profiles
    add constraint partner_delivery_rate_profiles_amounts_check
    check (
      minimum_fee >= 0
      and base_fee >= 0
      and base_km >= 0
      and per_km_fee >= 0
      and service_fee >= 0
    );
  end if;
end $$;

create index if not exists partner_delivery_rate_profiles_partner_id_idx
on public.partner_delivery_rate_profiles(partner_id)
where partner_id is not null;

create index if not exists partner_delivery_rate_profiles_subcategory_id_idx
on public.partner_delivery_rate_profiles(subcategory_id)
where subcategory_id is not null;

create index if not exists partner_delivery_rate_profiles_category_id_idx
on public.partner_delivery_rate_profiles(category_id)
where category_id is not null;

create index if not exists partner_delivery_rate_profiles_active_idx
on public.partner_delivery_rate_profiles(is_active);

drop trigger if exists partner_delivery_rate_profiles_set_updated_at on public.partner_delivery_rate_profiles;
create trigger partner_delivery_rate_profiles_set_updated_at
before update on public.partner_delivery_rate_profiles
for each row
execute function public.set_updated_at();

insert into public.partner_delivery_rate_profiles (
  category_id,
  name,
  service_type,
  minimum_fee,
  base_fee,
  base_km,
  per_km_fee,
  service_fee,
  is_manual_quote,
  is_active
)
select c.id, v.name, v.service_type, v.minimum_fee, v.base_fee, v.base_km, v.per_km_fee, v.service_fee, v.is_manual_quote, true
from (
  values
    ('restaurants-food', 'Food / Restaurant Delivery', 'food', 50::numeric, 50::numeric, 2::numeric, 8::numeric, 0::numeric, false),
    ('groceries', 'Grocery / Mini Mart Delivery', 'grocery', 70::numeric, 60::numeric, 2::numeric, 10::numeric, 0::numeric, false),
    ('medicine-pharmacy', 'Medicine / Pharmacy Delivery', 'medicine', 60::numeric, 60::numeric, 2::numeric, 10::numeric, 0::numeric, false),
    ('school-supplies', 'School Supplies Delivery', 'school_supplies', 60::numeric, 60::numeric, 2::numeric, 8::numeric, 0::numeric, false),
    ('errands', 'Errands / Personal Shopping', 'errands', 80::numeric, 80::numeric, 2::numeric, 10::numeric, 30::numeric, false),
    ('tours', 'Tours / Special Trip Quote', 'manual_quote', 0::numeric, 0::numeric, 0::numeric, 0::numeric, 0::numeric, true)
) as v(category_slug, name, service_type, minimum_fee, base_fee, base_km, per_km_fee, service_fee, is_manual_quote)
join public.service_categories c on c.slug = v.category_slug
where not exists (
  select 1
  from public.partner_delivery_rate_profiles existing
  where existing.category_id = c.id
    and existing.partner_id is null
    and existing.subcategory_id is null
    and existing.service_type = v.service_type
);

insert into public.partner_delivery_rate_profiles (
  subcategory_id,
  name,
  service_type,
  minimum_fee,
  base_fee,
  base_km,
  per_km_fee,
  service_fee,
  is_manual_quote,
  is_active
)
select s.id, 'Heavy / Bulky Delivery', 'heavy_bulky', 100::numeric, 100::numeric, 2::numeric, 15::numeric, 0::numeric, false, true
from public.service_subcategories s
where s.slug in ('household-items', 'delivery-assistance')
  and not exists (
    select 1
    from public.partner_delivery_rate_profiles existing
    where existing.subcategory_id = s.id
      and existing.partner_id is null
      and existing.service_type = 'heavy_bulky'
  );

alter table public.partner_delivery_rate_profiles enable row level security;

drop policy if exists "Public can read active partner delivery rates" on public.partner_delivery_rate_profiles;
create policy "Public can read active partner delivery rates"
on public.partner_delivery_rate_profiles
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Admins can manage partner delivery rates" on public.partner_delivery_rate_profiles;
create policy "Admins can manage partner delivery rates"
on public.partner_delivery_rate_profiles
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create or replace function public.create_partner_order_with_items(
  p_partner_id uuid,
  p_customer_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_delivery_address text,
  p_delivery_lat numeric,
  p_delivery_lng numeric,
  p_notes text,
  p_payment_method text,
  p_items jsonb,
  p_delivery_fee numeric default null,
  p_service_fee numeric default null,
  p_total_amount numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  partner_record public.business_partners%rowtype;
  rate_record public.partner_delivery_rate_profiles%rowtype;
  item_record jsonb;
  product_record public.partner_products%rowtype;
  next_quantity integer;
  next_line_total numeric;
  order_subtotal numeric := 0;
  order_delivery_fee numeric := 50;
  order_service_fee numeric := 0;
  order_distance_km numeric := null;
  new_order_id uuid;
  numeric_fee_match text[];
  safe_customer_id uuid := null;
  tracking_token text;
begin
  tracking_token := encode(extensions.gen_random_bytes(32), 'hex');

  if tracking_token is null or tracking_token = '' then
    tracking_token := md5(gen_random_uuid()::text || random()::text || clock_timestamp()::text);
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Partner order needs at least one item.';
  end if;

  if p_customer_id is not null
    and auth.uid() = p_customer_id
    and exists (select 1 from public.profiles where id = p_customer_id) then
    safe_customer_id := p_customer_id;
  end if;

  select *
  into partner_record
  from public.business_partners
  where id = p_partner_id
    and is_active = true
    and status = 'active'
    and restaurant_id is null;

  if not found then
    raise exception 'Partner shop is not available for generic checkout.';
  end if;

  select *
  into rate_record
  from public.partner_delivery_rate_profiles r
  where r.is_active = true
    and (
      r.partner_id = partner_record.id
      or (r.partner_id is null and r.subcategory_id = partner_record.subcategory_id)
      or (r.partner_id is null and r.subcategory_id is null and r.category_id = partner_record.category_id)
    )
  order by
    case
      when r.partner_id = partner_record.id then 1
      when r.subcategory_id = partner_record.subcategory_id then 2
      when r.category_id = partner_record.category_id then 3
      else 4
    end,
    r.created_at desc
  limit 1;

  numeric_fee_match := regexp_match(coalesce(partner_record.delivery_fee_label, ''), '([0-9]+(\.[0-9]+)?)');

  if found then
    order_service_fee := greatest(coalesce(rate_record.service_fee, 0), 0);

    if rate_record.is_manual_quote then
      order_delivery_fee := 0;
    elsif partner_record.latitude is not null
      and partner_record.longitude is not null
      and p_delivery_lat is not null
      and p_delivery_lng is not null then
      order_distance_km :=
        6371 * 2 * asin(
          sqrt(
            power(sin(radians((p_delivery_lat - partner_record.latitude) / 2)), 2)
            + cos(radians(partner_record.latitude))
            * cos(radians(p_delivery_lat))
            * power(sin(radians((p_delivery_lng - partner_record.longitude) / 2)), 2)
          )
        );
      order_delivery_fee := round((
        greatest(
          rate_record.minimum_fee,
          rate_record.base_fee + greatest(0, order_distance_km - rate_record.base_km) * rate_record.per_km_fee
        ) / 5
      )) * 5;
    else
      order_delivery_fee := greatest(
        coalesce(
          p_delivery_fee,
          case when numeric_fee_match is not null then (numeric_fee_match[1])::numeric else null end,
          rate_record.minimum_fee,
          50
        ),
        0
      );
    end if;
  else
    if numeric_fee_match is not null then
      order_delivery_fee := (numeric_fee_match[1])::numeric;
    elsif p_delivery_fee is not null then
      order_delivery_fee := greatest(p_delivery_fee, 0);
    end if;

    order_service_fee := greatest(coalesce(p_service_fee, 0), 0);
  end if;

  create temporary table temp_partner_order_items (
    product_id uuid,
    product_name text,
    product_description text,
    unit_price numeric,
    quantity integer,
    line_total numeric
  ) on commit drop;

  for item_record in select * from jsonb_array_elements(p_items)
  loop
    next_quantity := greatest(coalesce((item_record ->> 'quantity')::integer, 1), 1);

    select *
    into product_record
    from public.partner_products
    where id = (item_record ->> 'product_id')::uuid
      and partner_id = p_partner_id
      and is_active = true
      and is_available = true;

    if not found then
      raise exception 'A product in this order is no longer available.';
    end if;

    next_line_total := product_record.price * next_quantity;
    order_subtotal := order_subtotal + next_line_total;

    insert into temp_partner_order_items (
      product_id,
      product_name,
      product_description,
      unit_price,
      quantity,
      line_total
    )
    values (
      product_record.id,
      product_record.name,
      product_record.description,
      product_record.price,
      next_quantity,
      next_line_total
    );
  end loop;

  insert into public.partner_orders (
    partner_id,
    customer_id,
    customer_name,
    customer_phone,
    delivery_address,
    delivery_lat,
    delivery_lng,
    notes,
    payment_method,
    subtotal,
    delivery_fee,
    service_fee,
    total_amount,
    status,
    partner_status,
    customer_tracking_token,
    customer_tracking_token_created_at
  )
  values (
    p_partner_id,
    safe_customer_id,
    nullif(trim(coalesce(p_customer_name, '')), ''),
    nullif(trim(coalesce(p_customer_phone, '')), ''),
    nullif(trim(coalesce(p_delivery_address, '')), ''),
    p_delivery_lat,
    p_delivery_lng,
    nullif(trim(coalesce(p_notes, '')), ''),
    coalesce(nullif(trim(coalesce(p_payment_method, '')), ''), 'cash'),
    order_subtotal,
    order_delivery_fee,
    order_service_fee,
    order_subtotal + order_delivery_fee + order_service_fee,
    'pending',
    'new',
    tracking_token,
    now()
  )
  returning id into new_order_id;

  insert into public.partner_order_items (
    partner_order_id,
    product_id,
    product_name,
    product_description,
    unit_price,
    quantity,
    line_total
  )
  select
    new_order_id,
    product_id,
    product_name,
    product_description,
    unit_price,
    quantity,
    line_total
  from temp_partner_order_items;

  insert into public.partner_order_notifications (
    partner_id,
    partner_order_id,
    notification_type,
    title,
    message,
    status,
    created_at
  )
  values (
    p_partner_id,
    new_order_id,
    'new_partner_order',
    'New partner order',
    'A new partner order is waiting for ' || partner_record.name || '.',
    'unread',
    now()
  )
  on conflict do nothing;

  return jsonb_build_object(
    'order_id', new_order_id,
    'customer_tracking_token', tracking_token,
    'delivery_fee', order_delivery_fee,
    'service_fee', order_service_fee,
    'total_amount', order_subtotal + order_delivery_fee + order_service_fee
  );
end;
$$;

revoke all on function public.create_partner_order_with_items(
  uuid,
  uuid,
  text,
  text,
  text,
  numeric,
  numeric,
  text,
  text,
  jsonb,
  numeric,
  numeric,
  numeric
) from public;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'grant execute on function public.create_partner_order_with_items(uuid, uuid, text, text, text, numeric, numeric, text, text, jsonb, numeric, numeric, numeric) to anon';
  end if;

  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'grant execute on function public.create_partner_order_with_items(uuid, uuid, text, text, text, numeric, numeric, text, text, jsonb, numeric, numeric, numeric) to authenticated';
  end if;
end $$;
