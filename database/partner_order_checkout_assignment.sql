-- Camotes Runner Phase 8E: Generic Partner Cart/Checkout + Unified Admin Assignment
-- Safe to run more than once. Adds non-restaurant partner orders without changing food_orders or ride bookings.

create extension if not exists pgcrypto;

create table if not exists public.partner_orders (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.business_partners(id),
  customer_id uuid references public.profiles(id),
  assigned_rider_id uuid references public.riders(id),
  customer_name text,
  customer_phone text,
  delivery_address text,
  delivery_lat numeric,
  delivery_lng numeric,
  notes text,
  payment_method text default 'cash',
  subtotal numeric not null default 0,
  delivery_fee numeric not null default 0,
  service_fee numeric not null default 0,
  total_amount numeric not null default 0,
  status text not null default 'pending',
  partner_status text not null default 'new',
  rider_status text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  assigned_at timestamptz,
  accepted_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz
);

alter table public.partner_orders add column if not exists partner_id uuid;
alter table public.partner_orders add column if not exists customer_id uuid;
alter table public.partner_orders add column if not exists assigned_rider_id uuid;
alter table public.partner_orders add column if not exists customer_name text;
alter table public.partner_orders add column if not exists customer_phone text;
alter table public.partner_orders add column if not exists delivery_address text;
alter table public.partner_orders add column if not exists delivery_lat numeric;
alter table public.partner_orders add column if not exists delivery_lng numeric;
alter table public.partner_orders add column if not exists notes text;
alter table public.partner_orders add column if not exists payment_method text default 'cash';
alter table public.partner_orders add column if not exists subtotal numeric not null default 0;
alter table public.partner_orders add column if not exists delivery_fee numeric not null default 0;
alter table public.partner_orders add column if not exists service_fee numeric not null default 0;
alter table public.partner_orders add column if not exists total_amount numeric not null default 0;
alter table public.partner_orders add column if not exists status text not null default 'pending';
alter table public.partner_orders add column if not exists partner_status text not null default 'new';
alter table public.partner_orders add column if not exists rider_status text;
alter table public.partner_orders add column if not exists created_at timestamptz default now();
alter table public.partner_orders add column if not exists updated_at timestamptz default now();
alter table public.partner_orders add column if not exists assigned_at timestamptz;
alter table public.partner_orders add column if not exists accepted_at timestamptz;
alter table public.partner_orders add column if not exists completed_at timestamptz;
alter table public.partner_orders add column if not exists cancelled_at timestamptz;

update public.partner_orders set payment_method = 'cash' where payment_method is null;
update public.partner_orders set subtotal = 0 where subtotal is null;
update public.partner_orders set delivery_fee = 0 where delivery_fee is null;
update public.partner_orders set service_fee = 0 where service_fee is null;
update public.partner_orders set total_amount = subtotal + delivery_fee + service_fee where total_amount is null;
update public.partner_orders set status = 'pending' where status is null;
update public.partner_orders set partner_status = 'new' where partner_status is null;
update public.partner_orders set created_at = now() where created_at is null;
update public.partner_orders set updated_at = now() where updated_at is null;

alter table public.partner_orders alter column payment_method set default 'cash';
alter table public.partner_orders alter column subtotal set default 0;
alter table public.partner_orders alter column subtotal set not null;
alter table public.partner_orders alter column delivery_fee set default 0;
alter table public.partner_orders alter column delivery_fee set not null;
alter table public.partner_orders alter column service_fee set default 0;
alter table public.partner_orders alter column service_fee set not null;
alter table public.partner_orders alter column total_amount set default 0;
alter table public.partner_orders alter column total_amount set not null;
alter table public.partner_orders alter column status set default 'pending';
alter table public.partner_orders alter column status set not null;
alter table public.partner_orders alter column partner_status set default 'new';
alter table public.partner_orders alter column partner_status set not null;
alter table public.partner_orders alter column created_at set default now();
alter table public.partner_orders alter column updated_at set default now();

