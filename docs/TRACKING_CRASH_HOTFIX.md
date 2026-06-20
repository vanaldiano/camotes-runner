# Tracking Crash Hotfix

## Issue

In the Android APK, the customer app could force close when pressing **Track** on a ride booking.

The likely crash point was the native `react-native-maps` preview added to the tracking screen for Phase 7D live rider location.

## Hotfix

Native `MapView` rendering is temporarily disabled in the tracking screen.

The app still keeps the safe live rider location UI:

- rider latitude
- rider longitude
- last updated time
- **Open Rider Location in Google Maps**

The Supabase live rider location logic remains enabled:

- rider location sharing still writes to `rider_locations`
- customer tracking still fetches the latest rider location
- realtime subscription still listens for `rider_locations`
- 5-second polling fallback still runs

## Defensive Checks

The tracking screen now only renders the live rider location section when rider latitude and longitude are valid finite numbers.

The map placeholder never renders when coordinates are missing, undefined, null, or `NaN`.

## Debug Logs

The tracking screen logs:

- `TRACK_SCREEN_OPENED`
- `TRACK_RIDER_LOCATION_STATE`
- `TRACK_MAP_SKIPPED_SAFE_MODE`

## Next Step

Re-enable the native map preview after the Android Google Maps native configuration is stable for APK builds.

