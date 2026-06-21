-- Phase 8E.4: guest-safe partner order tracking tokens.
-- Safe to rerun. Does not delete or overwrite existing orders.

create extension if not exists pgcrypto;

alter table public.partner_orders
add column if not exists customer_tracking_token text;

alter table public.partner_orders
add column if not exists customer_tracking_token_created_at timestamptz default now();

alter table public.partner_orders
alter column customer_tracking_token_created_at set default now();

create index if not exists partner_orders_customer_tracking_token_idx
on public.partner_orders(id, customer_tracking_token)
where customer_tracking_token is not null;

drop function if exists public.create_partner_order_with_items(
  uuid,
  uuid,
  text,
  text,
  text,
  numeric,
  numeric,
  text,
  text,
  jsonb
);

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
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  partner_record public.business_partners%rowtype;
  item_record jsonb;
  product_record public.partner_products%rowtype;
  next_quantity integer;
  next_line_total numeric;
  order_subtotal numeric := 0;
  order_delivery_fee numeric := 50;
  order_service_fee numeric := 0;
  new_order_id uuid;
  numeric_fee_match text[];
  safe_customer_id uuid := null;
  tracking_token text := encode(gen_random_bytes(32), 'hex');
begin
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

  numeric_fee_match := regexp_match(coalesce(partner_record.delivery_fee_label, ''), '([0-9]+(\.[0-9]+)?)');

  if numeric_fee_match is not null then
    order_delivery_fee := (numeric_fee_match[1])::numeric;
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
    'customer_tracking_token', tracking_token
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
  jsonb
) from public;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'grant execute on function public.create_partner_order_with_items(uuid, uuid, text, text, text, numeric, numeric, text, text, jsonb) to anon';
  end if;

  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'grant execute on function public.create_partner_order_with_items(uuid, uuid, text, text, text, numeric, numeric, text, text, jsonb) to authenticated';
  end if;
end $$;

create or replace function public.get_partner_order_by_tracking_token(
  p_order_id uuid,
  p_tracking_token text
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select to_jsonb(order_row)
  from (
    select
      po.accepted_at,
      po.assigned_at,
      po.assigned_rider_id,
      po.cancelled_at,
      po.completed_at,
      po.created_at,
      po.customer_id,
      po.customer_name,
      po.customer_phone,
      po.customer_tracking_token,
      po.customer_tracking_token_created_at,
      po.delivery_address,
      po.delivery_fee,
      po.delivery_lat,
      po.delivery_lng,
      po.id,
      po.notes,
      po.partner_id,
      coalesce(bp.name, 'Partner shop') as partner_name,
      po.partner_status,
      po.payment_method,
      po.rider_status,
      po.service_fee,
      po.status,
      po.subtotal,
      po.total_amount,
      po.updated_at
    from public.partner_orders po
    left join public.business_partners bp on bp.id = po.partner_id
    where po.id = p_order_id
      and po.customer_tracking_token = nullif(trim(coalesce(p_tracking_token, '')), '')
    limit 1
  ) order_row;
$$;

create or replace function public.get_partner_order_items_by_tracking_token(
  p_order_id uuid,
  p_tracking_token text
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(to_jsonb(poi) order by poi.created_at asc), '[]'::jsonb)
  from public.partner_orders po
  join public.partner_order_items poi on poi.partner_order_id = po.id
  where po.id = p_order_id
    and po.customer_tracking_token = nullif(trim(coalesce(p_tracking_token, '')), '');
$$;

revoke all on function public.get_partner_order_by_tracking_token(uuid, text) from public;
revoke all on function public.get_partner_order_items_by_tracking_token(uuid, text) from public;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'grant execute on function public.get_partner_order_by_tracking_token(uuid, text) to anon';
    execute 'grant execute on function public.get_partner_order_items_by_tracking_token(uuid, text) to anon';
  end if;

  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'grant execute on function public.get_partner_order_by_tracking_token(uuid, text) to authenticated';
    execute 'grant execute on function public.get_partner_order_items_by_tracking_token(uuid, text) to authenticated';
  end if;
end $$;
