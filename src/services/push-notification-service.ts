import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

import type { AuthState } from '@/services/auth-service';
import { hasSupabaseConfig, supabase } from '@/services/supabase';
import type {
  BookingStatus,
  FoodOrderStatus,
  Json,
  NotificationRecipientType,
  TablesInsert,
} from '@/types/database';

export type PushNotificationPayload = {
  body: string;
  data?: Record<string, string>;
  title: string;
  to: string;
};

export type PushTokenStorageStatus = {
  errorMessage?: string;
  matchesCurrentToken: boolean | null;
  savedToken: string | null;
  storageTarget: 'guest' | 'profiles.push_token' | 'riders.push_token';
};

export type NotificationPermissionSummary = {
  canAskAgain?: boolean;
  granted?: boolean;
  status: string;
};

export type ReceivedNotificationSummary = {
  request: {
    content: {
      body?: string | null;
      data?: Record<string, unknown>;
      title?: string | null;
    };
  };
};

export type PushRegistrationDiagnostics = {
  androidPackageId: string | null;
  appVariant: string | null;
  expoPushToken: string | null;
  expoPushTokenErrorMessage?: string;
  expoPushTokenFormatValid: boolean;
  expoPushTokenGenerated: boolean;
  firebaseErrorMessage?: string;
  firebaseInitialized: boolean | null;
  googleServicesFileConfigured: boolean;
  isExpoGo: boolean;
  nativeDevicePushTokenGenerated: boolean;
  nativeDevicePushTokenType: string | null;
  permissionStatus: string;
  physicalDevice: boolean;
  platform: string;
  projectId: string | null;
  pushTokenSaveErrorMessage?: string;
  pushTokenSaved: boolean | null;
  storageStatus: PushTokenStorageStatus;
};

export const PUSH_EXPO_GO_UNAVAILABLE_MESSAGE = 'Push unavailable in Expo Go.';
export const PUSH_REQUIRES_APK_MESSAGE = 'Push notifications require APK/dev build.';

const expoPushTokenPattern = /^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/;
let didSetNotificationHandler = false;

const emptyAuthState: AuthState = {
  profile: null,
  session: null,
  user: null,
};

const bookingStatusNotifications: Partial<Record<BookingStatus, { body: string; title: string }>> = {
  accepted: {
    body: 'A rider accepted your booking.',
    title: 'Ride accepted',
  },
  cancelled: {
    body: 'Your ride booking was cancelled.',
    title: 'Ride cancelled',
  },
  completed: {
    body: 'Your ride is complete. Thanks for using Camotes Runner.',
    title: 'Ride completed',
  },
  runner_arriving: {
    body: 'Your rider is heading to your pickup location.',
    title: 'Runner arriving',
  },
};

const foodStatusNotifications: Partial<Record<FoodOrderStatus, { body: string; title: string }>> = {
  cancelled: {
    body: 'Your food order was cancelled.',
    title: 'Food order cancelled',
  },
  delivered: {
    body: 'Your food order has been delivered.',
    title: 'Food delivered',
  },
  on_the_way: {
    body: 'Your rider is on the way with your food.',
    title: 'Food on the way',
  },
  picked_up: {
    body: 'Your rider picked up your food order.',
    title: 'Food picked up',
  },
  preparing: {
    body: 'The restaurant is preparing your food.',
    title: 'Food preparing',
  },
};

export async function registerAndSavePushToken(authState: AuthState) {
  const diagnostics = await getPushRegistrationDiagnostics(authState, { saveToken: true });
  logPushRegistrationDiagnostics(diagnostics);
  return diagnostics.expoPushToken;
}

export async function registerForPushNotificationsAsync() {
  const diagnostics = await getPushRegistrationDiagnostics(null, { saveToken: false });
  logPushRegistrationDiagnostics(diagnostics);
  return diagnostics.expoPushToken;
}

export function isValidExpoPushToken(pushToken: string | null | undefined) {
  return typeof pushToken === 'string' && expoPushTokenPattern.test(pushToken);
}

export function isExpoGoEnvironment() {
  return Constants.appOwnership === 'expo';
}

