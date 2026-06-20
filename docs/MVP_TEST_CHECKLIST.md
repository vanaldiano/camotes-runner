# MVP Test Checklist

Use this checklist before tagging an MVP release or demo build.

## Ride Booking Flow

- Open the customer app.
- Confirm Home, Book, Activity, and Profile bottom tabs render.
- Open Book.
- Select each service type at least once.
- Enter pickup, destination, notes, and payment method.
- Tap `Find Runner`.
- Confirm matching screen opens.
- Confirm runner found and tracking screens work for an active booking.
- Confirm booking appears in Activity after Supabase save succeeds.

## Food Ordering Flow

- Open Restaurants.
- Confirm restaurant cards load from Supabase or show fallback sample restaurants.
- Confirm restaurant image placeholders or uploaded images render.
- Open a restaurant menu.
- Confirm menu categories and items render.
- Confirm menu image placeholders or uploaded images render.
- Add available items to cart.
- Open Cart.
- Confirm item quantity and total are correct.
- Continue to checkout.
- Submit food order.
- Confirm order is saved or friendly fallback/error state appears.

## Rider Assignment Flow

- Open admin dashboard.
- Confirm riders load.
- Find a booking in the bookings table.
- Assign Juan Dela Cruz or another available rider.
- Confirm success message appears.
- Open Rider Mode at `/rider`.
- Confirm assigned booking appears in Rider Dashboard.
- Confirm customer tracking shows assigned rider details when synced.

## Status Update Flow

- Update a booking status in admin.
- Confirm customer tracking updates through realtime or polling.
- Update a booking status from Rider Mode.
- Confirm admin dashboard reflects the changed status.
- Update a food order status in admin.
- Confirm food order status updates through realtime or polling.
- Update a food delivery status from Rider Mode.
- Confirm admin dashboard reflects the changed status.

## Cancel Flow

- Create or find an active booking.
- Change the booking status to `cancelled` in admin.
- Confirm customer tracking shows `Cancelled`.
- Confirm the tracking screen no longer shows `Keep Tracking`.
- Confirm the bottom action shows `Back to Home`.
- Tap `Back to Home`.
- Confirm the app returns to the home route.

## Image Upload Flow

- Run `database/storage_image_upload.sql` in Supabase if buckets are not created yet.
- Open admin dashboard.
- Go to Food Management.
- Choose an image file for a restaurant.
- Confirm upload loading state appears.
- Confirm success message appears.
- Confirm the restaurant preview updates.
- Confirm `restaurants.image_url` is saved in Supabase.
- Choose an image file for a menu item.
- Confirm upload loading state appears.
- Confirm success message appears.
- Confirm the menu item preview updates.
- Confirm `menu_items.image_url` is saved in Supabase.
- Confirm pasted image URLs can still be saved through the text input.
- Confirm the customer restaurant and menu screens display uploaded images.

## Realtime Flow

- Open customer tracking and admin dashboard at the same time.
- Update booking status in admin.
- Confirm customer tracking updates without a manual refresh.
- Open Rider Mode and admin dashboard at the same time.
- Update booking status in Rider Mode.
- Confirm admin updates through realtime or polling.
- Update food order status in admin.
- Confirm any active food-order subscriber updates.
- Temporarily interrupt realtime or simulate a realtime failure.
- Confirm polling fallback still refreshes data.

## Verification Commands

- Run `npx tsc --noEmit`.
- Run `npm run lint`.
- Run `npx expo export --platform web`.
- Run `cd admin && npm run build`.