do $$
begin
  if not exists (select 1 from public.partner_orders where partner_id is null) then
    alter table public.partner_orders alter column partner_id set not null;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'partner_orders_partner_id_fkey') then
    alter table public.partner_orders
    add constraint partner_orders_partner_id_fkey
    foreign key (partner_id) references public.business_partners(id);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'partner_orders_customer_id_fkey') then
    alter table public.partner_orders
    add constraint partner_orders_customer_id_fkey
    foreign key (customer_id) references public.profiles(id);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'partner_orders_assigned_rider_id_fkey') then
    alter table public.partner_orders
    add constraint partner_orders_assigned_rider_id_fkey
    foreign key (assigned_rider_id) references public.riders(id);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'partner_orders_status_check') then
    alter table public.partner_orders
    add constraint partner_orders_status_check
    check (status in ('pending', 'accepted', 'preparing', 'picked_up', 'on_the_way', 'completed', 'cancelled'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'partner_orders_amounts_nonnegative_check') then
    alter table public.partner_orders
    add constraint partner_orders_amounts_nonnegative_check
    check (subtotal >= 0 and delivery_fee >= 0 and service_fee >= 0 and total_amount >= 0);
  end if;
end $$;

create table if not exists public.partner_order_items (
  id uuid primary key default gen_random_uuid(),
  partner_order_id uuid not null references public.partner_orders(id) on delete cascade,
  product_id uuid references public.partner_products(id) on delete set null,
  product_name text not null,
  product_description text,
  unit_price numeric not null default 0,
  quantity integer not null default 1,
  line_total numeric not null default 0,
  created_at timestamptz default now()
);

alter table public.partner_order_items add column if not exists partner_order_id uuid;
alter table public.partner_order_items add column if not exists product_id uuid;
alter table public.partner_order_items add column if not exists product_name text;
alter table public.partner_order_items add column if not exists product_description text;
alter table public.partner_order_items add column if not exists unit_price numeric not null default 0;
alter table public.partner_order_items add column if not exists quantity integer not null default 1;
alter table public.partner_order_items add column if not exists line_total numeric not null default 0;
alter table public.partner_order_items add column if not exists created_at timestamptz default now();

update public.partner_order_items set product_name = 'Unknown product' where product_name is null;
update public.partner_order_items set unit_price = 0 where unit_price is null;
update public.partner_order_items set quantity = 1 where quantity is null;
update public.partner_order_items set line_total = unit_price * quantity where line_total is null;
update public.partner_order_items set created_at = now() where created_at is null;

alter table public.partner_order_items alter column product_name set not null;
alter table public.partner_order_items alter column unit_price set default 0;
alter table public.partner_order_items alter column unit_price set not null;
alter table public.partner_order_items alter column quantity set default 1;
alter table public.partner_order_items alter column quantity set not null;
alter table public.partner_order_items alter column line_total set default 0;
alter table public.partner_order_items alter column line_total set not null;
alter table public.partner_order_items alter column created_at set default now();

do $$
begin
  if not exists (select 1 from public.partner_order_items where partner_order_id is null) then
    alter table public.partner_order_items alter column partner_order_id set not null;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'partner_order_items_partner_order_id_fkey') then
    alter table public.partner_order_items
    add constraint partner_order_items_partner_order_id_fkey
    foreign key (partner_order_id) references public.partner_orders(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'partner_order_items_product_id_fkey') then
    alter table public.partner_order_items
    add constraint partner_order_items_product_id_fkey
    foreign key (product_id) references public.partner_products(id) on delete set null;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'partner_order_items_quantity_positive_check') then
    alter table public.partner_order_items
    add constraint partner_order_items_quantity_positive_check
    check (quantity > 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'partner_order_items_amounts_nonnegative_check') then
    alter table public.partner_order_items
    add constraint partner_order_items_amounts_nonnegative_check
    check (unit_price >= 0 and line_total >= 0);
  end if;
end $$;

create table if not exists public.partner_order_status_logs (
  id uuid primary key default gen_random_uuid(),
  partner_order_id uuid not null references public.partner_orders(id) on delete cascade,
  old_status text,
  new_status text not null,
  changed_by text,
  note text,
  created_at timestamptz default now()
);

alter table public.partner_order_status_logs add column if not exists partner_order_id uuid;
alter table public.partner_order_status_logs add column if not exists old_status text;
alter table public.partner_order_status_logs add column if not exists new_status text;
alter table public.partner_order_status_logs add column if not exists changed_by text;
alter table public.partner_order_status_logs add column if not exists note text;
alter table public.partner_order_status_logs add column if not exists created_at timestamptz default now();

update public.partner_order_status_logs set new_status = 'pending' where new_status is null;
update public.partner_order_status_logs set created_at = now() where created_at is null;

alter table public.partner_order_status_logs alter column new_status set not null;
alter table public.partner_order_status_logs alter column created_at set default now();

do $$
begin
  if not exists (select 1 from public.partner_order_status_logs where partner_order_id is null) then
    alter table public.partner_order_status_logs alter column partner_order_id set not null;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'partner_order_status_logs_partner_order_id_fkey') then
    alter table public.partner_order_status_logs
    add constraint partner_order_status_logs_partner_order_id_fkey
    foreign key (partner_order_id) references public.partner_orders(id) on delete cascade;
  end if;
end $$;

alter table public.partner_order_notifications add column if not exists partner_order_id uuid;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'partner_order_notifications_partner_order_id_fkey') then
    alter table public.partner_order_notifications
    add constraint partner_order_notifications_partner_order_id_fkey
    foreign key (partner_order_id) references public.partner_orders(id) on delete cascade;
  end if;
end $$;

alter table public.partner_order_notifications
drop constraint if exists partner_order_notifications_type_check;

alter table public.partner_order_notifications
add constraint partner_order_notifications_type_check
check (notification_type in ('new_order', 'order_update', 'new_partner_order'));

create index if not exists partner_orders_partner_id_idx
on public.partner_orders(partner_id);

create index if not exists partner_orders_assigned_rider_id_idx
on public.partner_orders(assigned_rider_id);

create index if not exists partner_orders_status_idx
on public.partner_orders(status);

create index if not exists partner_orders_created_at_idx
on public.partner_orders(created_at desc);

