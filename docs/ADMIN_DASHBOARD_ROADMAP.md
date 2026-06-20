# Admin Dashboard Roadmap

This document plans the future Camotes Runner admin dashboard. Do not build this inside the customer mobile app yet.

## Goal

Create an admin dashboard for operators to manage bookings and monitor Camotes Runner activity.

Core admin capabilities:

- View all bookings
- Filter bookings by status
- View customer pickup, destination, notes, payment method, and fare details
- Update booking status
- Assign riders later
- View total income

## Recommended Build Direction

Build the admin dashboard as a separate web app later, not inside the customer mobile app.

Suggested options:

- Expo Router web admin route group in a separate app shell
- Next.js dashboard connected to the same Supabase project
- Supabase dashboard for temporary manual operations during early testing

For now, keep the customer app focused on booking and tracking.

## Phase 1: Data Foundation

Use the existing Supabase tables:

- `profiles`: customer information
- `riders`: rider information and availability
- `bookings`: core booking records
- `booking_status_logs`: status history
- `fare_settings`: fare configuration

Add admin policies from `database/admin_policies.sql` after authentication and admin roles are ready.

## Phase 2: Booking Management

Admin dashboard screen requirements:

- Booking list table
- Status filter:
  - `pending`
  - `accepted`
  - `runner_arriving`
  - `in_progress`
  - `completed`
  - `cancelled`
- Booking detail view:
  - Customer name and phone
  - Pickup location
  - Destination
  - Service type
  - Notes
  - Payment method
  - Estimated fare
  - Final fare
  - Assigned rider
  - Status timeline

## Phase 3: Status Updates

Admin should be able to update booking status.

When status changes:

1. Update `bookings.status`.
2. Update `bookings.updated_at`.
3. Insert a new row into `booking_status_logs`.

This keeps a clean audit trail for support and future customer notifications.

## Phase 4: Rider Assignment

Add rider assignment after basic booking management works.

Admin should be able to:

- View available riders
- Assign a rider to a booking
- Change rider assignment
- See rider motorcycle model, plate number, rating, and availability

## Phase 5: Income Dashboard

Show simple income metrics:

- Total completed booking income
- Income by day
- Income by service type
- Pending versus completed bookings
- Cancelled booking count

Use `bookings.final_fare` when available, otherwise fall back to `bookings.estimated_fare`.

## Phase 6: Production Security

Before production:

- Add Supabase Auth
- Add a role system for admins
- Enable Row Level Security on all tables
- Restrict admin access using policies
- Keep service-role keys out of frontend apps
- Add logs for sensitive admin actions

## Current Status

Admin UI is not built yet. The customer mobile app continues to use the existing mock simulation and partial Supabase booking insert.
