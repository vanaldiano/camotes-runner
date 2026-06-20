import * as Device from 'expo-device';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/app-screen';
import { PrimaryButton } from '@/components/primary-button';
import { ScreenHeader } from '@/components/screen-header';
import { BrandColors } from '@/constants/brand';
import { getCurrentAuthState, getUserRole, type AuthState } from '@/services/auth-service';
import {
  addNotificationReceivedListenerIfSupported,
  getPushRegistrationDiagnostics,
  getPushTokenStorageStatus,
  getNotificationPermissionSummary,
  isExpoGoEnvironment,
  isValidExpoPushToken,
  PUSH_EXPO_GO_UNAVAILABLE_MESSAGE,
  PUSH_REQUIRES_APK_MESSAGE,
  sendDebugPushNotification,
  type NotificationPermissionSummary,
  type PushRegistrationDiagnostics,
  type PushTokenStorageStatus,
} from '@/services/push-notification-service';

const emptyAuthState: AuthState = {
  profile: null,
  session: null,
  user: null,
};

export function NotificationDebugScreen() {
  const [authState, setAuthState] = useState<AuthState>(emptyAuthState);
  const [deviceType, setDeviceType] = useState('Loading...');
  const [errorMessage, setErrorMessage] = useState('');
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [lastNotification, setLastNotification] = useState('No notification received yet.');
  const [lastSendResponse, setLastSendResponse] = useState('No test notification sent yet.');
  const [permission, setPermission] = useState<NotificationPermissionSummary>({ status: 'Loading...' });
  const [registrationDiagnostics, setRegistrationDiagnostics] =
    useState<PushRegistrationDiagnostics | null>(null);
  const [storageStatus, setStorageStatus] = useState<PushTokenStorageStatus>({
    matchesCurrentToken: null,
    savedToken: null,
    storageTarget: 'guest',
  });

  useEffect(() => {
    void refreshDiagnostics();

    let isMounted = true;
    let removeListener: (() => void) | undefined;

    void addNotificationReceivedListenerIfSupported((notification) => {
      if (!isMounted) {
        return;
      }

      const content = notification.request.content;
      setLastNotification(
        JSON.stringify(
          {
            body: content.body,
            data: content.data,
            receivedAt: new Date().toISOString(),
            title: content.title,
          },
          null,
          2
        )
      );
    }).then((unsubscribe) => {
      removeListener = unsubscribe;
    });

    return () => {
      isMounted = false;
      removeListener?.();
    };
  }, []);

  async function refreshDiagnostics() {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const [permissionResult, currentAuthState, resolvedDeviceType] = await Promise.all([
        getNotificationPermissionSummary(),
        getCurrentAuthState(),
        getReadableDeviceType(),
      ]);

      setPermission(permissionResult);
      setAuthState(currentAuthState);
      setDeviceType(resolvedDeviceType);

      const diagnostics = await getPushRegistrationDiagnostics(currentAuthState, { saveToken: true });
      const refreshedPermission = await getNotificationPermissionSummary();
      setPermission(refreshedPermission);
      setRegistrationDiagnostics(diagnostics);
      setExpoPushToken(diagnostics.expoPushToken);
      setStorageStatus(await getPushTokenStorageStatus(currentAuthState, diagnostics.expoPushToken));
    } catch (error) {
      const message = getErrorMessage(error);
      console.error('Notification diagnostics failed', error);
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleTestNotification() {
    if (!expoPushToken || !isValidExpoPushToken(expoPushToken)) {
      setLastSendResponse('Cannot send test. Expo push token is missing or invalid.');
      return;
    }

    setIsSending(true);
    setLastSendResponse('Sending test notification...');

    try {
      const response = await sendDebugPushNotification(authState, expoPushToken);
      setLastSendResponse(JSON.stringify(response, null, 2));
    } catch (error) {
      const message = getErrorMessage(error);
      console.error('Test notification failed', error);
      setLastSendResponse(message);
    } finally {
      setIsSending(false);
    }
  }

  const tokenFormatLabel = expoPushToken
    ? isValidExpoPushToken(expoPushToken)
      ? 'Valid ExpoPushToken format'
      : 'Invalid ExpoPushToken format'
    : 'No Expo push token';
  const role = getUserRole(authState.user, authState.profile);

  return (
    <AppScreen>
      <ScreenHeader showHomeButton title="Notification Debug" />

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Device</Text>
        <DebugRow label="Platform" value={Platform.OS} />
        <DebugRow label="Expo Go" value={isExpoGoEnvironment() ? 'Yes' : 'No'} />
        <DebugRow label="Device type" value={deviceType} />
        <DebugRow label="Physical device" value={Device.isDevice ? 'Yes' : 'No'} />
        <DebugRow label="App variant" value={registrationDiagnostics?.appVariant ?? 'Unknown'} />
        <DebugRow
          label="Android package"
          value={registrationDiagnostics?.androidPackageId ?? 'Unknown'}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Permission</Text>
        <DebugRow label="Status" value={permission.status} />
        <DebugRow label="Granted" value={toYesNo(permission.granted)} />
        <DebugRow label="Can ask again" value={toYesNo(permission.canAskAgain)} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Expo Token</Text>
        {isExpoGoEnvironment() ? (
          <Text style={styles.warningText}>
            {PUSH_EXPO_GO_UNAVAILABLE_MESSAGE} {PUSH_REQUIRES_APK_MESSAGE}
          </Text>
        ) : null}
        <DebugRow
          label="Project ID"
          value={registrationDiagnostics?.projectId ?? 'Missing'}
        />
        <DebugRow label="Format" value={tokenFormatLabel} />
        <DebugRow
          label="Generated"
          value={toYesNo(registrationDiagnostics?.expoPushTokenGenerated)}
        />
        <Text selectable style={styles.tokenText}>
          {expoPushToken ?? 'No token returned. Use a physical APK build with permission granted.'}
        </Text>
        {registrationDiagnostics?.expoPushTokenErrorMessage ? (
          <Text style={styles.errorText}>{registrationDiagnostics.expoPushTokenErrorMessage}</Text>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Firebase Native Status</Text>
        <DebugRow
          label="Config file"
          value={toYesNo(registrationDiagnostics?.googleServicesFileConfigured)}
        />
        <DebugRow
          label="Firebase initialized"
          value={toYesNo(registrationDiagnostics?.firebaseInitialized)}
        />
        <DebugRow
          label="Native token"
          value={toYesNo(registrationDiagnostics?.nativeDevicePushTokenGenerated)}
        />
        <DebugRow
          label="Native token type"
          value={registrationDiagnostics?.nativeDevicePushTokenType ?? 'Unknown'}
        />
        {registrationDiagnostics?.firebaseErrorMessage ? (
          <Text style={styles.errorText}>{registrationDiagnostics.firebaseErrorMessage}</Text>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Supabase Registration</Text>
        <DebugRow label="Login role" value={authState.user ? role : 'Guest'} />
        <DebugRow label="Target" value={storageStatus.storageTarget} />
        <DebugRow
          label="Startup save"
          value={toYesNo(registrationDiagnostics?.pushTokenSaved)}
        />
        <DebugRow label="Token saved" value={storageStatus.savedToken ? 'Yes' : 'No'} />
        <DebugRow label="Matches device" value={toYesNo(storageStatus.matchesCurrentToken)} />
        {registrationDiagnostics?.pushTokenSaveErrorMessage ? (
          <Text style={styles.errorText}>{registrationDiagnostics.pushTokenSaveErrorMessage}</Text>
        ) : null}
        {storageStatus.errorMessage ? (
          <Text style={styles.errorText}>{storageStatus.errorMessage}</Text>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Last Notification Received</Text>
        <Text selectable style={styles.monoText}>
          {lastNotification}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Test Send Response</Text>
        <Text selectable style={styles.monoText}>
          {lastSendResponse}
        </Text>
      </View>

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      <PrimaryButton
        disabled={isLoading}
        title={isLoading ? 'Refreshing...' : 'Refresh Diagnostics'}
        variant="secondary"
        onPress={refreshDiagnostics}
      />
      <PrimaryButton
        disabled={isSending || !expoPushToken || !isValidExpoPushToken(expoPushToken)}
        title={isSending ? 'Sending...' : 'Test Notification'}
        onPress={handleTestNotification}
      />
    </AppScreen>
  );
}

function DebugRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text selectable style={styles.rowValue}>
        {value}
      </Text>
    </View>
  );
}

async function getReadableDeviceType() {
  try {
    const deviceType = await Device.getDeviceTypeAsync();

    switch (deviceType) {
      case Device.DeviceType.PHONE:
        return 'Phone';
      case Device.DeviceType.TABLET:
        return 'Tablet';
      case Device.DeviceType.DESKTOP:
        return 'Desktop';
      case Device.DeviceType.TV:
        return 'TV';
      default:
        return 'Unknown';
    }
  } catch {
    return 'Unavailable';
  }
}

function toYesNo(value: boolean | null | undefined) {
  if (typeof value !== 'boolean') {
    return 'Unknown';
  }

  return value ? 'Yes' : 'No';
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'object' && error && 'message' in error) {
    return String(error.message);
  }

  return 'Notification diagnostics are temporarily unavailable.';
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.border,
    borderRadius: 24,
    borderWidth: 1,
    gap: 10,
    padding: 16,
  },
  cardTitle: {
    color: BrandColors.ink,
    fontSize: 17,
    fontWeight: '900',
  },
  errorText: {
    color: BrandColors.danger,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 19,
  },
  monoText: {
    backgroundColor: BrandColors.mint,
    borderColor: BrandColors.border,
    borderRadius: 16,
    borderWidth: 1,
    color: BrandColors.ink,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
    padding: 12,
  },
  row: {
    alignItems: 'flex-start',
    borderTopColor: BrandColors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingTop: 10,
  },
  rowLabel: {
    color: BrandColors.mutedInk,
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
  },
  rowValue: {
    color: BrandColors.ink,
    flex: 1.2,
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'right',
  },
  tokenText: {
    backgroundColor: BrandColors.mint,
    borderColor: BrandColors.border,
    borderRadius: 16,
    borderWidth: 1,
    color: BrandColors.ink,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 18,
    padding: 12,
  },
  warningText: {
    backgroundColor: BrandColors.paleYellow,
    borderColor: BrandColors.yellow,
    borderRadius: 16,
    borderWidth: 1,
    color: BrandColors.darkGreen,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 19,
    padding: 12,
  },
});
