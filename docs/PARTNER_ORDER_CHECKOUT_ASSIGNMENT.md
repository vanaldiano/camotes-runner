# Phase 8E: Partner Order Checkout + Assignment

Phase 8E adds ordering for non-restaurant marketplace partners. Restaurant partners still use the existing restaurant menu, food cart, food checkout, `food_orders`, and food tracking flow.

## Generic Partner Order Flow

Customers browse a non-restaurant partner shop, add active and available `partner_products` to a separate partner cart, and submit checkout details. Checkout calls the database RPC `create_partner_order_with_items(...)`, which creates the order, snapshots items, logs the first status, and creates the partner notification.

The customer app does not directly insert into `partner_orders`, `partner_order_items`, `partner_order_status_logs`, or `partner_order_notifications`.

## How It Differs From Restaurant Orders

Restaurant food orders continue to use:

- `restaurants`
- `menu_items`
- `food_orders`
- `food_order_items`
- food rider assignment and live tracking

Generic partner orders use:

- `business_partners`
- `partner_products`
- `partner_orders`
- `partner_order_items`
- `partner_order_status_logs`

This keeps food checkout stable while allowing groceries, pharmacy, school supplies, tours, errands, and other non-restaurant partners to accept basic orders.

## Admin Assignment

The admin website can view partner orders, inspect items, update status, and assign a rider. This is an assignment foundation only. Assigned partner orders are not merged into the rider app yet.

## Partner Notifications

When the RPC creates a partner order, database-side logic inserts a `partner_order_notifications` row with `notification_type = 'new_partner_order'`. Customers remain unable to write partner notifications directly.

## Remaining Work

- Rider app partner-order delivery queue.
- Partner order live tracking.
- Partner accept/preparation workflow with real partner login.
- Phase 9 payment integration, including GCash/manual payment hardening.
- Production RLS hardening once final admin, rider, and partner role flows are stable.
