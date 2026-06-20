# Project Structure

## Root

- `src/` contains the Expo customer and rider app.
- `admin/` contains the Vite React admin dashboard.
- `database/` contains Supabase SQL setup files.
- `docs/` contains roadmap, setup, release, and behavior documentation.
- `assets/` contains app image assets.
- `scripts/` contains project utility scripts.

## App Routes

Expo Router uses `src/app`.

- `src/app/_layout.tsx` wraps the app with providers and stack routes.
- `src/app/(tabs)/_layout.tsx` renders bottom tab navigation.
- `src/app/(tabs)/index.tsx` maps to Home.
- `src/app/(tabs)/book.tsx` maps to Booking.
- `src/app/(tabs)/activity.tsx` maps to Activity.
- `src/app/(tabs)/profile.tsx` maps to Profile.
- `src/app/restaurants.tsx` maps to restaurant listing.
- `src/app/restaurant/[id].tsx` maps to a restaurant menu.
- `src/app/cart.tsx` maps to the food cart.
- `src/app/food-checkout.tsx` maps to food checkout.
- `src/app/matching.tsx` maps to runner matching.
- `src/app/runner-found.tsx` maps to runner found.
- `src/app/tracking.tsx` maps to booking tracking.
- `src/app/rider.tsx` maps to Rider Mode.
- `src/app/explore.tsx` is retained from the Expo starter structure.

## Screens

Screens live in `src/screens`.

- `home-screen.tsx` renders the customer home experience.
- `booking-screen.tsx` renders the service booking form.
- `activity-screen.tsx` renders booking activity/history.
- `profile-screen.tsx` renders profile actions and Rider Mode entry.
- `runner-matching-screen.tsx` renders matching/search state.
- `runner-found-screen.tsx` renders assigned runner confirmation.
- `booking-tracking-screen.tsx` renders live booking tracking and terminal statuses.
- `restaurants-screen.tsx` renders restaurant cards and image placeholders.
- `restaurant-menu-screen.tsx` renders menu categories, items, and item image placeholders.
- `cart-screen.tsx` renders the food cart.
- `food-checkout-screen.tsx` renders food checkout.
- `rider-screen.tsx` renders Rider Mode jobs and food deliveries.

## Components

Reusable UI lives in `src/components`.

- `app-screen.tsx` provides safe area and scroll layout.
- `app-tabs.tsx` and `app-tabs.web.tsx` provide tab navigation.
- `primary-button.tsx` provides shared button styling.
- `info-card.tsx`, `section-header.tsx`, and `screen-header.tsx` provide common layout pieces.
- `app-icon.tsx` renders platform-aware icons.
- `service-card.tsx` renders service options.
- `food-image.tsx` renders restaurant/menu images with safe placeholders.

## Services

Business and Supabase logic lives in `src/services`.

- `supabase.ts` creates the Supabase client.
- `booking-service.ts` creates, reads, and updates bookings and booking logs.
- `booking-status.ts` maps Supabase statuses to customer-facing labels.
- `booking-simulation.tsx` manages local booking state and fallback simulated progress.
- `realtime-service.ts` subscribes to booking and food order changes.
- `rider-service.ts` loads rider jobs, updates rider availability, and updates rider statuses.
- `restaurant-service.ts` loads restaurants, categories, menu items, and image URLs.
- `food-cart.tsx` manages cart state.
- `food-order-service.ts` creates and updates food orders and food order logs.
- `food-order-status.tsx` manages customer-side food order status subscriptions.

## Database Tables

Core SQL lives in `database/schema.sql`, `database/rider_assignment.sql`, `database/food_menu_schema.sql`, and `database/storage_image_upload.sql`.

- `profiles` stores customer profile records.
- `riders` stores rider profile, availability, and vehicle data.
- `bookings` stores ride, errand, and delivery bookings.
- `booking_status_logs` stores booking status history.
- `fare_settings` stores fare configuration rows.
- `restaurants` stores food merchant records and `image_url`.
- `menu_categories` stores restaurant menu groups.
- `menu_items` stores menu items and `image_url`.
- `food_orders` stores customer food orders.
- `food_order_items` stores food order line items.
- `food_order_status_logs` stores food order status history.
- Storage buckets:
  - `restaurant-images`
  - `menu-images`

## Admin Dashboard

The admin dashboard is in `admin/`.

- `admin/src/App.tsx` renders the dashboard panels.
- `admin/src/services/bookings.ts` contains admin Supabase queries and mutations.
- `admin/src/services/realtime.ts` subscribes to admin realtime feeds.
- `admin/src/lib/supabase.ts` creates the admin Supabase client.
- `admin/src/styles.css` styles the dashboard.

Admin modules include:

- Booking table.
- Booking status updates.
- Rider assignment.
- Food order table.
- Food order status updates.
- Food Management for restaurant and menu images.

## Rider Module

The rider module is exposed at `/rider`.

- Uses `src/app/rider.tsx` route.
- Uses `src/screens/rider-screen.tsx` UI.
- Uses `src/services/rider-service.ts` for assigned booking and food-order data.

Current MVP rider identity is Juan Dela Cruz.
