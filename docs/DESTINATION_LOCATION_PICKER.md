# Destination Location Picker MVP

Phase 7E.1 adds preset destination coordinates to ride booking so pickup and destination do not accidentally use the same current location.

## Booking Screen

Pickup still supports:

- manual address entry
- **Use Current Location**

Destination now supports:

- manual address entry
- preset Camotes destination places
- optional **Use Current Location Instead**

Manual edits clear the stored coordinates for that field. Coordinates are saved only when the customer chooses current location or a preset destination.

## MVP Destination Presets

- Consuelo Port: `10.6365167, 124.2980967`
- San Francisco Town Center: `10.6460, 124.3510`
- San Francisco Market: `10.6881, 124.4020`
- Santiago Bay: `10.5900, 124.3200`
- Poro Town Center: `10.6290, 124.4080`
- Tudela Town Center: `10.6380, 124.4720`

When a preset is selected, the booking screen sets:

- destination text
- `destination_lat`
- `destination_lng`

The existing coordinate debug row confirms the selected destination coordinates.

## Validation

If pickup and destination coordinates are the same or within 50 meters, the booking screen shows:

```text
Pickup and destination look the same. Please choose a different destination.
```

The app logs:

- `DESTINATION_PRESET_SELECTED`
- `BOOKING_PICKUP_DESTINATION_COORDINATES`
- `BOOKING_COORDINATE_VALIDATION_WARNING`

Manual address-only bookings remain supported. Phase 7E ETA hides safely when destination coordinates are missing.

## Tracking And ETA

Customer tracking already reads pickup and destination coordinates from the saved booking row.

When a preset destination is saved, Phase 7E uses that selected destination coordinate for rider-to-destination ETA and Google Maps route buttons.

Native MapView remains disabled. The safe map placeholder stays in place.

## Admin Dashboard

The admin dashboard already shows pickup and destination coordinates when available.

## Verification

Run:

```bash
npx tsc --noEmit
npm run lint
npx expo export --platform web
cd admin && npm run build
```

