-- Camotes Runner Phase 7E.2: Dynamic distance and fare estimates.
-- Run after database/schema.sql.

alter table public.bookings
add column if not exists distance_km numeric;

alter table public.bookings
add column if not exists fare_estimate numeric;
