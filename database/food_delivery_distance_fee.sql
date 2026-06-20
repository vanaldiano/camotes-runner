-- Camotes Runner Phase 7E.3: Food delivery distance and fee estimates.
-- Run after database/food_menu_schema.sql and database/maps_location.sql.

alter table public.food_orders
add column if not exists delivery_distance_km numeric;

alter table public.food_orders
add column if not exists service_fee numeric;

alter table public.food_orders
add column if not exists order_subtotal numeric;

alter table public.food_orders
add column if not exists order_total numeric;

alter table public.restaurants
add column if not exists latitude numeric;

alter table public.restaurants
add column if not exists longitude numeric;

update public.restaurants
set latitude = coalesce(latitude, 10.6460),
    longitude = coalesce(longitude, 124.3510)
where name = 'M Cafe';

update public.restaurants
set latitude = coalesce(latitude, 10.6881),
    longitude = coalesce(longitude, 124.4020)
where name = 'Island Meals';

update public.restaurants
set latitude = coalesce(latitude, 10.6365167),
    longitude = coalesce(longitude, 124.2980967)
where name = 'Port Snacks';

update public.food_orders
set
  order_subtotal = coalesce(order_subtotal, subtotal),
  order_total = coalesce(order_total, total_amount)
where order_subtotal is null
   or order_total is null;
