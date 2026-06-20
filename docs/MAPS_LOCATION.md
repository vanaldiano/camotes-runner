# Maps & Location MVP

Phase 7C adds location capture for customer rides and food delivery while preserving manual address entry.

## Packages

Installed with Expo-compatible versions:

- `expo-location`
- `react-native-maps`

`expo-location` is used in the MVP for current-location capture. `react-native-maps` is installed for native map support and future map picker screens.

## App Config

`app.json` includes the `expo-location` config plugin with the foreground permission message:

```text
Allow Camotes Runner to use your location for pickup and delivery.
```

## Database

Run:

```sql
database/maps_location.sql
```

The migration adds nullable coordinate fields:

Bookings:

- `pickup_lat`
- `pickup_lng`
- `destination_lat`
- `destination_lng`

Food orders:

- `delivery_lat`
- `delivery_lng`

The same columns are also reflected in the main schema files:

- `database/schema.sql`
- `database/food_menu_schema.sql`

## Customer Booking

The booking form still accepts manual pickup and destination text.

New location behavior:

- Pickup has **Use Current Location**
- Destination has **Use Current Location**
- Coordinates are stored only if permission is granted and native location succeeds
- The app checks `getLastKnownPositionAsync` first with a 10-second maximum age, which helps Android Emulator use the GPS fix already visible in Google Maps or Chrome
- If no recent last known position exists, the app calls `getCurrentPositionAsync` with balanced accuracy, a 10-second `maximumAge`, and a 15-second timeout where supported
- Current-location capture also has an app-level 15-second timeout so the button cannot stay stuck on **Locating...**
- Reverse geocoding runs after coordinates are received and times out after 10 seconds
- If reverse geocoding fails or times out, coordinates are still saved and the fallback label is `Selected location`
- Manual text remains the fallback and is still saved to `pickup_location` and `destination`

Saved fields:

- `bookings.pickup_location`
- `bookings.pickup_lat`
- `bookings.pickup_lng`
- `bookings.destination`
- `bookings.destination_lat`
- `bookings.destination_lng`

Insert verification:

- `booking-screen.tsx` keeps pickup and destination coordinates in form state as `LocationPoint`
- The booking creation request is typed as `CreateBookingInput`
- `booking-service.ts` normalizes missing coordinate values to `null` and inserts the same payload into Supabase
- Before insert, the console logs `BOOKING_COORDINATES_PAYLOAD` with `pickup_lat`, `pickup_lng`, `destination_lat`, and `destination_lng`

## Food Checkout

Food checkout still accepts a manual delivery address.

New location behavior:

- Delivery has **Use Current Location**
- Coordinates are stored if available
- The app checks `getLastKnownPositionAsync` first with a 10-second maximum age
- If no recent last known position exists, the app calls `getCurrentPositionAsync` with balanced accuracy, a 10-second `maximumAge`, and a 15-second timeout where supported
- Current-location capture also has an app-level 15-second timeout
- Reverse geocoding times out after 10 seconds
- If reverse geocoding fails or times out, coordinates are still saved and the fallback label is `Selected location`
- Manual address remains the fallback

Saved fields:

- `food_orders.delivery_location`
- `food_orders.delivery_lat`
- `food_orders.delivery_lng`

Insert verification:

- `food-checkout-screen.tsx` keeps delivery coordinates in form state as `LocationPoint`
- The food order creation request is typed as `CreateFoodOrderInput`
- `food-order-service.ts` normalizes missing coordinate values to `null` and inserts the same payload into Supabase
- Before insert, the console logs `FOOD_ORDER_COORDINATES_PAYLOAD` with `delivery_lat` and `delivery_lng`

## Rider App

Rider job cards now include Google Maps actions:

- Ride pickup opens pickup coordinates if available, otherwise searches the pickup text
- Ride destination opens destination coordinates if available, otherwise searches the destination text
- Food delivery opens delivery coordinates if available, otherwise searches the delivery address

## Admin Dashboard

Admin keeps showing the existing text address fields.

If coordinates are available, the dashboard shows them under the address text.

## Current MVP Limits

- This phase does not add a draggable map pin picker yet.
- Destination coordinates are captured through current location for now.
- Manual addresses remain supported and should be treated as the source of truth when coordinates are missing.
- Google Maps opening depends on the device/browser being able to open Google Maps URLs.

## Location Debug Logs

The location service logs these Expo Go troubleshooting events in the console:

- Permission requested
- Permission granted or denied
- Location request started
- Coordinates received
- Reverse geocode started
- Reverse geocode success or failure
- `BOOKING_COORDINATES_PAYLOAD` before booking insert
- `FOOD_ORDER_COORDINATES_PAYLOAD` before food order insert

## Future Work

- Add full map picker screens for pickup and destination.
- Add route preview and estimated distance/fare from coordinates.
- Save rider live location while online.
