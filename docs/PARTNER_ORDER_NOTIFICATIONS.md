# Partner Order Notifications

Phase 8C adds a notification foundation so Admin and future Partner Dashboard users can see new food orders that belong to partner shops.

## How Notifications Work

When a food order is created, the app checks whether the order's `restaurant_id` maps to a `business_partners.restaurant_id`. If a match exists, the order is linked to that partner and a `partner_order_notifications` row is created.

The notification stores:

- partner shop
- linked food order
- notification type
- title and message
- unread/read status
- created and read timestamps

This is an admin/partner website awareness layer only. It does not notify riders, assign riders, or change the food order lifecycle.

## Partner Shop View

For now, partner notifications appear inside the existing admin website through the Partner Dashboard Preview / My Shop section. A selected partner can see:

- unread notification count
- latest new order messages
- status of each notification
- placeholder action: "Order management coming in Phase 8D/8E."

True partner login and role-gated partner-only routing remain future work.

## Admin View

Admin can monitor all partner notifications in the existing admin dashboard:

- newest notifications first
- unread count
- partner name
- food order reference
- title, message, status, and date
- mark notification as read

This keeps Partner Dashboard inside `admin/` while the product/menu and order-management flows mature.

## Phase 8C Includes

- `partner_order_notifications` table.
- Optional `food_orders.partner_id`, `partner_notification_status`, and `partner_notified_at` columns.
- Safe food-order helper to link a partner and create a notification.
- Admin notification list and partner preview notification list.
- Conservative RLS policies for admin and linked partner users.

## Remaining For Phase 8D/8E

- Real partner login and route separation.
- Full partner product/menu editing.
- Partner order acceptance/preparation workflow.
- Real-time partner notification channel or push flow.
- Stronger production RLS and field-level update limits.
