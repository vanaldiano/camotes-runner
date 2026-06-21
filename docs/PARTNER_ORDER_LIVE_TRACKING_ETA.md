# Partner Order Live Tracking and ETA

Phase 8F.1 makes generic partner orders feel closer to the existing food delivery tracking flow while keeping partner checkout, admin assignment, and rider jobs separate from restaurant food orders.

## Tracking Flow

Generic partner orders are created through the Phase 8E checkout RPC. Admin can assign a rider from the partner order tools, and the rider app can then see partner delivery jobs alongside ride and food jobs.

When a rider accepts or starts a partner order job, the rider app publishes location rows with `rider_locations.partner_order_id`. The customer Partner Order Detail screen reads the latest location for that partner order and also subscribes to realtime location updates when available. Polling remains active as a fallback because guest tracking and row-level security can make realtime delivery inconsistent on some clients.

## Pickup and Delivery ETA

ETA follows the current partner order status:

- `pending`: the customer sees a waiting-for-confirmation state.
- `accepted` and `preparing`: ETA is calculated from the rider location to the partner shop, when partner coordinates are available.
- `picked_up` and `on_the_way`: ETA is calculated from the rider location to the delivery coordinates, when delivery coordinates are available.
- `completed`: the order is shown as delivered.
- `cancelled`: the order is shown as cancelled.

If rider location is missing, the app shows `Waiting for rider location...`. If the needed shop or delivery coordinates are missing, the app shows `ETA unavailable` instead of blocking tracking.

## Map Links

Phase 8F.1 uses external Google Maps links only. It does not add a native or embedded map.

The customer Partner Order Detail screen can open:

- rider location
- rider-to-shop route
- rider-to-delivery route
- delivery location

Routes appear only when both origin and destination coordinates are available.

## Comparison With Food Delivery Tracking

Food orders and partner orders now share the same customer expectation:

- current status
- assigned rider state
- live rider location when available
- ETA copy
- route actions
- polling fallback

Partner orders still use the generic partner order tables and guest tracking token flow. Restaurant food orders remain unchanged.

## Production Hardening

Future phases can improve this foundation with:

- richer partner shop coordinate quality checks
- rider name and phone display once safe public/customer read rules are finalized
- customer push notifications for partner order status changes
- real-time reliability monitoring
- route-aware ETA from a maps provider instead of Haversine distance
- partner order tracking integration in the rider dispatch workflow
