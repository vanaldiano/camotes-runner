# Partner Latest Order Popup

Phase 8H improves the Partner Dashboard Preview inside the existing admin web project. The preview uses real partner shop, order, product, and notification data, but access is still simulated and controlled by an admin-selected partner until real partner login is enabled.

## Dashboard Behavior

The Partner Preview `My Shop` section now shows operational summary cards for the selected partner:

- Pending orders
- Preparing orders
- Completed orders today
- Total orders today
- Unread notifications

It also shows a prominent Latest Order card with customer contact details, delivery address, item summary, fees, payment method, status, and created time. The card includes safe status actions using the existing partner order status flow.

## New Order Popup

When the selected partner receives a newer order while the preview is open, the dashboard shows a `New Order Received` popup. The popup is scoped to the selected partner only and includes:

- Order reference
- Customer name and phone
- Delivery address
- Item summary
- Total amount and payment method
- View Order, Mark as Read, and Dismiss actions

Existing latest orders do not pop immediately on page load. This avoids noisy alerts during refreshes while still surfacing newly arriving orders during an active preview session. Dismissed popup order IDs are stored locally in the browser so the same alert is not repeatedly shown.

## Realtime and Polling

The admin web app subscribes to selected-partner `partner_orders` and `partner_order_notifications` changes. It also keeps a 5-second polling fallback, matching the existing admin dashboard safety pattern in case realtime is delayed or blocked by environment settings.

## Future Partner Login Path

This prepares the real partner dashboard experience without separating deployments yet. After partner login is enabled, the same UI behavior can be scoped by the authenticated partner user instead of the admin-selected preview partner.

Future hardening can add browser-safe sound alerts, per-user notification preferences, richer order detail modals, and stricter partner-only access policies.