export async function getNotificationPermissionSummary(): Promise<NotificationPermissionSummary> {
  if (isExpoGoEnvironment()) {
    return {
      canAskAgain: false,
      granted: false,
      status: PUSH_EXPO_GO_UNAVAILABLE_MESSAGE,
    };
  }

  if (Platform.OS === 'web') {
    return {
      canAskAgain: false,
      granted: false,
      status: 'Web unsupported',
    };
  }

  const notifications = await loadNotificationsModule();
  const permission = await notifications.getPermissionsAsync();

  return {
    canAskAgain: permission.canAskAgain,
    granted: permission.granted,
    status: permission.status,
  };
}

export async function addNotificationReceivedListenerIfSupported(
  onReceive: (notification: ReceivedNotificationSummary) => void
) {
  if (isExpoGoEnvironment()) {
    console.warn('Push notifications skipped in Expo Go.');
    return () => {};
  }

  if (Platform.OS === 'web') {
    return () => {};
  }

  const notifications = await loadNotificationsModule();
  const subscription = notifications.addNotificationReceivedListener(onReceive);

  return () => {
    subscription.remove();
  };
}

export async function getPushRegistrationDiagnostics(
  authState: AuthState | null,
  options: { saveToken?: boolean } = {}
): Promise<PushRegistrationDiagnostics> {
  const projectId = getExpoProjectId();
  const baseDiagnostics: PushRegistrationDiagnostics = {
    androidPackageId: getAndroidPackageId(),
    appVariant: getAppVariant(),
    expoPushToken: null,
    expoPushTokenFormatValid: false,
    expoPushTokenGenerated: false,
    firebaseInitialized: null,
    googleServicesFileConfigured: isGoogleServicesFileConfigured(),
    isExpoGo: isExpoGoEnvironment(),
    nativeDevicePushTokenGenerated: false,
    nativeDevicePushTokenType: null,
    permissionStatus: 'unknown',
    physicalDevice: Device.isDevice,
    platform: Platform.OS,
    projectId,
    pushTokenSaved: null,
    storageStatus: await getPushTokenStorageStatus(authState ?? emptyAuthState, null),
  };

  if (Platform.OS === 'web') {
    return {
      ...baseDiagnostics,
      expoPushTokenErrorMessage: 'Push tokens are only generated in native builds.',
    };
  }

  if (isExpoGoEnvironment()) {
    console.warn('Push notifications skipped in Expo Go.');
    return {
      ...baseDiagnostics,
      expoPushTokenErrorMessage: PUSH_EXPO_GO_UNAVAILABLE_MESSAGE,
      permissionStatus: PUSH_EXPO_GO_UNAVAILABLE_MESSAGE,
    };
  }

  const notifications = await loadNotificationsModule();
  ensureNotificationHandler(notifications);

  if (!Device.isDevice) {
    return {
      ...baseDiagnostics,
      expoPushTokenErrorMessage: 'Use a physical Android device or an emulator with Google Play services.',
    };
  }

  if (Platform.OS === 'android') {
    await notifications.setNotificationChannelAsync('default', {
      importance: notifications.AndroidImportance.MAX,
      lightColor: '#8BC34A',
      name: 'Default',
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const existingPermission = await notifications.getPermissionsAsync();
  let finalStatus = existingPermission.status;

  if (existingPermission.status !== 'granted') {
    const requestedPermission = await notifications.requestPermissionsAsync();
    finalStatus = requestedPermission.status;
  }

  baseDiagnostics.permissionStatus = finalStatus;

  if (finalStatus !== 'granted') {
    return {
      ...baseDiagnostics,
      expoPushTokenErrorMessage: 'Notification permission was not granted.',
    };
  }

  try {
    const nativeToken = await notifications.getDevicePushTokenAsync();
    baseDiagnostics.firebaseInitialized = true;
    baseDiagnostics.nativeDevicePushTokenGenerated = Boolean(nativeToken.data);
    baseDiagnostics.nativeDevicePushTokenType = nativeToken.type;
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    return {
      ...baseDiagnostics,
      expoPushTokenErrorMessage: errorMessage,
      firebaseErrorMessage: errorMessage,
      firebaseInitialized: false,
    };
  }

  if (!projectId) {
    return {
      ...baseDiagnostics,
      expoPushTokenErrorMessage: 'Expo project ID was not found in app config.',
    };
  }

  try {
    const tokenResult = await notifications.getExpoPushTokenAsync({ projectId });
    const expoPushToken = tokenResult.data;
    const nextDiagnostics: PushRegistrationDiagnostics = {
      ...baseDiagnostics,
      expoPushToken,
      expoPushTokenFormatValid: isValidExpoPushToken(expoPushToken),
      expoPushTokenGenerated: Boolean(expoPushToken),
      storageStatus: await getPushTokenStorageStatus(authState ?? emptyAuthState, expoPushToken),
    };

    if (options.saveToken && authState?.user && isValidExpoPushToken(expoPushToken)) {
      try {
        if (authState.profile?.role === 'rider') {
          await saveRiderPushToken(authState.user.id, expoPushToken);
        } else {
          await saveCustomerPushToken(authState.user.id, expoPushToken);
        }

        return {
          ...nextDiagnostics,
          pushTokenSaved: true,
          storageStatus: await getPushTokenStorageStatus(authState, expoPushToken),
        };
      } catch (error) {
        return {
          ...nextDiagnostics,
          pushTokenSaveErrorMessage: getErrorMessage(error),
          pushTokenSaved: false,
        };
      }
    }

    return {
      ...nextDiagnostics,
      pushTokenSaved: authState?.user ? false : null,
    };
  } catch (error) {
    return {
      ...baseDiagnostics,
      expoPushTokenErrorMessage: getErrorMessage(error),
      storageStatus: await getPushTokenStorageStatus(authState ?? emptyAuthState, null),
    };
  }
}

export async function saveCustomerPushToken(profileId: string, pushToken: string) {
  const { error } = await supabase
    .from('profiles')
    .update({ push_token: pushToken, updated_at: new Date().toISOString() })
    .eq('id', profileId);

  if (error) {
    console.error('Failed to save customer push token to Supabase', {
      error,
      profileId,
      tokenFormatValid: isValidExpoPushToken(pushToken),
    });
    throw error;
  }

  console.log('Customer push token saved to Supabase', {
    profileId,
    tokenFormatValid: isValidExpoPushToken(pushToken),
  });
}

export async function saveRiderPushToken(authUserId: string, pushToken: string) {
  const { error } = await supabase
    .from('riders')
    .update({ push_token: pushToken, updated_at: new Date().toISOString() })
    .eq('auth_user_id', authUserId);

  if (error) {
    console.error('Failed to save rider push token to Supabase', {
      authUserId,
      error,
      tokenFormatValid: isValidExpoPushToken(pushToken),
    });
    throw error;
  }

  console.log('Rider push token saved to Supabase', {
    authUserId,
    tokenFormatValid: isValidExpoPushToken(pushToken),
  });
}

export async function notifyCustomerForBookingStatus(
  bookingId: string,
  customerId: string | null,
  status: BookingStatus
) {
  const content = bookingStatusNotifications[status];

  if (!content) {
    return;
  }

  const token = customerId ? await getProfilePushToken(customerId) : null;
  await sendAndLogNotification({
    body: content.body,
    data: { bookingId, status, type: 'ride_status' },
    recipientId: customerId,
    recipientType: 'customer',
    title: content.title,
    token,
  });
}

export async function notifyCustomerForFoodStatus(
  foodOrderId: string,
  customerId: string | null,
  status: FoodOrderStatus
) {
  const content = foodStatusNotifications[status];

  if (!content) {
    return;
  }

  const token = customerId ? await getProfilePushToken(customerId) : null;
  await sendAndLogNotification({
    body: content.body,
    data: { foodOrderId, status, type: 'food_status' },
    recipientId: customerId,
    recipientType: 'customer',
    title: content.title,
    token,
  });
}

export async function sendExpoPushNotification(payload: PushNotificationPayload) {
  if (!isValidExpoPushToken(payload.to)) {
    const error = new Error('Invalid Expo push token format.');
    console.error('Expo push send failed before request', {
      error,
      tokenFormatValid: false,
      tokenPreview: previewPushToken(payload.to),
    });
    throw error;
  }

  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    body: JSON.stringify({
      body: payload.body,
      data: payload.data ?? {},
      sound: 'default',
      title: payload.title,
      to: payload.to,
    }),
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });
  const responseText = await response.text();
  const responseBody = parseExpoResponse(responseText);
  const responseLog = {
    body: responseBody,
    status: response.status,
    tokenFormatValid: isValidExpoPushToken(payload.to),
    tokenPreview: previewPushToken(payload.to),
  };

  if (!response.ok) {
    console.error('Expo push send failed', responseLog);
    throw new Error(`Expo push service returned ${response.status}: ${responseText}`);
  }

  console.log('Expo push send response', responseLog);
  return responseBody;
}

export async function getPushTokenStorageStatus(
  authState: AuthState,
  currentToken: string | null
): Promise<PushTokenStorageStatus> {
  if (!hasSupabaseConfig) {
    return {
      errorMessage: 'Supabase is not configured.',
      matchesCurrentToken: null,
      savedToken: null,
      storageTarget: 'guest',
    };
  }

  if (!authState.user) {
    return {
      errorMessage: 'No signed-in user. Guest mode does not save push tokens.',
      matchesCurrentToken: null,
      savedToken: null,
      storageTarget: 'guest',
    };
  }

  if (authState.profile?.role === 'rider') {
    const { data, error } = await supabase
      .from('riders')
      .select('push_token')
      .eq('auth_user_id', authState.user.id)
      .maybeSingle();

    if (error) {
      console.error('Failed to verify rider push token in Supabase', error);
      return {
        errorMessage: error.message,
        matchesCurrentToken: null,
        savedToken: null,
        storageTarget: 'riders.push_token',
      };
    }

    return {
      matchesCurrentToken: currentToken ? data?.push_token === currentToken : null,
      savedToken: data?.push_token ?? null,
      storageTarget: 'riders.push_token',
    };
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('push_token')
    .eq('id', authState.user.id)
    .maybeSingle();

  if (error) {
    console.error('Failed to verify customer push token in Supabase', error);
    return {
      errorMessage: error.message,
      matchesCurrentToken: null,
      savedToken: null,
      storageTarget: 'profiles.push_token',
    };
  }

  return {
    matchesCurrentToken: currentToken ? data?.push_token === currentToken : null,
    savedToken: data?.push_token ?? null,
    storageTarget: 'profiles.push_token',
  };
}

export async function sendDebugPushNotification(authState: AuthState, pushToken: string) {
  const title = 'Camotes Runner test';
  const body = 'Your push notification test reached this device.';
  const data = { type: 'debug_test' };
  const response = await sendExpoPushNotification({
    body,
    data,
    title,
    to: pushToken,
  });

  try {
    await logNotification({
      body,
      data,
      push_token: pushToken,
      recipient_id: authState.user?.id ?? null,
      recipient_type: authState.profile?.role === 'rider' ? 'rider' : 'customer',
      status: 'sent',
      title,
    });
  } catch (error) {
    console.error('Failed to log debug test notification', error);
  }

  return response;
}

async function getProfilePushToken(profileId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('push_token')
    .eq('id', profileId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.push_token ?? null;
}

async function sendAndLogNotification({
  body,
  data = {},
  recipientId,
  recipientType,
  title,
  token,
}: {
  body: string;
  data?: Record<string, string>;
  recipientId: string | null;
  recipientType: NotificationRecipientType;
  title: string;
  token: string | null;
}) {
  if (!token) {
    await logSkippedNotification(recipientType, recipientId, title, body, data);
    return;
  }

  if (!isValidExpoPushToken(token)) {
    const errorMessage = 'Invalid Expo push token format.';
    console.error('Notification skipped because push token format is invalid', {
      recipientId,
      recipientType,
      tokenPreview: previewPushToken(token),
    });
    await logNotification({
      body,
      data: data as Json,
      error_message: errorMessage,
      push_token: token,
      recipient_id: recipientId,
      recipient_type: recipientType,
      status: 'failed',
      title,
    });
    return;
  }

  try {
    await sendExpoPushNotification({ body, data, title, to: token });
    await logNotification({
      body,
      data: data as Json,
      push_token: token,
      recipient_id: recipientId,
      recipient_type: recipientType,
      status: 'sent',
      title,
    });
  } catch (error) {
    await logNotification({
      body,
      data: data as Json,
      error_message: getErrorMessage(error),
      push_token: token,
      recipient_id: recipientId,
      recipient_type: recipientType,
      status: 'failed',
      title,
    });
    throw error;
  }
}

export async function logNotification(input: TablesInsert<'notification_logs'>) {
  const { error } = await supabase.from('notification_logs').insert(input);

  if (error) {
    throw error;
  }
}

export async function logSkippedNotification(
  recipientType: NotificationRecipientType,
  recipientId: string | null,
  title: string,
  body: string,
  data: Record<string, string> = {},
  errorMessage = 'No push token available.'
) {
  await logNotification({
    body,
    data: data as Json,
    error_message: errorMessage,
    push_token: null,
    recipient_id: recipientId,
    recipient_type: recipientType,
    status: 'skipped',
    title,
  });
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'object' && error && 'message' in error) {
    return String(error.message);
  }

  return 'Unable to send notification.';
}

function parseExpoResponse(responseText: string) {
  try {
    return JSON.parse(responseText) as unknown;
  } catch {
    return responseText;
  }
}

function previewPushToken(pushToken: string) {
  if (pushToken.length <= 18) {
    return pushToken;
  }

  return `${pushToken.slice(0, 14)}...${pushToken.slice(-4)}`;
}

function getExpoProjectId() {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId ??
    null
  );
}

function getAppVariant() {
  const appVariant = Constants.expoConfig?.extra?.appVariant;
  return typeof appVariant === 'string' ? appVariant : null;
}

function getAndroidPackageId() {
  return Constants.expoConfig?.android?.package ?? null;
}

function isGoogleServicesFileConfigured() {
  const firebaseExtra = Constants.expoConfig?.extra?.firebase;

  if (
    typeof firebaseExtra === 'object' &&
    firebaseExtra !== null &&
    'googleServicesFileConfigured' in firebaseExtra
  ) {
    return Boolean(firebaseExtra.googleServicesFileConfigured);
  }

  return Boolean(Constants.expoConfig?.android?.googleServicesFile);
}

function logPushRegistrationDiagnostics(diagnostics: PushRegistrationDiagnostics) {
  console.log('Push startup diagnostics', {
    androidPackageId: diagnostics.androidPackageId,
    appVariant: diagnostics.appVariant,
    expoPushTokenGenerated: diagnostics.expoPushTokenGenerated,
    expoPushTokenFormatValid: diagnostics.expoPushTokenFormatValid,
    firebaseInitialized: diagnostics.firebaseInitialized,
    googleServicesFileConfigured: diagnostics.googleServicesFileConfigured,
    isExpoGo: diagnostics.isExpoGo,
    nativeDevicePushTokenGenerated: diagnostics.nativeDevicePushTokenGenerated,
    permissionStatus: diagnostics.permissionStatus,
    physicalDevice: diagnostics.physicalDevice,
    platform: diagnostics.platform,
    projectId: diagnostics.projectId,
    pushTokenSaved: diagnostics.pushTokenSaved,
    storageTarget: diagnostics.storageStatus.storageTarget,
    tokenSavedInSupabase: Boolean(diagnostics.storageStatus.savedToken),
  });

  if (diagnostics.isExpoGo) {
    console.warn('Push notifications skipped in Expo Go.');
  }

  if (diagnostics.firebaseErrorMessage) {
    console.error('Push Firebase initialization diagnostic failed', {
      errorMessage: diagnostics.firebaseErrorMessage,
      googleServicesFileConfigured: diagnostics.googleServicesFileConfigured,
      packageId: diagnostics.androidPackageId,
    });
  }

  if (diagnostics.expoPushTokenErrorMessage) {
    console.error('Expo push token diagnostic failed', {
      errorMessage: diagnostics.expoPushTokenErrorMessage,
      packageId: diagnostics.androidPackageId,
      projectId: diagnostics.projectId,
    });
  }

  if (diagnostics.pushTokenSaveErrorMessage) {
    console.error('Push token Supabase save diagnostic failed', {
      errorMessage: diagnostics.pushTokenSaveErrorMessage,
      storageTarget: diagnostics.storageStatus.storageTarget,
    });
  }
}

async function loadNotificationsModule() {
  if (isExpoGoEnvironment()) {
    throw new Error(PUSH_REQUIRES_APK_MESSAGE);
  }

  return import('expo-notifications');
}

function ensureNotificationHandler(notifications: Awaited<ReturnType<typeof loadNotificationsModule>>) {
  if (didSetNotificationHandler) {
    return;
  }

  notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  didSetNotificationHandler = true;
}
