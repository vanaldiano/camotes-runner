# Phase 7E.4: Food Order Live Rider Tracking MVP

Phase 7E.4 extends live rider GPS sharing from ride bookings to food delivery
orders.

## Database

Run `database/food_live_rider_tracking.sql` after:

- `database/live_rider_location.sql`
- `database/food_menu_schema.sql`

The migration updates `public.rider_locations`:

- Makes `booking_id` nullable so the same table can store non-ride tracking rows.
- Adds `food_order_id uuid references public.food_orders(id)`.
- Adds an index on `food_order_id`.
- Adds a unique constraint for `rider_id + food_order_id`.
- Adds a check requiring at least one tracking target: `booking_id` or
  `food_order_id`.

Ride tracking continues to use `booking_id`. Food delivery tracking uses
`food_order_id`.

## Rider App

The Rider Mode `Share Live Location` toggle now supports:

- Active ride jobs: `accepted`, `runner_arriving`, `in_progress`
- Active food orders: `accepted`, `preparing`, `picked_up`, `on_the_way`

When both job types exist, the MVP chooses one active target and does not crash.
Food orders with `on_the_way` are prioritized among food delivery jobs.

Publishing functions:

- `publishCurrentRiderLocation(riderId, bookingId)`
- `publishCurrentRiderFoodOrderLocation(riderId, foodOrderId)`

## Customer Food Tracking

`src/screens/food-order-tracking-screen.tsx` now shows live rider details when a
food order has `assigned_rider_id`:

- Rider latitude
- Rider longitude
- Last updated time
- Safe map placeholder
- Delivery ETA for `on_the_way`
- Open Rider Location in Google Maps
- Open Rider to Delivery Route in Google Maps

The screen keeps polling every 5 seconds and also subscribes to realtime
`rider_locations` rows filtered by `food_order_id`.

Defensive behavior:

- Missing assigned rider: hides the live rider section.
- Missing rider location: shows `Waiting for rider location...`.
- Missing delivery coordinates: hides route button and avoids ETA crashes.
- Delivered/cancelled orders stop live location tracking.
- Native MapView remains disabled.

## Tracking Actions

Food tracking actions now match the ride tracking UX:

- Active statuses (`pending`, `accepted`, `preparing`, `picked_up`,
  `on_the_way`) show both `Keep Tracking` and `Back to Home`.
- `Keep Tracking` stays on the current food tracking screen and does not mutate
  order state.
- `Back to Home` navigates to the customer home screen without clearing the
  active tracked food order, so the customer can reopen tracking later from
  Activity.
- `delivered` shows `Back to Home` and may also show `Order Again`.
- `cancelled` shows `Back to Home`.

## Admin

The admin food orders table now shows the latest rider location timestamp for
active food deliveries when available. Existing food distance and fee columns
remain unchanged.

## Logs

- `FOOD_LIVE_RIDER_LOCATION_FETCH`
- `FOOD_LIVE_RIDER_LOCATION_UPDATE`
- `FOOD_LIVE_RIDER_LOCATION_SUBSCRIBED`
- `FOOD_LIVE_RIDER_LOCATION_SKIPPED`
- `FOOD_DELIVERY_ETA_RESULT`
- `FOOD_RIDER_MAP_URL`
