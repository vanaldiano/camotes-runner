# Push Notifications

Phase 7A adds Expo Push Notifications for customers and riders.

## Packages

Installed Expo modules:

- `expo-notifications`
- `expo-device`

`app.json` includes the `expo-notifications` config plugin.

## Database Setup

Run:

- `database/push_notifications.sql`

The migration adds:

- `profiles.push_token`
- `riders.push_token`
- `notification_logs`

`notification_logs` stores:

- recipient type and ID
- push token used
- notification title/body/data
- status: `sent`, `failed`, `skipped`, or `queued`
- error message when available

## Token Registration

The app requests notification permission on native APK/dev builds during app startup and after auth changes.

Customer tokens are saved to:

- `profiles.push_token`

Rider tokens are saved to:

- `riders.push_token`

Web, simulator, and Expo Go environments safely skip token registration.

## Expo Go Compatibility

Expo Go SDK 53+ removed Android push notification support from `expo-notifications`.

To avoid the red error screen in Expo Go, the app:

- Detects Expo Go with `Constants.appOwnership === 'expo'`.
- Does not load the push notification service from `_layout.tsx` when running in Expo Go.
- Does not statically import `expo-notifications` in startup code, diagnostics screens, or service wrappers.
- Uses a lazy dynamic import only after the non-Expo-Go guard passes.
- Does not call:
  - `getExpoPushTokenAsync`
  - `getDevicePushTokenAsync`
  - `getPermissionsAsync`
  - `requestPermissionsAsync`
  - notification listeners
- Returns safe diagnostics instead.
- Logs: `Push notifications skipped in Expo Go.`
- Shows: `Push unavailable in Expo Go.`
- Also tells testers: `Push notifications require APK/dev build.`

Push notifications remain fully enabled in EAS APK/dev builds such as:

- `customerPreview`
- `riderPreview`

Use those builds for real Android push token generation and notification testing.

## Customer Notifications

Customers can receive notifications for:

- ride accepted
- runner arriving
- ride completed
- ride cancelled
- food preparing
- food picked up
- food on the way
- food delivered
- food cancelled

Admin status updates trigger customer notifications. Rider status updates also trigger customer notifications for the same status set.

## Rider Notifications

Riders can receive notifications for:

- ride assigned
- food order assigned

Admin rider assignment updates trigger these notifications.

## Sender Layer

The MVP uses a reusable Expo push sender in:

- `src/services/push-notification-service.ts`
- `admin/src/services/notifications.ts`

The sender posts to Expo Push API and logs each result in Supabase. Notification failures are logged but do not block booking, food order, or rider assignment updates.

## Production Notes

For production, move push sending to a trusted backend or Supabase Edge Function so Expo push requests and notification rules do not depend on client/admin browser execution.

Recommended future hardening:

- Add notification preferences.
- Add server-side deduplication.
- Add Expo push receipt checks.
- Add richer deep links from notification taps.
- Tighten RLS on `notification_logs`.

## Verification

After implementation, verify:

- `npx tsc --noEmit`
- `npm run lint`
- `npx expo export --platform web`
- `cd admin && npm run build`
