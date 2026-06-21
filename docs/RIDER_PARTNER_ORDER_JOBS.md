# Rider Partner Order Jobs

Phase 8F makes assigned generic partner orders visible in the Rider App alongside ride bookings and restaurant food deliveries.

Partner orders are different from food orders because they can come from groceries, pharmacy, school supplies, tours, errands, or other marketplace shops. The pickup point is the partner shop address and coordinates from `business_partners`. The delivery point is the customer delivery address and optional coordinates saved on `partner_orders`.

## Included in Phase 8F

- Rider App loads partner orders assigned through `partner_orders.assigned_rider_id`.
- Rider App shows partner shop name, pickup address, delivery address, customer contact, items, total, payment method, notes, and status.
- Rider can move assigned partner orders through the basic workflow:
  - Accepted
  - Picked Up
  - On The Way
  - Completed
- Rider App can open external Google Maps links for pickup, delivery, and pickup-to-delivery route.
- `rider_locations.partner_order_id` is prepared so rider live location can be associated with a partner order.

## Safety Model

Partner orders are not made publicly readable. The Rider App uses narrow database functions that only return or update orders assigned to the selected rider id. Customer guest tracking continues to use the order id plus tracking token path from Phase 8E.4.

## Phase 8F.1

Phase 8F.1 can expand customer-facing live tracking and ETA for partner orders. Phase 8F prepares the database and rider publishing path, but customer UI should still handle missing live rider location gracefully.
