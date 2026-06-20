# Push Notification Debug

Phase 7B adds a temporary mobile diagnostics screen for APK push notification testing.

## Open the Diagnostics Screen

1. Install the APK on a physical Android device.
2. Sign in from Profile.
3. Open Profile.
4. Tap **Notification Diagnostics**.

The screen is intentionally temporary and does not change the normal customer, rider, or admin flows.

## What the Screen Shows

- Permission status from `expo-notifications`
- Device type from `expo-device`
- Whether the app is running on a physical device
- Current Expo push token
- Expo push token format validation
- Supabase token registration target:
  - `profiles.push_token` for customers
  - `riders.push_token` for riders
- Whether the token saved in Supabase matches the token on the device
- Last foreground notification received
- Last Expo test-send response

## Valid Token Format

The app accepts these Expo token formats:

```text
ExpoPushToken[...]
ExponentPushToken[...]
```

If the diagnostics screen shows `Invalid ExpoPushToken format`, the app will not send a push request with that token.

## Test Notification Button

The **Test Notification** button sends a notification to the current device token through:

```text
https://exp.host/--/api/v2/push/send
```

The response body is shown on screen and logged to the JavaScript console. A successful Expo response usually includes `status: "ok"` inside the response data.

## Supabase Registration Checks

When diagnostics refreshes, it registers the device token and saves it again.

Expected customer result:

- Target: `profiles.push_token`
- Token saved: `Yes`
- Matches device: `Yes`

Expected rider result:

- Target: `riders.push_token`
- Token saved: `Yes`
- Matches device: `Yes`

If the token is not saved, check:

- The user is signed in.
- `database/push_notifications.sql` has been run.
- `database/authentication.sql` has been run.
- RLS policies allow the MVP update.
- Rider accounts have `riders.auth_user_id` linked to the signed-in auth user.

## Console Logs Added

The mobile app now logs:

- Push token registration skips
- Invalid token format failures
- Customer token save success/failure
- Rider token save success/failure
- Expo push send responses
- Expo push send failures

The admin dashboard sender now logs:

- Invalid token format failures
- Expo push send responses
- Expo push send failures

## Common APK Failure Points

- Testing on an emulator instead of a physical device
- Notification permission denied
- The APK was built without the expected EAS project ID
- The token is generated but not saved to Supabase
- Admin/rider status updates target a user or rider row that has no `push_token`
- Network access blocks the Expo push endpoint
- Android notification permission was denied after install

## Cleanup Later

After push delivery is stable, remove or hide:

- `src/app/notification-debug.tsx`
- `src/screens/notification-debug-screen.tsx`
- The Profile **Notification Diagnostics** button
