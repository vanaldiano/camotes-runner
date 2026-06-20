# Authentication Roadmap

Phase 6B introduces Supabase Auth while keeping MVP guest mode available for customer booking, food ordering, rider testing, and admin setup.

## Goals

- Customers can sign up, sign in, sign out, and see account/profile state.
- Riders can sign in and link a Supabase Auth user to a row in `riders`.
- Admins must sign in before seeing the admin dashboard.
- Role support is prepared for `customer`, `rider`, and `admin`.
- Existing MVP guest booking and food ordering remain usable during the transition.

## Database Setup

Run these SQL files in Supabase:

1. `database/schema.sql`
2. `database/food_menu_schema.sql`
3. `database/rider_assignment.sql`
4. `database/authentication.sql`
5. `database/storage_image_upload.sql`

Phase 6B adds:

- `profiles.role`
- `riders.auth_user_id`
- `public.handle_new_auth_user()` trigger for creating/updating profiles from Auth users
- starter policies for users viewing/updating their own profile
- starter policies for riders viewing/updating their linked rider profile

Guest-mode MVP policies can remain in place until production RLS is tightened.

## Roles

Supported roles:

- `customer`
- `rider`
- `admin`

The app checks roles from:

- `profiles.role`
- `app_metadata.role`
- `user_metadata.role`

For admin dashboard access, set the admin user's `profiles.role` to `admin`. Optionally also mirror that role in Supabase Auth metadata.

## Customer Auth

Customer auth is available in the Profile screen:

- Sign Up creates a Supabase Auth account and upserts a `profiles` row.
- Sign In loads the current profile.
- Sign Out returns the app to guest mode.
- Profile header shows authenticated account details when signed in.

Ride bookings and food orders still work as guests. When a customer is signed in, new rows store `customer_id = auth.user.id`; otherwise `customer_id` remains `null`.

## Rider Auth

Rider Mode now includes a login panel:

- Signed-out users can continue using guest rider mode for MVP testing.
- Signed-in riders load jobs from the rider row linked by `riders.auth_user_id`.
- If the signed-in user is not linked yet, Rider Mode offers a link action for the MVP Juan Dela Cruz rider profile.

For production, admins should link each real rider account to the correct `riders` row instead of using the MVP Juan link.

## Admin Auth

The admin dashboard is protected by an admin login page.

- Non-authenticated users see the login screen.
- Authenticated users without the admin role stay blocked.
- Admin users can access the existing dashboard after login.
- Admins can sign out from the session bar.

The admin dashboard still uses the existing booking, food order, rider assignment, restaurant management, and image upload flows after login.

## Guest Mode

Guest mode remains enabled during Phase 6B:

- Customer ride booking can still create local fallback bookings.
- Food ordering still works when Supabase is available, even without a signed-in customer.
- Rider Mode still shows sample fallback work if Supabase is unavailable or no rider link exists.

This keeps MVP demos and testing stable while Auth is introduced gradually.

## Future Hardening

Recommended next phases:

- Add persistent React Native auth storage with `@react-native-async-storage/async-storage`.
- Add a dedicated rider onboarding/linking flow controlled by admins.
- Replace MVP guest policies with stricter production RLS.
- Add password reset.
- Add email verification UI states.
- Add admin user management for roles.
- Add profile editing for customer names and phone numbers.
