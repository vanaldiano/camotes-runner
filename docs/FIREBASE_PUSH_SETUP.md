# Firebase Push Setup

The Android error `Default FirebaseApp is not initialized` means the APK was built without a matching Firebase Android app config. Expo can request permission, but Android cannot produce a native FCM token until `google-services.json` matches the installed package name.

## Current Expo Audit

- `expo-notifications` is installed.
- `app.json` includes the `expo-notifications` config plugin.
- The Expo project ID is configured at `extra.eas.projectId`.
- Customer package ID: `com.camotesrunner.customer`
- Rider package ID: `com.camotesrunner.rider`
- `app.config.js` now reads Firebase config file paths from EAS/local env vars:
  - Customer: `GOOGLE_SERVICES_JSON_CUSTOMER`, fallback `GOOGLE_SERVICES_JSON`
  - Rider: `GOOGLE_SERVICES_JSON_RIDER`, fallback `GOOGLE_SERVICES_JSON`
- `customerPreview` and `riderPreview` use the EAS `preview` environment.

## Firebase Project Creation

1. Open the Firebase Console.
2. Create a Firebase project for Camotes Runner, or open the existing project.
3. Keep the project active because Android push notifications use Firebase Cloud Messaging.

Expo's Android push setup requires FCM credentials and a Firebase Android app config. Expo documents this as the Android credential path for push notifications.

## Android App Registration

Register both Android apps in the same Firebase project:

| App | Android package name |
| --- | --- |
| Customer | `com.camotesrunner.customer` |
| Rider | `com.camotesrunner.rider` |

Steps for each app:

1. Firebase Console > Project settings > General.
2. Under **Your apps**, click **Add app** > Android.
3. Enter the exact package name.
4. Register the app.
5. Download the generated `google-services.json`.

If Firebase lets you download one `google-services.json` after both Android apps are registered, that single file may contain both package clients. Otherwise keep separate files:

```text
google-services.customer.json
google-services.rider.json
```

## Local File Placement

For local native builds, place the files somewhere outside committed source or keep them gitignored at the project root:

```text
google-services.customer.json
google-services.rider.json
```

Then run local commands with:

```bash
GOOGLE_SERVICES_JSON_CUSTOMER=./google-services.customer.json APP_VARIANT=customer npx expo prebuild --platform android
GOOGLE_SERVICES_JSON_RIDER=./google-services.rider.json APP_VARIANT=rider npx expo prebuild --platform android
```

For EAS Build, prefer EAS file environment variables instead of relying on local files.

## EAS File Variables

Upload each file to the `preview` environment:

```bash
eas env:create preview --name GOOGLE_SERVICES_JSON_CUSTOMER --type file --visibility secret --value ./google-services.customer.json
eas env:create preview --name GOOGLE_SERVICES_JSON_RIDER --type file --visibility secret --value ./google-services.rider.json
```

Verify:

```bash
eas env:list --environment preview
```

Build:

```bash
eas build -p android --profile customerPreview
eas build -p android --profile riderPreview
```

Because `app.config.js` reads the file path from `process.env`, EAS will inject the uploaded file path during the build and Expo will set:

```js
android.googleServicesFile
```

## FCM V1 Sending Credentials

Expo also needs Android FCM V1 credentials to send through Expo's push service:

1. Firebase Console > Project settings > Service accounts.
2. Generate a new private key, or use an existing service account with the Firebase Messaging API Admin role.
3. Run:

```bash
eas credentials
```

4. Select Android.
5. Select the app identifier.
6. Manage the Google Service Account Key for Push Notifications (FCM V1).
7. Upload the service account key.

Repeat or verify this for both Android application identifiers:

```text
com.camotesrunner.customer
com.camotesrunner.rider
```

## Startup Diagnostics

The app logs `Push startup diagnostics` during startup token registration. The Notification Diagnostics screen also shows:

- Firebase config file present in app config
- Firebase initialized
- Native device push token generated
- Expo push token generated
- Expo push token format
- Push token saved to Supabase
- Supabase token target:
  - `profiles.push_token`
  - `riders.push_token`

For this specific error, check **Firebase initialized** first. If it says `No`, rebuild the APK after adding the correct `google-services.json` for the package ID.

## Sources

- Expo Push Notifications setup: https://docs.expo.dev/push-notifications/push-notifications-setup/
- Expo FCM V1 credentials: https://docs.expo.dev/push-notifications/fcm-credentials/
- EAS environment variables and file variables: https://docs.expo.dev/eas/environment-variables/
- EAS environment variable management: https://docs.expo.dev/eas/environment-variables/manage/
