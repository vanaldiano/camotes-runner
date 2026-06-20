-- Camotes Runner Phase 8C RLS fix: create partner notifications from database-side logic.
-- Safe to run more than once. Keeps customer/mobile clients from writing partner_order_notifications directly.

create extension if not exists pgcrypto;

alter table public.food_orders add column if not exists partner_id uuid references public.business_partners(id) on delete set null;
alter table public.food_orders add column if not exists partner_notification_status text not null default 'pending';
alter table public.food_orders add column if not exists partner_notified_at timestamptz;

create table if not exists public.partner_order_notifications (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.business_partners(id) on delete cascade,
  food_order_id uuid references public.food_orders(id) on delete cascade,
  notification_type text not null default 'new_order',
  title text not null,
  message text not null,
  status text not null default 'unread',
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists partner_order_notifications_partner_status_idx
on public.partner_order_notifications(partner_id, status, created_at desc);

create index if not exists partner_order_notifications_food_order_id_idx
on public.partner_order_notifications(food_order_id);

do $$
begin
  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and indexname = 'partner_order_notifications_food_order_type_uidx'
  )
  and not exists (
    select 1
    from public.partner_order_notifications
    where food_order_id is not null
    group by food_order_id, notification_type
    having count(*) > 1
  ) then
    execute 'create unique index partner_order_notifications_food_order_type_uidx
      on public.partner_order_notifications(food_order_id, notification_type)
      where food_order_id is not null';
  end if;
end $$;

create or replace function public.create_partner_order_notification_for_food_order(
  target_food_order_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  order_record public.food_orders%rowtype;
  partner_record record;
  existing_notification_id uuid;
  inserted_notification_id uuid;
  notification_time timestamptz := now();
begin
  select *
  into order_record
  from public.food_orders
  where id = target_food_order_id;

  if not found then
    return null;
  end if;

  select id, name
  into partner_record
  from public.business_partners
  where restaurant_id = order_record.restaurant_id
    and is_active = true
  order by created_at asc nulls last, name asc
  limit 1;

  if not found then
    update public.food_orders
    set partner_notification_status = 'skipped',
        updated_at = notification_time
    where id = target_food_order_id
      and partner_id is null
      and partner_notification_status <> 'skipped';

    return null;
  end if;

  update public.food_orders
  set partner_id = partner_record.id,
      partner_notification_status = 'sent',
      partner_notified_at = coalesce(partner_notified_at, notification_time),
      updated_at = notification_time
  where id = target_food_order_id;

  select id
  into existing_notification_id
  from public.partner_order_notifications
  where food_order_id = target_food_order_id
    and notification_type = 'new_order'
  order by created_at asc
  limit 1;

  if existing_notification_id is not null then
    return existing_notification_id;
  end if;

  insert into public.partner_order_notifications (
    partner_id,
    food_order_id,
    notification_type,
    title,
    message,
    status,
    created_at
  )
  values (
    partner_record.id,
    target_food_order_id,
    'new_order',
    'New food order',
    'A new food order is waiting for ' || partner_record.name || '.',
    'unread',
    notification_time
  )
  returning id into inserted_notification_id;

  return inserted_notification_id;
exception
  when others then
    begin
      update public.food_orders
      set partner_notification_status = 'failed',
          updated_at = now()
      where id = target_food_order_id
        and partner_notification_status <> 'sent';
    exception
      when others then
        null;
    end;

    return null;
end;
$$;

create or replace function public.handle_food_order_partner_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.create_partner_order_notification_for_food_order(new.id);
  return new;
exception
  when others then
    begin
      update public.food_orders
      set partner_notification_status = 'failed',
          updated_at = now()
      where id = new.id
        and partner_notification_status <> 'sent';
    exception
      when others then
        null;
    end;

    return new;
end;
$$;

drop trigger if exists food_orders_partner_notification_after_insert on public.food_orders;
create trigger food_orders_partner_notification_after_insert
after insert on public.food_orders
for each row
execute function public.handle_food_order_partner_notification();

revoke all on function public.create_partner_order_notification_for_food_order(uuid) from public;
revoke all on function public.handle_food_order_partner_notification() from public;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on function public.create_partner_order_notification_for_food_order(uuid) from anon';
    execute 'revoke all on function public.handle_food_order_partner_notification() from anon';
  end if;

  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'revoke all on function public.create_partner_order_notification_for_food_order(uuid) from authenticated';
    execute 'revoke all on function public.handle_food_order_partner_notification() from authenticated';
  end if;
end $$;

do $$
declare
  pending_order record;
begin
  for pending_order in
    select fo.id
    from public.food_orders fo
    join public.business_partners bp
      on bp.restaurant_id = fo.restaurant_id
     and bp.restaurant_id is not null
     and bp.is_active = true
    where not exists (
      select 1
      from public.partner_order_notifications pon
      where pon.food_order_id = fo.id
        and pon.notification_type = 'new_order'
    )
      and coalesce(fo.partner_notification_status, 'pending') in ('pending', 'failed')
    order by fo.created_at asc
  loop
    perform public.create_partner_order_notification_for_food_order(pending_order.id);
  end loop;
end $$;

-- RLS remains intentionally closed to customer/mobile clients.
-- Admin and partner-user policies from database/partner_order_notifications.sql continue to govern reads/updates.
