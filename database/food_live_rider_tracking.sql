-- Camotes Runner Phase 7E.4: Food order live rider tracking MVP.
-- Run after database/live_rider_location.sql and database/food_menu_schema.sql.

alter table public.rider_locations
alter column booking_id drop not null;

alter table public.rider_locations
add column if not exists food_order_id uuid references public.food_orders(id) on delete cascade;

create index if not exists rider_locations_food_order_id_idx
on public.rider_locations(food_order_id);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'rider_locations_rider_food_order_key'
  ) then
    alter table public.rider_locations
    add constraint rider_locations_rider_food_order_key unique (rider_id, food_order_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'rider_locations_has_tracking_target_check'
  ) then
    alter table public.rider_locations
    add constraint rider_locations_has_tracking_target_check
    check (booking_id is not null or food_order_id is not null);
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'rider_locations'
  ) then
    alter publication supabase_realtime add table public.rider_locations;
  end if;
end $$;
