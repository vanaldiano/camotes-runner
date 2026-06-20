# Unified Activity

Phase 6D adds one customer Activity screen for active ride bookings, active food orders, and completed history.

## Activity Sections

Activity is split into:

- Active
- History

Active ride statuses:

- `pending`
- `accepted`
- `runner_arriving`
- `in_progress`

Active food order statuses:

- `pending`
- `accepted`
- `preparing`
- `picked_up`
- `on_the_way`

History statuses:

- `completed`
- `delivered`
- `cancelled`

## Tracking

Each active item has a Track button:

- Ride bookings open `/tracking`.
- Food orders open `/food-tracking`.

When a customer taps Track, Activity restores the selected Supabase row into the existing tracking context. This lets customers leave tracking, create another ride or food order, and later return to Activity to track any active item.

## Data Loading

If a customer is signed in, Activity loads:

- bookings where `customer_id` matches the auth user
- food orders where `customer_id` matches the auth user

If the customer is in guest mode, Activity loads recent bookings and food orders for MVP testing.

## Realtime

Activity listens to changes on:

- `bookings`
- `food_orders`

Realtime refreshes the Activity list while the screen is focused. A 5-second polling fallback remains active if Realtime is unavailable.

Individual tracking screens keep their own existing Realtime subscriptions:

- ride tracking listens to the selected booking row
- food tracking listens to the selected food order row

## Preserved Flows

Phase 6D keeps these flows working:

- authentication
- ride booking and tracking
- food ordering and food status tracking
- rider assignment
- admin dashboard
- restaurant and menu management
- Supabase Realtime fallback behavior

## Verification

After implementation, verify:

- `npx tsc --noEmit`
- `npm run lint`
- `npx expo export --platform web`
- `cd admin && npm run build`
