# Supabase Setup

This guide prepares Camotes Runner for a future Supabase backend. The current app still uses the local mock booking simulation, so these steps do not change the UI yet.

## 1. Create A Supabase Project

1. Go to `https://supabase.com`.
2. Create a new project.
3. Choose an organization and project name, for example `camotes-runner`.
4. Save the database password somewhere private.
5. Wait for Supabase to finish provisioning the project.

## 2. Add Environment Variables

1. Copy `.env.example` to `.env`.
2. Open your Supabase project dashboard.
3. Go to `Project Settings > API`.
4. Copy the Project URL into:

```bash
EXPO_PUBLIC_SUPABASE_URL=
```

5. Copy the anon public key into:

```bash
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

Expo exposes variables prefixed with `EXPO_PUBLIC_` to the mobile app.

## 3. Run The SQL Schema

1. Open `SQL Editor` in the Supabase dashboard.
2. Create a new query.
3. Paste the contents of `database/schema.sql`.
4. Click `Run`.
5. Confirm these tables exist in `Table Editor`:

- `profiles`
- `riders`
- `bookings`
- `booking_status_logs`
- `fare_settings`

## 4. Test The Client Configuration

Run the app checks:

```bash
npx tsc --noEmit
npm run lint
npx expo export --platform web
```

When the app later connects UI screens to Supabase, the service functions in `src/services/booking-service.ts` will replace the current mock booking simulation.

## 5. Important Production Note

Authentication and Row Level Security are not added yet. Before a Play Store production release, add Supabase Auth and RLS policies so customers can only access their own bookings and admins can manage riders safely.
