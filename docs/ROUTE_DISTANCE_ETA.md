# Route Distance and ETA MVP

Phase 7E adds coordinate-based distance and ETA to customer tracking.

## Approach

This phase uses local math first:

- live rider coordinates from `rider_locations`
- pickup and destination coordinates from `bookings`
- Haversine distance calculation
- default motorcycle speed of 25 kph

No Google Maps API is required for ETA calculation.

Native `MapView` remains disabled from the tracking crash hotfix. The safe map placeholder stays in place until Android Google Maps native configuration is stable.

## Service

`src/services/eta-service.ts` provides:

- `calculateDistanceKm(fromLat, fromLng, toLat, toLng)`
- `estimateEtaMinutes(distanceKm, averageSpeedKph)`
- `formatDistance(distanceKm)`
- `formatEta(minutes)`

Defensive behavior:

- invalid, missing, string, or `NaN` coordinates return `null`
- invalid speed returns `null`
- ETA is at least 1 minute when distance is greater than 0

Debug logs:

- `ETA_CALCULATION_INPUT`
- `ETA_CALCULATION_RESULT`
- `ETA_SKIPPED_MISSING_COORDINATES`

## Customer Tracking

When rider location is available:

- `Pending`, `Accepted`, and `Runner Arriving` calculate rider to pickup distance
- `In Progress` calculates rider to destination distance
- `Completed` and `Cancelled` hide route ETA

The tracking screen shows:

- live rider latitude
- live rider longitude
- last updated time
- rider distance to pickup or destination
- estimated arrival time
- external Google Maps buttons

Google Maps buttons:

- Open Rider Location in Google Maps
- Open Pickup in Google Maps
- Open Destination in Google Maps
- Open Rider to Pickup Route in Google Maps
- Open Rider to Destination Route in Google Maps

Directions buttons use a Google Maps URL with `origin` and `destination` coordinates.

## Admin Dashboard

The admin booking table shows a simple active-booking ETA when enough data exists:

- `Rider to pickup: X km / X min`
- `Rider to destination: X km / X min`

If rider location or booking coordinates are missing, the dashboard shows `No ETA`.

## Current MVP Limits

- ETA is approximate and coordinate-based.
- Road distance, traffic, ferry delays, and turn-by-turn routing are not included.
- Google Maps native preview remains disabled in the APK for crash safety.

## Verification

Run:

```bash
npx tsc --noEmit
npm run lint
npx expo export --platform web
cd admin && npm run build
```

