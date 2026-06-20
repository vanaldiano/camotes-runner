-- Camotes Runner Supabase schema
-- This schema prepares the backend for the customer booking MVP.
-- Phase 6B introduces Supabase Auth while preserving guest-mode MVP flows.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text,
  email text,
  avatar_url text,
  push_token text,
  role text not null default 'customer',
  customer_since date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_role_check check (role in ('customer', 'rider', 'admin'))
);

create table if not exists public.riders (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
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

alter table public.profiles
add column if not exists role text not null default 'customer';

alter table public.profiles
add column if not exists push_token text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_role_check'
  ) then
    alter table public.profiles
    add constraint profiles_role_check
    check (role in ('customer', 'rider', 'admin'));
  end if;
end $$;

alter table public.riders
add column if not exists auth_user_id uuid unique;

alter table public.riders
add column if not exists push_token text;

create table if not exists public.notification_logs (
  id uuid primary key default gen_random_uuid(),
  recipient_type text not null,
  recipient_id uuid,
  push_token text,
  title text not null,
  body text not null,
  data jsonb not null default '{}'::jsonb,
  status text not null default 'queued',
  error_message text,
  created_at timestamptz not null default now(),
  constraint notification_logs_recipient_type_check check (
    recipient_type in ('customer', 'rider', 'admin', 'unknown')
  ),
  constraint notification_logs_status_check check (
    status in ('queued', 'sent', 'failed', 'skipped')
  )
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.profiles(id) on delete set null,
  rider_id uuid references public.riders(id) on delete set null,
  service_type text not null,
  pickup_location text not null,
  pickup_lat numeric(10, 7),
  pickup_lng numeric(10, 7),
  destination text not null,
  destination_lat numeric(10, 7),
  destination_lng numeric(10, 7),
  notes text,
  payment_method text not null default 'Cash',
  distance_km numeric(8, 2),
  base_fare numeric(10, 2) not null default 0,
  estimated_fare numeric(10, 2) not null default 0,
  fare_estimate numeric,
  final_fare numeric(10, 2),
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bookings_status_check check (
    status in ('pending', 'accepted', 'runner_arriving', 'in_progress', 'completed', 'cancelled')
  ),
  constraint bookings_payment_method_check check (payment_method in ('Cash', 'GCash'))
);

alter table public.bookings
add column if not exists pickup_lat numeric(10, 7);

alter table public.bookings
add column if not exists pickup_lng numeric(10, 7);

alter table public.bookings
add column if not exists destination_lat numeric(10, 7);

alter table public.bookings
add column if not exists destination_lng numeric(10, 7);

alter table public.bookings
add column if not exists fare_estimate numeric;

create table if not exists public.booking_status_logs (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  status text not null,
  message text,
  created_at timestamptz not null default now(),
  constraint booking_status_logs_status_check check (
    status in ('pending', 'accepted', 'runner_arriving', 'in_progress', 'completed', 'cancelled')
  )
);

create table if not exists public.fare_settings (
  id uuid primary key default gen_random_uuid(),
  service_type text not null unique,
  base_fare numeric(10, 2) not null,
  per_km_rate numeric(10, 2) not null,
  minimum_fare numeric(10, 2) not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.fare_settings (service_type, base_fare, per_km_rate, minimum_fare)
values
  ('Ride', 50, 15, 70),
  ('Groceries', 60, 12, 80),
  ('Medicine', 60, 12, 80),
  ('Documents', 50, 10, 65),
  ('Tours', 250, 35, 500),
  ('Errands', 50, 10, 70)
on conflict (service_type) do nothing;

create index if not exists bookings_customer_id_idx on public.bookings(customer_id);
create index if not exists bookings_rider_id_idx on public.bookings(rider_id);
create index if not exists bookings_status_idx on public.bookings(status);
create index if not exists riders_auth_user_id_idx on public.riders(auth_user_id);
create index if not exists notification_logs_recipient_id_idx
  on public.notification_logs(recipient_id);
create index if not exists booking_status_logs_booking_id_idx
  on public.booking_status_logs(booking_id);
