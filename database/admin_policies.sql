-- Camotes Runner admin policy preparation
-- Run this only after Supabase Auth and admin roles are ready.
-- These policies are intentionally separate from schema.sql so the customer app keeps working during MVP setup.

alter table public.profiles enable row level security;
alter table public.riders enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_status_logs enable row level security;
alter table public.fare_settings enable row level security;

-- Temporary helper function for future admin role checks.
-- Recommended future setup:
-- 1. Set profiles.role to "admin" for dashboard users.
-- 2. Optionally mirror the role in app_metadata.role or user_metadata.role.
-- 3. Keep anon users restricted when moving past MVP guest mode.
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

-- Admins can view all customer profiles for booking support.
drop policy if exists "Admins can view profiles" on public.profiles;
create policy "Admins can view profiles"
on public.profiles
for select
to authenticated
using (public.is_admin());

-- Admins can view, create, and update riders.
drop policy if exists "Admins can view riders" on public.riders;
create policy "Admins can view riders"
on public.riders
for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins can create riders" on public.riders;
create policy "Admins can create riders"
on public.riders
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Admins can update riders" on public.riders;
create policy "Admins can update riders"
on public.riders
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Admins can view all bookings, filter by status in the dashboard, update statuses, and assign riders later.
drop policy if exists "Admins can view bookings" on public.bookings;
create policy "Admins can view bookings"
on public.bookings
for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins can update bookings" on public.bookings;
create policy "Admins can update bookings"
on public.bookings
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Admins can create and view status logs when updating booking status.
drop policy if exists "Admins can view booking status logs" on public.booking_status_logs;
create policy "Admins can view booking status logs"
on public.booking_status_logs
for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins can create booking status logs" on public.booking_status_logs;
create policy "Admins can create booking status logs"
on public.booking_status_logs
for insert
to authenticated
with check (public.is_admin());

-- Admins can manage fare settings for future fare configuration.
drop policy if exists "Admins can view fare settings" on public.fare_settings;
create policy "Admins can view fare settings"
on public.fare_settings
for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins can update fare settings" on public.fare_settings;
create policy "Admins can update fare settings"
on public.fare_settings
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Income dashboard query idea:
-- select coalesce(sum(coalesce(final_fare, estimated_fare)), 0) as total_income
-- from public.bookings
-- where status = 'completed';
