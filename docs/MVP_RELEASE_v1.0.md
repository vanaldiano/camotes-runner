# Camotes Runner MVP Release v1.0

## Completed Features

- Customer mobile app built with React Native, Expo, Expo Router, and TypeScript.
- Supabase-backed ride and errand booking flow.
- Food ordering flow with restaurants, menu items, cart, and checkout.
- Rider dashboard for assigned ride, errand, and food delivery jobs.
- Admin dashboard for bookings, food orders, rider assignment, status updates, and food image management.
- Realtime booking and food-order status updates with polling fallback.
- Restaurant and menu image display with Supabase Storage upload support from admin.
- Fallback sample data when Supabase is unavailable or not configured.

## Customer App Features

- Home screen with Camotes Runner branding and service cards.
- Bottom navigation for Home, Book, Activity, and Profile.
- Booking form for rides, groceries, medicine, documents, tours, and errands.
- Payment method selection for Cash or GCash.
- Runner matching, runner found, and live tracking screens.
- Booking history/activity screen.
- Profile screen with Rider Mode entry point.
- Terminal tracking behavior:
  - Active statuses show `Keep Tracking`.
  - Completed bookings show `Book Again`.
  - Cancelled bookings show `Back to Home`.

## Rider App Features

- `/rider` route for Rider Mode.
- Rider dashboard for Juan Dela Cruz.
- Online/offline availability toggle.
- Active jobs and completed jobs counts.
- Assigned ride and errand job cards.
- Active deliveries and delivered today counts.
- Assigned food delivery cards.
- Rider status updates for bookings:
  - `accepted`
  - `runner_arriving`
  - `in_progress`
  - `completed`
- Rider status updates for food orders:
  - `accepted`
  - `preparing`
  - `picked_up`
  - `on_the_way`
  - `delivered`
- Friendly fallback sample jobs when Supabase is unavailable.

## Admin Dashboard Features

- Separate Vite React admin dashboard in `admin/`.
- Booking table with status filters.
- Booking status updates.
- Rider assignment for bookings.
- Food order table with customer, restaurant, items, delivery address, payment, and status.
- Food order status updates.
- Food Management section:
  - Restaurant image preview.
  - Restaurant `image_url` text input fallback.
  - Restaurant image file upload to Supabase Storage.
  - Menu item image preview.
  - Menu item `image_url` text input fallback.
  - Menu item image file upload to Supabase Storage.
- Success and error messaging for admin actions.

## Food Ordering Features

- Restaurant listing screen.
- Restaurant menu screen grouped by categories.
- Menu item availability states.
- Food cart with item quantity tracking.
- Food checkout screen.
- Food order creation in Supabase.
- Food order status context for customer-side realtime updates.
- Restaurant and menu images with safe placeholders.

## Realtime Features

- Customer booking tracking subscribes to `bookings` changes.
- Customer food order status provider subscribes to `food_orders` changes.
- Admin dashboard subscribes to `bookings` and `food_orders` changes.
- Polling fallback keeps screens resilient if Supabase Realtime is temporarily unavailable.
- Terminal booking states clean up tracking subscriptions and polling after the final status is applied.

## Known Limitations

- Authentication is not production-ready.
- MVP policies are permissive for prototype usage.
- Rider identity is hardcoded to Juan Dela Cruz.
- Payment collection is not integrated; Cash and GCash are stored as selected methods only.
- Distance, fare estimates, and runner ETA are MVP/mock values.
- Image upload does not compress, resize, moderate, or clean up replaced files.
- Admin dashboard is operational but not role-protected.
- Push notifications are not implemented.
- Native Play Store release signing and store listing work are not documented here.

## Future Roadmap

- Add real authentication and role-based access control for customers, riders, and admins.
- Add production RLS policies for bookings, food orders, profiles, riders, and Storage buckets.
- Add live rider location and map-based tracking.
- Add fare configuration management in admin.
- Add rider onboarding and rider profile management.
- Add restaurant/menu CRUD management beyond image URLs.
- Add image compression, validation, cleanup, and moderation.
- Add payment integration for GCash or another payment provider.
- Add push notifications for booking and delivery status changes.
- Add automated tests for booking, food ordering, rider, and admin flows.
