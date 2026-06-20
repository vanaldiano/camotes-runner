# Coordinate Insert Audit

## Summary

Coordinates are passed through the app using the same Supabase column names:

- `pickup_lat`
- `pickup_lng`
- `destination_lat`
- `destination_lng`

No field renaming was found in the booking screen or booking service.

## Added Runtime Logs

The booking flow now logs each stage:

- `BOOKING_SCREEN_COORDINATES`: emitted in `booking-screen.tsx` before submit payload creation.
- `BOOKING_SERVICE_INPUT`: emitted when `createBooking` is called.
- `BOOKING_COORDINATES_PAYLOAD`: emitted before Supabase insert with the four coordinate fields.
- `BOOKING_SUPABASE_INSERT_OBJECT`: emitted before Supabase insert with the exact object sent to Supabase.
- `BOOKING_INSERT_RESULT`: emitted immediately after Supabase insert with `{ data, error }`.

## Screen Payload Audit

`src/screens/booking-screen.tsx` stores captured coordinates in:

- `pickupCoordinates`
- `destinationCoordinates`

The Supabase booking payload is typed as `CreateBookingInput` and includes:

```ts
destination_lat: destinationCoordinates?.latitude ?? null
destination_lng: destinationCoordinates?.longitude ?? null
pickup_lat: pickupCoordinates?.latitude ?? null
pickup_lng: pickupCoordinates?.longitude ?? null
```

## Service Payload Audit

`src/services/booking-service.ts` receives `CreateBookingInput`, logs the exact input, then normalizes missing coordinate values to `null`.

The exact object sent to Supabase includes:

```ts
destination_lat: booking.destination_lat ?? null
destination_lng: booking.destination_lng ?? null
pickup_lat: booking.pickup_lat ?? null
pickup_lng: booking.pickup_lng ?? null
```

## Type Audit

`src/types/database.ts` includes all coordinate fields for `bookings.Row`, `bookings.Insert`, and `bookings.Update`:

- `pickup_lat`
- `pickup_lng`
- `destination_lat`
- `destination_lng`

## Local Database Audit

Local SQL files define the coordinate columns:

- `database/schema.sql`
- `database/maps_location.sql`

Local booking RLS policies are permissive MVP policies in `database/rider_assignment.sql`.

No local trigger or default was found that overwrites booking coordinate columns.

## Production Column Check

A live Supabase select was run against:

```text
id,pickup_lat,pickup_lng,destination_lat,destination_lng
```

Result: success. The production `bookings` table exposes all four coordinate columns through the Supabase API.

## Hardcoded Insert Test

A hardcoded booking insert was run with:

```json
{
  "pickup_lat": 10.123456,
  "pickup_lng": 124.654321,
  "destination_lat": 10.123456,
  "destination_lng": 124.654321
}
```

Inserted booking id:

```text
b327ab31-1836-46fa-98ae-3695bc376a9f
```

Supabase insert result:

```json
{
  "pickup_lat": 10.123456,
  "pickup_lng": 124.654321,
  "destination_lat": 10.123456,
  "destination_lng": 124.654321
}
```

Read-back result by id:

```json
{
  "pickup_lat": 10.123456,
  "pickup_lng": 124.654321,
  "destination_lat": 10.123456,
  "destination_lng": 124.654321
}
```

Finding: production Supabase stores coordinate values correctly when they are present in the insert object.

## RLS, Trigger, And Default Findings

- RLS does not rewrite row values; it can allow or reject statements.
- The live hardcoded insert was allowed and stored non-null coordinates.
- The live read-back returned the same non-null coordinates.
- Based on the live insert result, production RLS, triggers, and defaults are not overwriting these coordinate columns during insert.

## Current Most Likely Cause

Because the production table stores hardcoded coordinates correctly, the latest app-created row with `NULL` coordinates most likely means the app submitted `null` coordinate values at booking time.

The next emulator booking should be checked in console logs:

- If `BOOKING_SCREEN_COORDINATES` is `null`, the issue is screen state before submit.
- If `BOOKING_SCREEN_COORDINATES` has numbers but `BOOKING_SERVICE_INPUT` is `null`, the issue is payload creation or function call.
- If `BOOKING_COORDINATES_PAYLOAD` has numbers but `BOOKING_INSERT_RESULT.data` returns `null`, re-check the active Supabase project and table.
- If all app logs show numbers and Supabase still shows `NULL`, confirm Expo Go is running the latest bundle and connected to the same Supabase project being inspected.