create index if not exists partner_order_items_partner_order_id_idx
on public.partner_order_items(partner_order_id);

create index if not exists partner_order_status_logs_partner_order_id_idx
on public.partner_order_status_logs(partner_order_id);

create index if not exists partner_order_notifications_partner_order_id_idx
on public.partner_order_notifications(partner_order_id);

do $$
begin
  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and indexname = 'partner_order_notifications_partner_order_type_uidx'
  )
  and not exists (
    select 1
    from public.partner_order_notifications
    where partner_order_id is not null
    group by partner_order_id, notification_type
    having count(*) > 1
  ) then
    execute 'create unique index partner_order_notifications_partner_order_type_uidx
      on public.partner_order_notifications(partner_order_id, notification_type)
      where partner_order_id is not null';
  end if;
end $$;

create or replace function public.set_partner_order_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists partner_orders_set_updated_at on public.partner_orders;
create trigger partner_orders_set_updated_at
before update on public.partner_orders
for each row
execute function public.set_partner_order_updated_at();

create or replace function public.log_partner_order_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.partner_order_status_logs (partner_order_id, old_status, new_status, changed_by, note)
    values (new.id, null, new.status, 'system', 'Partner order created.');
    return new;
  end if;

  if old.status is distinct from new.status then
    insert into public.partner_order_status_logs (partner_order_id, old_status, new_status, changed_by, note)
    values (new.id, old.status, new.status, 'system', 'Partner order status changed.');
  end if;

  return new;
end;
$$;

drop trigger if exists partner_orders_status_log_changes on public.partner_orders;
create trigger partner_orders_status_log_changes
after insert or update of status on public.partner_orders
for each row
execute function public.log_partner_order_status_change();

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
returns uuid
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
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Partner order needs at least one item.';
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
    partner_status
  )
  values (
    p_partner_id,
    p_customer_id,
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
    'new'
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

  return new_order_id;
end;
$$;

revoke all on function public.create_partner_order_with_items(uuid, uuid, text, text, text, numeric, numeric, text, text, jsonb) from public;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'grant execute on function public.create_partner_order_with_items(uuid, uuid, text, text, text, numeric, numeric, text, text, jsonb) to anon';
  end if;

  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'grant execute on function public.create_partner_order_with_items(uuid, uuid, text, text, text, numeric, numeric, text, text, jsonb) to authenticated';
  end if;
end $$;

alter table public.partner_orders enable row level security;
alter table public.partner_order_items enable row level security;
alter table public.partner_order_status_logs enable row level security;

drop policy if exists "Customers can read own partner orders" on public.partner_orders;
create policy "Customers can read own partner orders"
on public.partner_orders
for select
to authenticated
using (customer_id = auth.uid());

drop policy if exists "Admins can manage partner orders" on public.partner_orders;
create policy "Admins can manage partner orders"
on public.partner_orders
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Partner users can manage own partner orders" on public.partner_orders;
create policy "Partner users can manage own partner orders"
on public.partner_orders
for all
to authenticated
using (public.is_partner_user(partner_id))
with check (public.is_partner_user(partner_id));

drop policy if exists "Riders can read assigned partner orders" on public.partner_orders;
create policy "Riders can read assigned partner orders"
on public.partner_orders
for select
to authenticated
using (
  exists (
    select 1
    from public.riders r
    where r.id = assigned_rider_id
      and r.auth_user_id = auth.uid()
  )
);

drop policy if exists "Customers can read own partner order items" on public.partner_order_items;
create policy "Customers can read own partner order items"
on public.partner_order_items
for select
to authenticated
using (
  exists (
    select 1
    from public.partner_orders po
    where po.id = partner_order_id
      and po.customer_id = auth.uid()
  )
);

drop policy if exists "Admins can manage partner order items" on public.partner_order_items;
create policy "Admins can manage partner order items"
on public.partner_order_items
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Partner users can read own partner order items" on public.partner_order_items;
create policy "Partner users can read own partner order items"
on public.partner_order_items
for select
to authenticated
using (
  exists (
    select 1
    from public.partner_orders po
    where po.id = partner_order_id
      and public.is_partner_user(po.partner_id)
  )
);

drop policy if exists "Customers can read own partner order status logs" on public.partner_order_status_logs;
create policy "Customers can read own partner order status logs"
on public.partner_order_status_logs
for select
to authenticated
using (
  exists (
    select 1
    from public.partner_orders po
    where po.id = partner_order_id
      and po.customer_id = auth.uid()
  )
);

drop policy if exists "Admins can read partner order status logs" on public.partner_order_status_logs;
create policy "Admins can read partner order status logs"
on public.partner_order_status_logs
for select
to authenticated
using (public.is_admin());

drop policy if exists "Partner users can read own partner order status logs" on public.partner_order_status_logs;
create policy "Partner users can read own partner order status logs"
on public.partner_order_status_logs
for select
to authenticated
using (
  exists (
    select 1
    from public.partner_orders po
    where po.id = partner_order_id
      and public.is_partner_user(po.partner_id)
  )
);

-- Customer checkout uses create_partner_order_with_items(...). Direct notification writes remain blocked.
