# Dynamic Fare Estimate MVP

Phase 7E.2 replaces the fixed ride estimate with a coordinate-based distance and fare estimate.

## Service

`src/services/fare-service.ts` provides:

- `calculateRideDistanceKm(pickupLat, pickupLng, destinationLat, destinationLng)`
- `calculateRideFare(distanceKm)`
- `formatFare(amount)`
- `formatDistance(distanceKm)`

Distance uses the existing Haversine calculation from `eta-service`.

## MVP Pricing

- Base fare: `PHP 50`
- Per km rate: `PHP 7`
- Minimum fare: `PHP 80`
- Fare is rounded to the nearest `PHP 5`

Invalid, missing, string, `NaN`, zero, or negative distances return `null` safely.

## Booking Screen

When pickup and destination coordinates are available, the booking form shows:

- `Distance estimate: X km`
- `Fare estimate: ₱X`

When coordinates are missing, the form shows:

```text
Fare estimate will be confirmed after location is selected.
```

Manual address-only bookings remain allowed. Admin can confirm fare manually when coordinates are missing.

If pickup and destination are the same or very close, the existing warning remains visible:

```text
Pickup and destination look the same. Please choose a different destination.
```

## Database

Run:

```sql
database/dynamic_fare_estimate.sql
```

The migration ensures:

- `bookings.distance_km`
- `bookings.fare_estimate`

The app also continues writing the legacy `bookings.estimated_fare` field for existing screens.

## Saved Values

When coordinates are available, booking insert saves:

- `distance_km`
- `fare_estimate`
- `estimated_fare`

Debug logs:

- `FARE_ESTIMATE_INPUT`
- `FARE_ESTIMATE_RESULT`
- `FARE_ESTIMATE_SKIPPED_MISSING_COORDINATES`
- `BOOKING_DISTANCE_FARE_SAVED`

## Tracking

Customer tracking displays saved distance and fare from the booking record.

Phase 7E rider ETA remains separate and still uses live rider location plus pickup/destination coordinates.

## Admin Dashboard

The admin bookings table shows:

- distance estimate
- fare estimate, preferring `final_fare`, then `fare_estimate`, then legacy `estimated_fare`

## Verification

Run:

```bash
npx tsc --noEmit
npm run lint
npx expo export --platform web
cd admin && npm run build
```
