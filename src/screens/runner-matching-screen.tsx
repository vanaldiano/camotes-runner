import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { AppIcon } from '@/components/app-icon';
import { AppScreen } from '@/components/app-screen';
import { PrimaryButton } from '@/components/primary-button';
import { BrandColors } from '@/constants/brand';
import { getBookingById, type Booking as SupabaseBooking } from '@/services/booking-service';
import { toSimulationStatus } from '@/services/booking-status';
import { useBookingSimulation } from '@/services/booking-simulation';
import { getCustomerRunnerCardEta } from '@/services/customer-runner-eta-service';
import {
  getLatestRiderLocationForBooking,
  type RiderLocation,
} from '@/services/rider-location-service';
import { getRiderById, mapRiderToRunner } from '@/services/rider-service';
import { hasSupabaseConfig } from '@/services/supabase';

export function RunnerMatchingScreen() {
  const pulse = useSharedValue(1);
  const [liveSupabaseBooking, setLiveSupabaseBooking] = useState<SupabaseBooking | null>(null);
  const [riderLocation, setRiderLocation] = useState<RiderLocation | null>(null);
  const {
    booking,
    resetBooking,
    setAssignedRider,
    setAssignedRiderId,
    setLiveStatusAvailable,
    setStatus,
  } = useBookingSimulation();
  const runnerCardEta = useMemo(
    () =>
      getCustomerRunnerCardEta({
        bookingId: booking?.supabaseBookingId,
        destinationLat: liveSupabaseBooking?.destination_lat,
        destinationLng: liveSupabaseBooking?.destination_lng,
        isRealBooking: Boolean(booking?.supabaseBookingId),
        pickupLat: liveSupabaseBooking?.pickup_lat,
        pickupLng: liveSupabaseBooking?.pickup_lng,
        riderLat: riderLocation?.latitude,
        riderLng: riderLocation?.longitude,
        staticEta: booking?.runner.eta,
        status: booking?.status,
      }),
    [
      booking?.runner.eta,
      booking?.status,
      booking?.supabaseBookingId,
      liveSupabaseBooking?.destination_lat,
      liveSupabaseBooking?.destination_lng,
      liveSupabaseBooking?.pickup_lat,
      liveSupabaseBooking?.pickup_lng,
      riderLocation?.latitude,
      riderLocation?.longitude,
    ]
  );

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1.22, { duration: 1100 }), -1, true);
  }, [pulse]);

  useEffect(() => {
    if (!booking) {
      router.replace('/book');
      return;
    }

    if (booking.status === 'Cancelled') {
      router.replace('/tracking');
      return;
    }

    if (booking.status !== 'Pending') {
      router.replace('/runner-found');
    }
  }, [booking]);

  useEffect(() => {
    if (!booking?.supabaseBookingId || !hasSupabaseConfig) {
      return;
    }

    let isMounted = true;

    async function syncBookingStatus() {
      if (!booking?.supabaseBookingId) {
        return;
      }

      try {
        const supabaseBooking = await getBookingById(booking.supabaseBookingId);

        if (!isMounted) {
          return;
        }

        setLiveStatusAvailable(true);
        setLiveSupabaseBooking(supabaseBooking);
        setStatus(toSimulationStatus(supabaseBooking.status));
        await syncAssignedRider(supabaseBooking.assigned_rider_id);
        await syncRiderLocation(supabaseBooking);
      } catch {
        if (isMounted) {
          setLiveStatusAvailable(false);
        }
      }
    }

    async function syncAssignedRider(assignedRiderId: string | null) {
      if (!assignedRiderId) {
        setAssignedRiderId(null);
        setRiderLocation(null);
        return;
      }

      try {
        const rider = await getRiderById(assignedRiderId);

        if (isMounted) {
          setAssignedRider(mapRiderToRunner(rider), rider.id);
        }
      } catch {
        if (isMounted) {
          setAssignedRiderId(null);
        }
      }
    }

    async function syncRiderLocation(supabaseBooking: SupabaseBooking) {
      if (
        !supabaseBooking.assigned_rider_id ||
        supabaseBooking.status === 'completed' ||
        supabaseBooking.status === 'cancelled'
      ) {
        if (isMounted) {
          setRiderLocation(null);
        }
        return;
      }

      try {
        const latestRiderLocation = await getLatestRiderLocationForBooking(supabaseBooking.id);

        if (isMounted) {
          setRiderLocation(latestRiderLocation);
        }
      } catch (locationError) {
        console.error('Unable to load matching rider location', locationError);

        if (isMounted) {
          setRiderLocation(null);
        }
      }
    }

    syncBookingStatus();

    const interval = setInterval(syncBookingStatus, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [
    booking?.supabaseBookingId,
    setAssignedRider,
    setAssignedRiderId,
    setLiveStatusAvailable,
    setStatus,
  ]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: 1.8 - pulse.value,
    transform: [{ scale: pulse.value }],
  }));

  return (
    <AppScreen>
      <View style={styles.container}>
        <View style={styles.pulseWrap}>
          <Animated.View style={[styles.pulseRing, pulseStyle]} />
          <View style={styles.runnerCore}>
            <AppIcon
              backgroundColor={BrandColors.yellow}
              color={BrandColors.darkGreen}
              name={{ ios: 'motorcycle', android: 'two_wheeler', web: 'two_wheeler' }}
              size={44}
              style={styles.runnerIcon}
            />
          </View>
        </View>

        <View style={styles.copy}>
          <Text style={styles.title}>Searching for available runner...</Text>
          <Text style={styles.subtitle}>
            We are checking nearby Camotes Runner riders for your {booking?.serviceType ?? 'service'} request.
          </Text>
        </View>

        <View style={styles.waitCard}>
          <Text style={styles.waitLabel}>Estimated wait time</Text>
          <Text style={styles.waitTime}>{runnerCardEta}</Text>
          <Text style={styles.statusText}>Status: {booking?.status ?? 'Pending'}</Text>
        </View>

        <PrimaryButton
          title="Cancel Search"
          variant="danger"
          onPress={() => {
            resetBooking();
            router.replace('/book');
          }}
        />
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 620,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  pulseWrap: {
    width: 188,
    height: 188,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 172,
    height: 172,
    borderRadius: 86,
    backgroundColor: BrandColors.softGreen,
    borderWidth: 1,
    borderColor: BrandColors.limeGreen,
  },
  runnerCore: {
    width: 124,
    height: 124,
    borderRadius: 48,
    backgroundColor: BrandColors.green,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BrandColors.cardShadow,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 8,
  },
  runnerIcon: {
    width: 78,
    height: 78,
    borderRadius: 30,
  },
  copy: {
    gap: 10,
    alignItems: 'center',
  },
  title: {
    color: BrandColors.ink,
    fontSize: 25,
    lineHeight: 31,
    textAlign: 'center',
    fontWeight: '900',
  },
  subtitle: {
    color: BrandColors.mutedInk,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    fontWeight: '600',
  },
  waitCard: {
    width: '100%',
    borderRadius: 24,
    backgroundColor: BrandColors.white,
    borderWidth: 1,
    borderColor: BrandColors.border,
    padding: 18,
    alignItems: 'center',
  },
  waitLabel: {
    color: BrandColors.mutedInk,
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  waitTime: {
    color: BrandColors.green,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '900',
    marginTop: 4,
  },
  statusText: {
    color: BrandColors.mutedInk,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 8,
  },
});
