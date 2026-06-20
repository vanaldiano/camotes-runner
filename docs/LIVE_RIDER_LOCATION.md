# Live Rider Location MVP

Phase 7D adds live rider GPS sharing for active ride bookings without redesigning the existing rider or customer tracking screens.

## Database

Run:

```sql
database/live_rider_location.sql
```

The migration creates `public.rider_locations`:

- `id`
- `rider_id`
- `booking_id`
- `latitude`
- `longitude`
- `heading`
- `speed`
- `updated_at`

Indexes are added for:

- `rider_id`
- `booking_id`

The table also has a unique constraint on:

- `rider_id`
- `booking_id`

This lets the rider app upsert one live location row per active rider and booking.

## MVP RLS

The migration enables row level security and adds permissive MVP policies:

- anon and authenticated users can select rider locations
- anon and authenticated users can insert rider locations
- anon and authenticated users can update rider locations

These policies match the current MVP style used by bookings and food orders.

## Realtime

The migration adds `rider_locations` to the Supabase realtime publication when the `supabase_realtime` publication exists.

The app also keeps 5-second polling fallbacks so tracking still works if realtime is unavailable.

## Rider Mode

Rider Mode now has a **Share Live Location** toggle inside the rider profile card.

When enabled:

- the app requests foreground location permission
- the rider must have an active ride booking with status `accepted`, `runner_arriving`, or `in_progress`
- the app updates `rider_locations` every 10 seconds
- updates use Supabase upsert on `rider_id,booking_id`

Live location updates stop when:

- the toggle is turned off
- there is no active ride booking
- the active booking becomes completed or cancelled

Food delivery assignment remains unchanged in this phase.

## Customer Tracking

The existing tracking screen keeps the status timeline.

When the booking has an assigned rider:

- the screen fetches the latest rider location for the booking
- the screen subscribes to realtime `rider_locations` updates
- the screen polls every 5 seconds as a fallback

The customer sees:

- rider coordinates
- last updated time
- **Open Rider Location in Google Maps**
- native map preview with pickup, destination, and rider markers when `react-native-maps` is available

On web export, the map preview shows a simple fallback message because `react-native-maps` is native-only.

## Admin Dashboard

The admin bookings table now shows **Rider Location**.

For active bookings, this displays the latest rider location timestamp when available. Empty rows show `No live location`.

The admin dashboard refreshes this value from:

- booking polling
- booking realtime changes
- rider location realtime changes

## Current MVP Limits

- This is foreground tracking only.
- The rider must keep the app open while sharing location.
- Food delivery live rider location can reuse the same pattern later with a food-order location table or a shared job-location table.
- The customer map preview is intentionally simple: pickup, destination, and rider markers only.

## Verification

Run:

```bash
npx tsc --noEmit
npm run lint
npx expo export --platform web
cd admin && npm run build
```

