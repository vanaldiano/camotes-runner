-- Camotes Runner Phase 7C: Maps and location support.
-- Run after database/schema.sql and database/food_menu_schema.sql.

alter table public.bookings
add column if not exists pickup_lat numeric(10, 7);

alter table public.bookings
add column if not exists pickup_lng numeric(10, 7);

alter table public.bookings
add column if not exists destination_lat numeric(10, 7);

alter table public.bookings
add column if not exists destination_lng numeric(10, 7);

alter table public.food_orders
add column if not exists delivery_lat numeric(10, 7);

alter table public.food_orders
add column if not exists delivery_lng numeric(10, 7);
