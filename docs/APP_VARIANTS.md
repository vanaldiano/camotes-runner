# App Variants

Phase 7B uses one codebase to build separate Customer and Rider APKs.

## Variants

Supported variants:

- `customer`
- `rider`

The variant is controlled by:

- `APP_VARIANT`
- `EXPO_PUBLIC_APP_VARIANT`

If no variant is set, the app defaults to `customer`.

## Customer APK

Customer build settings:

- App name: `Camotes Runner`
- Android package ID: `com.camotesrunner.customer`
- Starts on the normal customer tabs
- Hides the `Open Rider Mode` button from Profile
- Keeps booking, food ordering, Activity, tracking, authentication, and push notifications working

## Rider APK

Rider build settings:

- App name: `Camotes Runner Rider`
- Android package ID: `com.camotesrunner.rider`
- Starts directly on `/rider`
- Keeps rider login, rider profile linking, assigned ride jobs, assigned food deliveries, and push notifications working
- Hides customer Book and Activity tab triggers from the rider tab shell

The customer routes still exist in the shared codebase so development stays simple, but the rider APK does not present them as the primary navigation.

## EAS Build Profiles

Build customer preview APK:

```bash
eas build -p android --profile customerPreview
```

Build rider preview APK:

```bash
eas build -p android --profile riderPreview
```

Both profiles use the same Supabase backend and the same source code.

## Local Testing

Run customer mode:

```bash
$env:EXPO_PUBLIC_APP_VARIANT='customer'; $env:APP_VARIANT='customer'; npx expo start
```

Run rider mode:

```bash
$env:EXPO_PUBLIC_APP_VARIANT='rider'; $env:APP_VARIANT='rider'; npx expo start
```

## Files

- `app.config.js` chooses the app name and Android package ID.
- `eas.json` defines `customerPreview` and `riderPreview`.
- `src/constants/app-variant.ts` exposes runtime variant helpers.
- `src/app/(tabs)/index.tsx` redirects rider builds to `/rider`.
- `src/components/app-tabs.tsx` and `src/components/app-tabs.web.tsx` hide customer tab triggers in rider builds.
- `src/screens/profile-screen.tsx` hides Rider Mode entry in customer builds.
