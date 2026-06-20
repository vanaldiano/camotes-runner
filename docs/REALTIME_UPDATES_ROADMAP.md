# Supabase Realtime Updates Roadmap

## Goal

Phase 3 adds Supabase Realtime subscriptions so customers and admins see status changes faster while keeping the existing polling logic as a safe fallback.

## MVP Scope

- Ride and errand tracking listens for changes to the active row in the `bookings` table.
- Food ordering stores the latest created `food_orders` row in app state and listens for changes to that order.
- Admin dashboard listens for changes to `bookings` and `food_orders`, then refreshes its existing tables.
- Existing 5-second polling remains active where status matters, so the app still works if Realtime is disabled, delayed, or blocked by network conditions.
- Subscriptions are cleaned up when screens or providers unmount.

## Supabase Setup

Realtime requires the relevant tables to be part of Supabase's Realtime publication.

For this phase, enable Realtime for:

- `bookings`
- `food_orders`

Optional later tables:

- `booking_status_logs`
- `food_order_items`
- `riders`

## Customer Ride and Errand Tracking

Current flow:

1. Customer creates a booking.
2. Supabase returns the booking id.
3. The booking id is stored in booking simulation state.
4. Tracking screen reads that id.
5. Tracking screen subscribes to `bookings` changes filtered by that id.
6. When status changes, the local tracking timeline updates.
7. If Realtime fails, the existing 5-second polling continues.

Supported booking statuses:

- `pending`
- `accepted`
- `runner_arriving`
- `in_progress`
- `completed`
- `cancelled`

## Customer Food Orders

Current flow:

1. Customer places a food order from checkout.
2. Supabase returns the created `food_orders` row.
3. The app stores that row as the current food order.
4. A provider subscribes to changes for that order id.
5. A 5-second polling backup keeps the current order fresh if Realtime fails.

This phase does not add a food tracking screen. It only prepares live food-order status state for the next phase.

Supported food statuses:

- `pending`
- `accepted`
- `preparing`
- `picked_up`
- `on_the_way`
- `delivered`
- `cancelled`

## Admin Dashboard

Current flow:

1. Dashboard loads bookings, riders, food orders, food order items, and restaurants.
2. Dashboard subscribes to all `bookings` table changes.
3. Dashboard subscribes to all `food_orders` table changes.
4. On each change, it refreshes the relevant table data.
5. A 5-second polling backup keeps both sections moving if Realtime is unavailable.

## Cleanup Rules

- Screens and providers must remove Supabase channels on unmount.
- Polling intervals must be cleared on unmount.
- Realtime errors should not block existing manual refresh or status update actions.

## Later Features

- Dedicated customer food-order tracking screen.
- Runner app subscriptions for assigned ride and food jobs.
- Restaurant dashboard for accepting and preparing food orders.
- Realtime rider location updates.
- Push notifications when status changes.
- Status history timeline from `booking_status_logs` and future `food_order_status_logs`.
