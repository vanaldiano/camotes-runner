# Auth Session Persistence

Android APK users should stay signed in after closing and reopening the app.

## Mobile Storage

The mobile app uses:

```text
@react-native-async-storage/async-storage
```

Supabase Auth is configured in `src/services/supabase.ts` with:

```ts
auth: {
  storage: AsyncStorage,
  autoRefreshToken: true,
  persistSession: true,
  detectSessionInUrl: false,
}
```

This allows Supabase to save the session and refresh token on device storage instead of keeping it only in memory.

## Startup Behavior

On startup, the app calls `getCurrentAuthState()` and waits for the saved session check before showing a logged-out Profile state.

Profile shows a temporary account loading state while the session is being restored. If no saved session exists, guest mode and sign-in remain available.

## Guest Mode

Guest mode still works. If Supabase is not configured or no user is signed in, customer booking and food ordering test flows can continue without auth.

## Customer, Rider, And Admin

- Customer auth uses the persisted mobile Supabase session.
- Rider auth uses the same persisted mobile Supabase session and continues to link through the `riders.auth_user_id` relationship.
- Admin dashboard auth remains unchanged because it runs separately in the web admin app.

## Test Steps

1. Install an Android APK build.
2. Sign in from Profile.
3. Close the app completely.
4. Reopen the app.
5. Open Profile.
6. Confirm the account still shows as signed in.
7. Sign out manually and confirm guest mode returns.
