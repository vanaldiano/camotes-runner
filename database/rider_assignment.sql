-- Camotes Runner Phase 1: Rider Assignment
-- Run this after database/schema.sql to support assigning real riders to bookings.

create extension if not exists pgcrypto;

create table if not exists public.riders (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text,
  photo_url text,
  push_token text,
  motorcycle_model text not null,
  plate_number text not null,
  rating numeric(2, 1) not null default 5.0,
  is_available boolean not null default true,
  current_location text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bookings
add column if not exists assigned_rider_id uuid references public.riders(id) on delete set null;

create index if not exists bookings_assigned_rider_id_idx
on public.bookings(assigned_rider_id);

alter table public.riders enable row level security;

alter table public.riders
add column if not exists push_token text;
alter table public.bookings enable row level security;
alter table public.booking_status_logs enable row level security;

drop policy if exists "MVP can view riders" on public.riders;
create policy "MVP can view riders"
on public.riders
for select
to anon, authenticated
using (true);

drop policy if exists "MVP can create riders" on public.riders;
create policy "MVP can create riders"
on public.riders
for insert
to anon, authenticated
with check (true);

drop policy if exists "MVP can update riders" on public.riders;
create policy "MVP can update riders"
on public.riders
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "MVP can view bookings" on public.bookings;
create policy "MVP can view bookings"
on public.bookings
for select
to anon, authenticated
using (true);

drop policy if exists "MVP can create bookings" on public.bookings;
create policy "MVP can create bookings"
on public.bookings
for insert
to anon, authenticated
with check (true);

drop policy if exists "MVP can update bookings" on public.bookings;
create policy "MVP can update bookings"
on public.bookings
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "MVP can view booking status logs" on public.booking_status_logs;
create policy "MVP can view booking status logs"
on public.booking_status_logs
for select
to anon, authenticated
using (true);

drop policy if exists "MVP can create booking status logs" on public.booking_status_logs;
create policy "MVP can create booking status logs"
on public.booking_status_logs
for insert
to anon, authenticated
with check (true);

insert into public.riders (
  full_name,
  motorcycle_model,
  plate_number,
  rating,
  phone
)
select
  'Juan Dela Cruz',
  'Honda Click 125',
  'ABC 1234',
  4.9,
  '09123456789'
where not exists (
  select 1
  from public.riders
  where plate_number = 'ABC 1234'
);
