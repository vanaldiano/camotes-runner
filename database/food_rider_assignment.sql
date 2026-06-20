-- Camotes Runner Phase 6C: Food order rider assignment.
-- Run this after database/schema.sql, database/rider_assignment.sql, and database/food_menu_schema.sql.

alter table public.food_orders
add column if not exists assigned_rider_id uuid references public.riders(id) on delete set null;

create index if not exists food_orders_assigned_rider_id_idx
on public.food_orders(assigned_rider_id);

drop policy if exists "Riders can view assigned food orders" on public.food_orders;
create policy "Riders can view assigned food orders"
on public.food_orders
for select
to authenticated
using (
  exists (
    select 1
    from public.riders
    where riders.id = food_orders.assigned_rider_id
      and riders.auth_user_id = auth.uid()
  )
);

drop policy if exists "Riders can update assigned food orders" on public.food_orders;
create policy "Riders can update assigned food orders"
on public.food_orders
for update
to authenticated
using (
  exists (
    select 1
    from public.riders
    where riders.id = food_orders.assigned_rider_id
      and riders.auth_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.riders
    where riders.id = food_orders.assigned_rider_id
      and riders.auth_user_id = auth.uid()
  )
);
