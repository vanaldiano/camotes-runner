# Food Rider Assignment

Phase 6C lets admins assign riders to food orders the same way they assign riders to ride and errand bookings.

## Database

Food orders use:

- `food_orders.assigned_rider_id`

Run `database/food_rider_assignment.sql` after the base schema, rider assignment schema, and food menu schema. It safely adds the column and index if they are missing:

- `assigned_rider_id uuid references public.riders(id) on delete set null`
- `food_orders_assigned_rider_id_idx`

The current `database/food_menu_schema.sql` also includes the column and an `alter table ... add column if not exists` upgrade path.

## Admin Dashboard

The Food Orders table now includes:

- Rider display column
- Assign Rider dropdown

Admins can:

- Assign a food order to any rider from the existing `riders` table.
- Clear a food order rider assignment by choosing `Unassigned`.
- Continue updating food order status from the same table.

Saving the dropdown updates:

- `food_orders.assigned_rider_id`
- `food_orders.updated_at`

This update triggers existing Supabase Realtime listeners on the `food_orders` table.

## Rider App

Rider Mode already loads food deliveries through `getAssignedFoodOrdersForRider(riderId)`, which filters by:

- `food_orders.assigned_rider_id = rider.id`

Phase 6C adds a rider-side Realtime subscription for assigned food orders. When an admin assigns a food order to the current rider, Rider Mode refreshes assigned jobs and deliveries. Polling remains active as a fallback if Realtime is unavailable.

## Customer Tracking

Customer food order status tracking remains based on the current food order ID. Assignment changes do not interrupt customer tracking, and status updates continue through the existing `food_orders` Realtime listener.

## Auth Notes

For authenticated riders, the app first resolves the linked rider row through:

- `riders.auth_user_id = auth.user.id`

For MVP guest rider mode, the app continues to load the Juan Dela Cruz rider row and assigned food orders when Supabase is available, or sample fallback deliveries when it is not.

## Verification

After implementation, verify:

- `npx tsc --noEmit`
- `npm run lint`
- `npx expo export --platform web`
- `cd admin && npm run build`
