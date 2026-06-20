-- Camotes Runner Phase 2: Restaurant and Food Menu Module
-- Planning/database preparation only. Run after database/schema.sql.

create extension if not exists pgcrypto;

create table if not exists public.restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  category text not null default 'Food',
  address text not null,
  delivery_fee numeric(10, 2) not null default 50,
  estimated_delivery_time text not null default '35-45 min',
  phone text,
  image_url text,
  opening_hours text,
  estimated_prep_minutes integer not null default 20,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint menu_categories_restaurant_name_key unique (restaurant_id, name)
);

create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  category_id uuid not null references public.menu_categories(id) on delete cascade,
  name text not null,
  description text,
  price numeric(10, 2) not null,
  image_url text,
  is_available boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint menu_items_price_check check (price >= 0),
  constraint menu_items_restaurant_name_key unique (restaurant_id, name)
);

alter table public.restaurants
add column if not exists image_url text;

alter table public.restaurants
add column if not exists category text not null default 'Food';

alter table public.restaurants
add column if not exists delivery_fee numeric(10, 2) not null default 50;

alter table public.restaurants
add column if not exists estimated_delivery_time text not null default '35-45 min';

alter table public.menu_items
add column if not exists image_url text;

create table if not exists public.food_orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.profiles(id) on delete set null,
  restaurant_id uuid not null references public.restaurants(id) on delete restrict,
  assigned_rider_id uuid references public.riders(id) on delete set null,
  delivery_location text not null,
  delivery_lat numeric(10, 7),
  delivery_lng numeric(10, 7),
  customer_name text,
  customer_phone text,
  notes text,
  payment_method text not null default 'Cash',
  subtotal numeric(10, 2) not null default 0,
  delivery_fee numeric(10, 2) not null default 0,
  total_amount numeric(10, 2) not null default 0,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint food_orders_payment_method_check check (payment_method in ('Cash', 'GCash')),
  constraint food_orders_status_check check (
    status in (
      'pending',
      'accepted',
      'preparing',
      'picked_up',
      'on_the_way',
      'delivered',
      'cancelled'
    )
  ),
  constraint food_orders_subtotal_check check (subtotal >= 0),
  constraint food_orders_delivery_fee_check check (delivery_fee >= 0),
  constraint food_orders_total_amount_check check (total_amount >= 0)
);

alter table public.food_orders
add column if not exists assigned_rider_id uuid references public.riders(id) on delete set null;

alter table public.food_orders
add column if not exists delivery_lat numeric(10, 7);

alter table public.food_orders
add column if not exists delivery_lng numeric(10, 7);

create table if not exists public.food_order_items (
  id uuid primary key default gen_random_uuid(),
  food_order_id uuid not null references public.food_orders(id) on delete cascade,
  menu_item_id uuid references public.menu_items(id) on delete set null,
  item_name text not null,
  quantity integer not null default 1,
  unit_price numeric(10, 2) not null,
  line_total numeric(10, 2) not null,
  notes text,
  created_at timestamptz not null default now(),
  constraint food_order_items_quantity_check check (quantity > 0),
  constraint food_order_items_unit_price_check check (unit_price >= 0),
  constraint food_order_items_line_total_check check (line_total >= 0)
);

create table if not exists public.food_order_status_logs (
  id uuid primary key default gen_random_uuid(),
  food_order_id uuid not null references public.food_orders(id) on delete cascade,
  status text not null,
  message text,
  created_at timestamptz not null default now(),
  constraint food_order_status_logs_status_check check (
    status in (
      'pending',
      'accepted',
      'preparing',
      'picked_up',
      'on_the_way',
      'delivered',
      'cancelled'
    )
  )
);

update public.food_orders
set status = 'picked_up',
    updated_at = now()
where status = 'ready_for_pickup';

update public.food_order_status_logs
set status = 'picked_up'
where status = 'ready_for_pickup';

alter table public.food_orders
drop constraint if exists food_orders_status_check;

alter table public.food_orders
add constraint food_orders_status_check check (
  status in (
    'pending',
    'accepted',
    'preparing',
    'picked_up',
    'on_the_way',
    'delivered',
    'cancelled'
  )
);

alter table public.food_order_status_logs
drop constraint if exists food_order_status_logs_status_check;

alter table public.food_order_status_logs
add constraint food_order_status_logs_status_check check (
  status in (
    'pending',
    'accepted',
    'preparing',
    'picked_up',
    'on_the_way',
    'delivered',
    'cancelled'
  )
);

create index if not exists menu_categories_restaurant_id_idx
on public.menu_categories(restaurant_id);

create index if not exists menu_items_restaurant_id_idx
on public.menu_items(restaurant_id);

create index if not exists menu_items_category_id_idx
on public.menu_items(category_id);

create index if not exists food_orders_restaurant_id_idx
on public.food_orders(restaurant_id);

create index if not exists food_orders_assigned_rider_id_idx
on public.food_orders(assigned_rider_id);

create index if not exists food_orders_status_idx
on public.food_orders(status);

create index if not exists food_order_items_food_order_id_idx
on public.food_order_items(food_order_id);

create index if not exists food_order_status_logs_food_order_id_idx
on public.food_order_status_logs(food_order_id);

alter table public.restaurants enable row level security;
alter table public.menu_categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.food_orders enable row level security;
alter table public.food_order_items enable row level security;
alter table public.food_order_status_logs enable row level security;

