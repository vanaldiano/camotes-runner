-- Camotes Runner Phase 7D: Live rider location tracking MVP.
-- Run after database/schema.sql and database/rider_assignment.sql.

create extension if not exists pgcrypto;

create table if not exists public.rider_locations (
  id uuid primary key default gen_random_uuid(),
  rider_id uuid not null references public.riders(id) on delete cascade,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  latitude numeric not null,
  longitude numeric not null,
  heading numeric,
  speed numeric,
  updated_at timestamptz not null default now(),
  constraint rider_locations_rider_booking_key unique (rider_id, booking_id)
);

create index if not exists rider_locations_rider_id_idx
on public.rider_locations(rider_id);

create index if not exists rider_locations_booking_id_idx
on public.rider_locations(booking_id);

alter table public.rider_locations enable row level security;

drop policy if exists "MVP can view rider locations" on public.rider_locations;
create policy "MVP can view rider locations"
on public.rider_locations
for select
to anon, authenticated
using (true);

drop policy if exists "MVP can create rider locations" on public.rider_locations;
create policy "MVP can create rider locations"
on public.rider_locations
for insert
to anon, authenticated
with check (true);

drop policy if exists "MVP can update rider locations" on public.rider_locations;
create policy "MVP can update rider locations"
on public.rider_locations
for update
to anon, authenticated
using (true)
with check (true);

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
