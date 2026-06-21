# Phase 8 Final Regression and APK Build

This document records the final Phase 8 regression pass before Phase 9 payment integration.

## SQL Readiness

The Phase 8 Supabase environment is expected to have these migrations applied:

- `database/category_marketplace.sql`
- `database/partner_dashboard_foundation.sql`
- `database/partner_order_notifications.sql`
- `database/partner_order_notifications_rls_fix.sql`
- `database/partner_product_menu_editing.sql`
- `database/partner_order_checkout_assignment.sql`
- `database/partner_order_guest_tracking.sql`
- `database/partner_order_guest_tracking_pgcrypto_fix.sql`
- `database/partner_order_rider_jobs.sql`
- `database/partner_distance_fee_rates.sql`
- `database/partner_product_image_upload.sql`

No new SQL was created for final regression. Confirm `partner_distance_fee_rates.sql` and `partner_product_image_upload.sql` have been run before APK testing because they support partner checkout fee calculation and partner product images.

## Automated Check Results

- `npx tsc --noEmit`: passed
- `npm run lint`: passed
- `npx expo export --platform web`: passed
- `npm --prefix admin run build`: passed

Admin build completed with the existing Vite large chunk warning. This is non-blocking for Phase 8.

## Customer App Regression Checklist

- App opens
- Home loads
- Category marketplace loads
- Groceries -> Mini Mart -> Camotes Mini Mart loads
- Product images display
- Add to cart works
- Partner checkout works
- Delivery location preset works
- Distance-based delivery fee updates
- Partner order created
- Activity shows partner order
- Partner Order Detail shows status timeline
- Partner live tracking/ETA works when rider is assigned
- Restaurant/food order flow still works
- Ride booking flow still works
- Profile/activity screens still load

Terminal regression covered compile, lint, static web export, and route generation. Device-level Supabase/manual flow testing should be completed on the APK or Expo dev client with the target Supabase project.

## Rider App Regression Checklist

- Rider app opens with rider variant
- Ride jobs still show
- Food jobs still show
- Partner order jobs show when assigned
- Accept partner order works
- Picked up/on the way/completed works
- Live location publishing works for partner orders
- Map buttons still work

Device-level rider testing requires a rider account, assigned test orders, and location permission on an Android device.

## Admin Web Regression Checklist

- Admin dashboard loads
- Sidebar single-section rendering works
- Ride bookings visible
- Food orders visible
- Partner orders visible
- Assign rider works
- Update partner order status works
- Marketplace/partners/products/menu sections work
- Rate profiles editable
- Notifications work
- Admin production build works

## Partner Preview Regression Checklist

- Switch to Partner Preview
- Select Camotes Mini Mart
- My Shop dashboard loads
- Latest order card works
- New order popup appears only for selected partner
- My Orders filters selected partner orders
- Products/Menu add product works
- Image upload or image URL works
- Edit product works
- Toggle availability works
- Deactivate works
- Business Profile loads
- Reports/Earnings placeholder loads

## APK Build Profiles

Existing Android APK/internal profiles:

- Customer: `customerPreview`
- Rider: `riderPreview`

Customer APK build command:

```bash
npx eas-cli build --platform android --profile customerPreview --non-interactive
```

Rider APK build command:

```bash
npx eas-cli build --platform android --profile riderPreview --non-interactive
```

For queue-only startup:

```bash
npx eas-cli build --platform android --profile customerPreview --non-interactive --no-wait
npx eas-cli build --platform android --profile riderPreview --non-interactive --no-wait
```

## APK Build Status

EAS CLI is available and authenticated as `vanaldiano`.

The customer build was attempted with:

```bash
npx eas-cli build --platform android --profile customerPreview --non-interactive --no-wait
```

The build uploaded the project and used existing remote Android credentials, but failed because the account has already used its Android builds from the Free plan for the month. EAS reported the quota resets on July 1, 2026.

The rider build was not started because the same account-level Android quota applies.

Latest existing successful APKs listed by EAS:

- Customer `customerPreview`: `38cb9d6e-bfa3-47ac-a619-cf7476061d01`
- Rider `riderPreview`: `897c2049-9d8a-4ca2-a297-1a21911cc04b`

Those APKs were built from an earlier commit and should not be treated as final Phase 8 APKs unless the build source is acceptable.

## Known Non-Blocking Issues

- Vite warns that the admin JavaScript chunk is larger than 500 kB after minification.
- Expo web export prints expected diagnostic logs from fare/ETA fallback paths during static rendering.
- New APK builds are blocked by EAS Free plan Android quota until the reset date or a plan upgrade.

## Phase 9 Readiness

Phase 8 automated checks pass. Phase 8 is ready for Phase 9 planning after:

- Required Phase 8 SQL migrations are confirmed in Supabase.
- Manual APK/device regression is completed.
- Fresh customer and rider APKs are built after EAS Android quota is available.
