-- Phase 8F: rider app support for assigned generic partner orders.
-- Safe to rerun. Does not delete or overwrite rider locations, bookings, food orders, or partner orders.

alter table public.rider_locations
alter column booking_id drop not null;

alter table public.rider_locations
add column if not exists partner_order_id uuid;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'rider_locations_partner_order_id_fkey') then
    alter table public.rider_locations
    add constraint rider_locations_partner_order_id_fkey
    foreign key (partner_order_id) references public.partner_orders(id) on delete cascade;
  end if;
end $$;

create index if not exists rider_locations_partner_order_id_idx
on public.rider_locations(partner_order_id);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'rider_locations_rider_partner_order_key') then
    alter table public.rider_locations
    add constraint rider_locations_rider_partner_order_key unique (rider_id, partner_order_id);
  end if;
end $$;

alter table public.rider_locations
drop constraint if exists rider_locations_has_tracking_target_check;

alter table public.rider_locations
add constraint rider_locations_has_tracking_target_check
check (
  booking_id is not null
  or food_order_id is not null
  or partner_order_id is not null
);

create or replace function public.get_assigned_partner_orders_for_rider(target_rider_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(order_payload order by (order_payload ->> 'updated_at') desc), '[]'::jsonb)
  from (
    select jsonb_build_object(
      'id', po.id,
      'partner_id', po.partner_id,
      'partner_name', coalesce(bp.name, 'Partner shop'),
      'partner_address', bp.address,
      'partner_latitude', bp.latitude,
      'partner_longitude', bp.longitude,
      'customer_id', po.customer_id,
      'customer_name', po.customer_name,
      'customer_phone', po.customer_phone,
      'delivery_address', po.delivery_address,
      'delivery_lat', po.delivery_lat,
      'delivery_lng', po.delivery_lng,
      'notes', po.notes,
      'payment_method', po.payment_method,
      'subtotal', po.subtotal,
      'delivery_fee', po.delivery_fee,
      'service_fee', po.service_fee,
      'total_amount', po.total_amount,
      'status', po.status,
      'partner_status', po.partner_status,
      'rider_status', po.rider_status,
      'assigned_rider_id', po.assigned_rider_id,
      'assigned_at', po.assigned_at,
      'accepted_at', po.accepted_at,
      'completed_at', po.completed_at,
      'cancelled_at', po.cancelled_at,
      'created_at', po.created_at,
      'updated_at', po.updated_at,
      'items', coalesce((
        select jsonb_agg(to_jsonb(poi) order by poi.created_at asc)
        from public.partner_order_items poi
        where poi.partner_order_id = po.id
      ), '[]'::jsonb)
    ) as order_payload
    from public.partner_orders po
    left join public.business_partners bp on bp.id = po.partner_id
    where po.assigned_rider_id = target_rider_id
  ) rows;
$$;

create or replace function public.update_partner_order_status_for_rider(
  target_partner_order_id uuid,
  target_rider_id uuid,
  next_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_order public.partner_orders%rowtype;
  now_value timestamptz := now();
begin
  if next_status not in ('accepted', 'picked_up', 'on_the_way', 'completed') then
    raise exception 'Unsupported rider partner order status.';
  end if;

  update public.partner_orders
  set
    status = next_status,
    rider_status = next_status,
    partner_status = case
      when next_status = 'accepted' then 'accepted'
      else partner_status
    end,
    accepted_at = case
      when next_status = 'accepted' and accepted_at is null then now_value
      else accepted_at
    end,
    completed_at = case
      when next_status = 'completed' then now_value
      else completed_at
    end,
    updated_at = now_value
  where id = target_partner_order_id
    and assigned_rider_id = target_rider_id
    and status <> 'cancelled'
  returning * into updated_order;

  if not found then
    raise exception 'Partner order is not assigned to this rider.';
  end if;

  return to_jsonb(updated_order);
end;
$$;

revoke all on function public.get_assigned_partner_orders_for_rider(uuid) from public;
revoke all on function public.update_partner_order_status_for_rider(uuid, uuid, text) from public;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'grant execute on function public.get_assigned_partner_orders_for_rider(uuid) to anon';
    execute 'grant execute on function public.update_partner_order_status_for_rider(uuid, uuid, text) to anon';
  end if;

  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'grant execute on function public.get_assigned_partner_orders_for_rider(uuid) to authenticated';
    execute 'grant execute on function public.update_partner_order_status_for_rider(uuid, uuid, text) to authenticated';
  end if;
end $$;
