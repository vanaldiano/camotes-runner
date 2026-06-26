-- Camotes Runner Phase 9A hotfix: payment submission RLS + transactional partner checkout.
-- Safe to run more than once.

create extension if not exists pgcrypto;

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

alter table public.order_payments enable row level security;

alter table public.order_payments
drop constraint if exists order_payments_order_type_check;

alter table public.order_payments
drop constraint if exists order_payments_status_check;

update public.order_payments
set order_type = case order_type
  when 'partner_order' then 'partner'
  when 'food_order' then 'food'
  else order_type
end
where order_type in ('partner_order', 'food_order');

alter table public.order_payments
add constraint order_payments_order_type_check
check (order_type in ('partner', 'food', 'ride'));

alter table public.order_payments
add constraint order_payments_status_check
check (status in (
  'pending_payment',
  'payment_submitted',
  'paid',
  'rejected',
  'refunded',
  'cash_on_delivery',
  'submitted',
  'pending'
));

drop policy if exists "Customers can submit manual payments" on public.order_payments;
create policy "Customers can submit manual payments"
on public.order_payments
for insert
to anon, authenticated
with check (
  order_type in ('partner', 'food', 'ride')
  and status in ('payment_submitted', 'pending_payment', 'submitted', 'pending')
  and confirmed_at is null
  and confirmed_by is null
  and amount >= 0
);

drop policy if exists "Admins can manage manual payments" on public.order_payments;
create policy "Admins can manage manual payments"
on public.order_payments
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
  p_total_amount numeric default null,
  p_payment_reference text default null
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
  order_total numeric;
  new_order_id uuid;
  numeric_fee_match text[];
  safe_customer_id uuid := null;
  safe_payment_method text := coalesce(nullif(trim(coalesce(p_payment_method, '')), ''), 'GCash');
  safe_payment_reference text := nullif(trim(coalesce(p_payment_reference, '')), '');
  safe_payment_status text;
  submitted_at timestamptz := now();
  tracking_token text;
begin
  tracking_token := encode(gen_random_bytes(32), 'hex');

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

  order_total := order_subtotal + order_delivery_fee + order_service_fee;
  safe_payment_status := case
    when safe_payment_reference is null then 'pending_payment'
    else 'payment_submitted'
  end;

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
    payment_reference,
    payment_status,
    payment_submitted_at,
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
    safe_payment_method,
    safe_payment_reference,
    safe_payment_status,
    case when safe_payment_reference is null then null else submitted_at end,
    order_subtotal,
    order_delivery_fee,
    order_service_fee,
    order_total,
    'pending',
    'new',
    tracking_token,
    submitted_at
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

  insert into public.order_payments (
    order_type,
    order_id,
    payment_method,
    amount,
    reference_number,
    status,
    submitted_at,
    updated_at
  )
  values (
    'partner',
    new_order_id,
    safe_payment_method,
    order_total,
    safe_payment_reference,
    safe_payment_status,
    submitted_at,
    submitted_at
  );

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
    submitted_at
  )
  on conflict do nothing;

  return jsonb_build_object(
    'order_id', new_order_id,
    'customer_tracking_token', tracking_token,
    'delivery_fee', order_delivery_fee,
    'service_fee', order_service_fee,
    'total_amount', order_total,
    'payment_status', safe_payment_status
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
  numeric,
  text
) from public;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'grant execute on function public.create_partner_order_with_items(uuid, uuid, text, text, text, numeric, numeric, text, text, jsonb, numeric, numeric, numeric, text) to anon';
  end if;

  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'grant execute on function public.create_partner_order_with_items(uuid, uuid, text, text, text, numeric, numeric, text, text, jsonb, numeric, numeric, numeric, text) to authenticated';
  end if;
end $$;