drop policy if exists "MVP can view restaurants" on public.restaurants;
create policy "MVP can view restaurants"
on public.restaurants
for select
to anon, authenticated
using (true);

drop policy if exists "MVP can create restaurants" on public.restaurants;
create policy "MVP can create restaurants"
on public.restaurants
for insert
to anon, authenticated
with check (true);

drop policy if exists "MVP can update restaurants" on public.restaurants;
create policy "MVP can update restaurants"
on public.restaurants
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "MVP can view menu categories" on public.menu_categories;
create policy "MVP can view menu categories"
on public.menu_categories
for select
to anon, authenticated
using (true);

drop policy if exists "MVP can create menu categories" on public.menu_categories;
create policy "MVP can create menu categories"
on public.menu_categories
for insert
to anon, authenticated
with check (true);

drop policy if exists "MVP can update menu categories" on public.menu_categories;
create policy "MVP can update menu categories"
on public.menu_categories
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "MVP can view menu items" on public.menu_items;
create policy "MVP can view menu items"
on public.menu_items
for select
to anon, authenticated
using (true);

drop policy if exists "MVP can create menu items" on public.menu_items;
create policy "MVP can create menu items"
on public.menu_items
for insert
to anon, authenticated
with check (true);

drop policy if exists "MVP can update menu items" on public.menu_items;
create policy "MVP can update menu items"
on public.menu_items
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "MVP can view food orders" on public.food_orders;
create policy "MVP can view food orders"
on public.food_orders
for select
to anon, authenticated
using (true);

drop policy if exists "MVP can create food orders" on public.food_orders;
create policy "MVP can create food orders"
on public.food_orders
for insert
to anon, authenticated
with check (true);

drop policy if exists "MVP can update food orders" on public.food_orders;
create policy "MVP can update food orders"
on public.food_orders
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "MVP can view food order items" on public.food_order_items;
create policy "MVP can view food order items"
on public.food_order_items
for select
to anon, authenticated
using (true);

drop policy if exists "MVP can create food order items" on public.food_order_items;
create policy "MVP can create food order items"
on public.food_order_items
for insert
to anon, authenticated
with check (true);

drop policy if exists "MVP can update food order items" on public.food_order_items;
create policy "MVP can update food order items"
on public.food_order_items
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "MVP can view food order status logs" on public.food_order_status_logs;
create policy "MVP can view food order status logs"
on public.food_order_status_logs
for select
to anon, authenticated
using (true);

drop policy if exists "MVP can create food order status logs" on public.food_order_status_logs;
create policy "MVP can create food order status logs"
on public.food_order_status_logs
for insert
to anon, authenticated
with check (true);

do $$
declare
  m_cafe_id uuid;
  burger_category_id uuid;
  rice_meal_category_id uuid;
  drinks_category_id uuid;
begin
  insert into public.restaurants (
    name,
    description,
    category,
    address,
    delivery_fee,
    estimated_delivery_time,
    phone,
    opening_hours,
    estimated_prep_minutes
  )
  values (
    'M Cafe',
    'Local cafe meals, burgers, rice meals, and cold drinks.',
    'Cafe',
    'Camotes Island',
    50,
    '35-45 min',
    '09123456789',
    '8:00 AM - 8:00 PM',
    20
  )
  on conflict (name) do update set
    description = excluded.description,
    category = excluded.category,
    address = excluded.address,
    delivery_fee = excluded.delivery_fee,
    estimated_delivery_time = excluded.estimated_delivery_time,
    phone = excluded.phone,
    opening_hours = excluded.opening_hours,
    estimated_prep_minutes = excluded.estimated_prep_minutes,
    updated_at = now()
  returning id into m_cafe_id;

  insert into public.menu_categories (restaurant_id, name, display_order)
  values
    (m_cafe_id, 'Burger', 1),
    (m_cafe_id, 'Rice meal', 2),
    (m_cafe_id, 'Drinks', 3)
  on conflict (restaurant_id, name) do update set
    display_order = excluded.display_order,
    is_active = true,
    updated_at = now();

  select id into burger_category_id
  from public.menu_categories
  where restaurant_id = m_cafe_id and name = 'Burger';

  select id into rice_meal_category_id
  from public.menu_categories
  where restaurant_id = m_cafe_id and name = 'Rice meal';

  select id into drinks_category_id
  from public.menu_categories
  where restaurant_id = m_cafe_id and name = 'Drinks';

  insert into public.menu_items (
    restaurant_id,
    category_id,
    name,
    description,
    price,
    display_order
  )
  values
    (
      m_cafe_id,
      burger_category_id,
      'M Cafe Burger',
      'Classic burger with cheese and house sauce.',
      120,
      1
    ),
    (
      m_cafe_id,
      rice_meal_category_id,
      'Chicken Rice Meal',
      'Chicken rice meal with side and sauce.',
      150,
      1
    ),
    (
      m_cafe_id,
      drinks_category_id,
      'Iced Tea',
      'Refreshing house iced tea.',
      45,
      1
    )
  on conflict (restaurant_id, name) do update set
    category_id = excluded.category_id,
    description = excluded.description,
    price = excluded.price,
    display_order = excluded.display_order,
    is_available = true,
    updated_at = now();
end $$;
