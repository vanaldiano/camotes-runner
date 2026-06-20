-- Camotes Runner Phase 8C: Partner New Order Notifications
-- Safe to run more than once. Adds partner/admin order awareness without changing rider assignment or checkout behavior.

create extension if not exists pgcrypto;

alter table public.food_orders add column if not exists partner_id uuid references public.business_partners(id) on delete set null;
alter table public.food_orders add column if not exists partner_notification_status text not null default 'pending';
alter table public.food_orders add column if not exists partner_notified_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'food_orders_partner_id_fkey'
  ) then
    alter table public.food_orders
    add constraint food_orders_partner_id_fkey
    foreign key (partner_id) references public.business_partners(id) on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'food_orders_partner_notification_status_check'
  ) then
    alter table public.food_orders
    add constraint food_orders_partner_notification_status_check
    check (partner_notification_status in ('pending', 'sent', 'failed', 'skipped'));
  end if;
end $$;

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

alter table public.partner_order_notifications add column if not exists partner_id uuid;
alter table public.partner_order_notifications add column if not exists food_order_id uuid;
alter table public.partner_order_notifications add column if not exists notification_type text not null default 'new_order';
alter table public.partner_order_notifications add column if not exists title text;
alter table public.partner_order_notifications add column if not exists message text;
alter table public.partner_order_notifications add column if not exists status text not null default 'unread';
alter table public.partner_order_notifications add column if not exists created_at timestamptz not null default now();
alter table public.partner_order_notifications add column if not exists read_at timestamptz;

update public.partner_order_notifications
set notification_type = 'new_order'
where notification_type is null;

update public.partner_order_notifications
set title = 'Partner order update'
where title is null;

update public.partner_order_notifications
set message = 'A partner order needs attention.'
where message is null;

update public.partner_order_notifications
set status = 'unread'
where status is null;

update public.partner_order_notifications
set created_at = now()
where created_at is null;

alter table public.partner_order_notifications alter column notification_type set default 'new_order';
alter table public.partner_order_notifications alter column notification_type set not null;
alter table public.partner_order_notifications alter column title set not null;
alter table public.partner_order_notifications alter column message set not null;
alter table public.partner_order_notifications alter column status set default 'unread';
alter table public.partner_order_notifications alter column status set not null;
alter table public.partner_order_notifications alter column created_at set default now();
alter table public.partner_order_notifications alter column created_at set not null;

do $$
begin
  if not exists (
    select 1
    from public.partner_order_notifications
    where partner_id is null
  ) then
    alter table public.partner_order_notifications alter column partner_id set not null;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'partner_order_notifications_partner_id_fkey'
  ) then
    alter table public.partner_order_notifications
    add constraint partner_order_notifications_partner_id_fkey
    foreign key (partner_id) references public.business_partners(id) on delete cascade;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'partner_order_notifications_food_order_id_fkey'
  ) then
    alter table public.partner_order_notifications
    add constraint partner_order_notifications_food_order_id_fkey
    foreign key (food_order_id) references public.food_orders(id) on delete cascade;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'partner_order_notifications_status_check'
  ) then
    alter table public.partner_order_notifications
    add constraint partner_order_notifications_status_check
    check (status in ('unread', 'read', 'archived'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'partner_order_notifications_type_check'
  ) then
    alter table public.partner_order_notifications
    add constraint partner_order_notifications_type_check
    check (notification_type in ('new_order', 'order_update'));
  end if;
end $$;

create index if not exists food_orders_partner_id_idx
on public.food_orders(partner_id);

create index if not exists partner_order_notifications_partner_status_idx
on public.partner_order_notifications(partner_id, status, created_at desc);

create index if not exists partner_order_notifications_food_order_id_idx
on public.partner_order_notifications(food_order_id);

update public.food_orders fo
set partner_id = bp.id
from public.business_partners bp
where fo.partner_id is null
  and fo.restaurant_id = bp.restaurant_id
  and bp.restaurant_id is not null;

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

alter table public.partner_order_notifications enable row level security;

drop policy if exists "Admins can manage partner order notifications" on public.partner_order_notifications;
create policy "Admins can manage partner order notifications"
on public.partner_order_notifications
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Partner users can view own order notifications" on public.partner_order_notifications;
create policy "Partner users can view own order notifications"
on public.partner_order_notifications
for select
to authenticated
using (public.is_partner_user(partner_id));

drop policy if exists "Partner users can update own order notifications" on public.partner_order_notifications;
create policy "Partner users can update own order notifications"
on public.partner_order_notifications
for update
to authenticated
using (public.is_partner_user(partner_id))
with check (public.is_partner_user(partner_id));

-- Existing food_orders policies are preserved. Admin/partner notification policies are conservative:
-- customers do not get access to partner_order_notifications, and partner users only see linked partner rows.
