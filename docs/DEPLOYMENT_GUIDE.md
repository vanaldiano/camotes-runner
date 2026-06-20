# Deployment Guide

## Supabase Setup

1. Create a Supabase project.
2. Copy the project URL and anon key.
3. Create `.env` in the project root:

```bash
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Run SQL files in this order from the Supabase SQL Editor:

```text
database/schema.sql
database/rider_assignment.sql
database/food_menu_schema.sql
database/admin_policies.sql
database/storage_image_upload.sql
```

5. Confirm these tables exist:

- `profiles`
- `riders`
- `bookings`
- `booking_status_logs`
- `fare_settings`
- `restaurants`
- `menu_categories`
- `menu_items`
- `food_orders`
- `food_order_items`
- `food_order_status_logs`

6. Confirm seeded rider exists:

- `Juan Dela Cruz`

## Storage Setup

Run `database/storage_image_upload.sql`.

This creates:

- `restaurant-images`
- `menu-images`

Both buckets are public for the MVP. The SQL includes permissive MVP read/upload/update policies for `anon` and `authenticated`.

Before production:

- Replace MVP Storage policies with admin-only policies.
- Add authentication and role checks.
- Consider private buckets or signed URLs.
- Add cleanup for replaced images.

## Expo Setup

1. Install dependencies:

```bash
npm install
```

2. Start the app:

```bash
npm start
```

3. Start the web app:

```bash
npm run web
```

4. Run checks:

```bash
npx tsc --noEmit
npm run lint
npx expo export --platform web
```

5. Android development:

```bash
npm run android
```

6. iOS development:

```bash
npm run ios
```

## Admin Dashboard Setup

The admin dashboard is a separate Vite app in `admin/`.

1. Install root dependencies first:

```bash
npm install
```

2. Start admin dev server:

```bash
cd admin
npm run dev
```

3. Build admin dashboard:

```bash
cd admin
npm run build
```

The admin dashboard reads the same Supabase environment variables through Vite import meta env:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

## Release Verification

Before release, run:

```bash
npx tsc --noEmit
npm run lint
npx expo export --platform web
cd admin
npm run build
```

Then manually test:

- Ride booking flow.
- Customer tracking flow.
- Admin status update flow.
- Cancelled booking terminal behavior.
- Rider Mode status updates.
- Food ordering flow.
- Food delivery status updates.
- Restaurant and menu image upload flow.
- Realtime updates with polling fallback.

## Production Hardening

- Add authentication.
- Add role-based access control.
- Replace permissive MVP RLS and Storage policies.
- Add payment integration.
- Add push notifications.
- Add error monitoring.
- Add automated tests.
- Configure Play Store release signing and store metadata.
