# Phase 7E.3: Dynamic ETA Everywhere + Food Delivery Distance Fee

Phase 7E.3 removes fixed ETA text from real customer runner cards and adds MVP
food delivery pricing based on restaurant-to-customer distance.

## Customer Runner ETA

Real Supabase bookings now use `getCustomerRunnerCardEta` from
`src/services/customer-runner-eta-service.ts`.

Behavior:

- `pending`, `accepted`, `arriving`, `runner_arriving`: rider-to-pickup ETA.
- `in_progress`: rider-to-destination ETA.
- `completed`: `Completed`.
- `cancelled`: `Cancelled`.
- Missing live rider location or missing route coordinates: `Calculating...`.
- Simulation-only bookings can still use the mock runner ETA.

Screens using the shared helper:

- `src/screens/booking-tracking-screen.tsx`
- `src/screens/runner-found-screen.tsx`
- `src/screens/runner-matching-screen.tsx`

Logs:

- `CUSTOMER_RUNNER_CARD_ETA_INPUT`
- `CUSTOMER_RUNNER_CARD_ETA_RESULT`
- `CUSTOMER_RUNNER_CARD_ETA_FALLBACK`

## Food Delivery Distance Fee

Food checkout calculates shop-to-customer distance with the same Haversine
distance foundation used by ride ETA.

Service:

- `src/services/fare-service.ts`

Food helpers:

- `calculateFoodDeliveryDistanceKm(shopLat, shopLng, deliveryLat, deliveryLng)`
- `calculateFoodDeliveryFee(distanceKm)`
- `formatDeliveryFee(amount)`
- `formatFoodDistance(distanceKm)`

MVP pricing:

- Base delivery fee: PHP 40
- Per-km rate: PHP 6
- Minimum delivery fee: PHP 50
- Rounded to nearest PHP 5

If restaurant or delivery coordinates are missing, checkout shows
`To be confirmed`, saves nullable distance breakdown fields, and still allows
order creation for manual admin confirmation.

## Database

Run `database/food_delivery_distance_fee.sql` after the food menu and maps
location migrations.

Adds to `food_orders`:

- `delivery_distance_km numeric`
- `service_fee numeric`
- `order_subtotal numeric`
- `order_total numeric`

Adds to `restaurants`:

- `latitude numeric`
- `longitude numeric`

The migration also backfills `order_subtotal` from `subtotal` and `order_total`
from `total_amount` for existing rows.

## Display Surfaces

Customer:

- Food checkout shows delivery distance, delivery fee, and total.
- Cart no longer shows a fixed delivery fee before checkout.
- Food tracking shows saved delivery distance, delivery fee, and total.

Admin:

- Food orders table shows item subtotal, delivery distance, delivery fee, and
  total.
- Restaurant management supports optional latitude and longitude.

Logs:

- `FOOD_DELIVERY_FEE_INPUT`
- `FOOD_DELIVERY_FEE_RESULT`
- `FOOD_DELIVERY_FEE_SKIPPED_MISSING_COORDINATES`
- `FOOD_ORDER_DISTANCE_FEE_SAVED`
