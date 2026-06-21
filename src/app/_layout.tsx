import Constants from 'expo-constants';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { getCurrentAuthState, subscribeToAuthChanges, type AuthState } from '@/services/auth-service';
import { BookingSimulationProvider } from '@/services/booking-simulation';
import { FoodCartProvider } from '@/services/food-cart';
import { FoodOrderStatusProvider } from '@/services/food-order-status';
import { PartnerCartProvider } from '@/services/partner-cart';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <BookingSimulationProvider>
        <FoodCartProvider>
          <PartnerCartProvider>
            <FoodOrderStatusProvider>
              <PushNotificationBootstrap />
              <AnimatedSplashOverlay />
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="category/[id]" />
                <Stack.Screen name="partner/[id]" />
                <Stack.Screen name="partner-cart/[partnerId]" />
                <Stack.Screen name="partner-checkout/[partnerId]" />
                <Stack.Screen name="partner-order/[id]" />
                <Stack.Screen name="partner-order-success/[id]" />
                <Stack.Screen name="restaurants" />
                <Stack.Screen name="restaurant/[id]" />
                <Stack.Screen name="cart" />
                <Stack.Screen name="food-checkout" />
                <Stack.Screen name="food-tracking" />
                <Stack.Screen name="matching" />
                <Stack.Screen name="runner-found" />
                <Stack.Screen name="tracking" />
                <Stack.Screen name="rider" />
                <Stack.Screen name="notification-debug" />
              </Stack>
            </FoodOrderStatusProvider>
          </PartnerCartProvider>
        </FoodCartProvider>
      </BookingSimulationProvider>
    </ThemeProvider>
  );
}

function PushNotificationBootstrap() {
  useEffect(() => {
    if (isExpoGoEnvironment()) {
      console.warn('Push notifications skipped in Expo Go.');
      return undefined;
    }

    let isMounted = true;

    async function registerCurrentUser() {
      try {
        const authState = await getCurrentAuthState();

        if (isMounted) {
          await registerPushNotifications(authState);
        }
      } catch (error) {
        console.error('Unable to register push notification token', error);
      }
    }

    void registerCurrentUser();

    const unsubscribe = subscribeToAuthChanges((authState) => {
      void registerPushNotifications(authState).catch((error) => {
        console.error('Unable to register push notification token after auth change', error);
      });
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  return null;
}

function isExpoGoEnvironment() {
  return Constants.appOwnership === 'expo';
}

async function registerPushNotifications(authState: AuthState) {
  const { registerAndSavePushToken } = await import('@/services/push-notification-service');
  await registerAndSavePushToken(authState);
}
