# Camotes Runner

Camotes Runner is a mobile app for rides, errands, deliveries, medicine pickup, grocery pickup, document delivery, and local transport around Camotes Island.

This repository also includes a separate React + TypeScript admin dashboard for operations.

## Customer App

Install dependencies:

```bash
npm install
```

Start the Expo customer app:

```bash
npx expo start
```

The customer app uses Expo Router and lives in `src/app`.

## Admin Dashboard

The admin dashboard lives in `admin/`. It is a separate React web app and does not change the customer mobile UI.

Features:

- Dashboard page
- View all bookings from Supabase
- Filter bookings by status
- Update booking status
- Show total bookings
- Show completed income

## Supabase Setup

Copy `.env.example` to `.env` and add your Supabase values:

```bash
EXPO_PUBLIC_SUPABASE_URL=your-project-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Run the SQL schema in Supabase:

```bash
database/schema.sql
```

No authentication is required yet for this admin prototype.

## Build Admin Dashboard

Build the admin dashboard:

```bash
npm run build
```

The build output is created in `admin-dist/`.

Run the admin dashboard locally:

```bash
cd admin
npm run dev
```

Open `http://localhost:5174`.

## Notes

- Keep service-role keys out of frontend code.
- Use the anon key only while this prototype has no authentication.
- Add authentication and admin policies before production use.
