# Food Status Update Bugfix

This bugfix standardizes food order status values and makes rider/admin status updates feel immediate.

## Canonical Status Values

Food orders now use this exact status set everywhere:

- `pending`
- `accepted`
- `preparing`
- `picked_up`
- `on_the_way`
- `delivered`
- `cancelled`

The legacy `ready_for_pickup` value is no longer part of the TypeScript union or active database constraints. The food menu SQL includes a safe migration that maps any existing `ready_for_pickup` food orders or logs to `picked_up` before tightening the constraints.

## Admin Updates

When an admin changes a food order status:

- The table row updates locally immediately.
- Supabase saves `food_orders.status`.
- A `food_order_status_logs` row is inserted with the same status value.
- If the status save fails, the row rolls back and a friendly error appears.
- Failures are logged with `console.error` for easier debugging.

Status log insert failures are logged but do not undo a successful status update.

## Rider Updates

When a rider taps a food delivery status:

- The delivery card updates locally immediately.
- Supabase saves the status.
- A status log uses the exact same status value.
- If the status save fails, the card rolls back and a friendly error appears.

Realtime subscriptions and the existing 5-second polling fallback remain active.
