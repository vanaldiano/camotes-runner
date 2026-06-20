import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

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

export function RunnerFoundScreen() {
  const {
    booking,
    setAssignedRider,
    setAssignedRiderId,
    setLiveStatusAvailable,
    setStatus,
  } = useBookingSimulation();
  const [liveSupabaseBooking, setLiveSupabaseBooking] = useState<SupabaseBooking | null>(null);
  const [riderLocation, setRiderLocation] = useState<RiderLocation | null>(null);
  const runner = booking?.runner;
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
        staticEta: runner?.eta,
        status: booking?.status,
      }),
    [
      booking?.status,
      booking?.supabaseBookingId,
      liveSupabaseBooking?.destination_lat,
      liveSupabaseBooking?.destination_lng,
      liveSupabaseBooking?.pickup_lat,
      liveSupabaseBooking?.pickup_lng,
      riderLocation?.latitude,
      riderLocation?.longitude,
      runner?.eta,
    ]
  );

  useEffect(() => {
    if (!booking) {
      router.replace('/book');
    }
  }, [booking]);

  useEffect(() => {
    if (!booking?.supabaseBookingId || !hasSupabaseConfig) {
      return;
    }

    let isMounted = true;

    async function syncAssignedRider() {
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

        if (!supabaseBooking.assigned_rider_id) {
          setAssignedRiderId(null);
          setRiderLocation(null);
          return;
        }

        const rider = await getRiderById(supabaseBooking.assigned_rider_id);

        if (isMounted) {
          setAssignedRider(mapRiderToRunner(rider), rider.id);
        }

        if (supabaseBooking.status !== 'completed' && supabaseBooking.status !== 'cancelled') {
          try {
            const latestRiderLocation = await getLatestRiderLocationForBooking(supabaseBooking.id);

            if (isMounted) {
              setRiderLocation(latestRiderLocation);
            }
          } catch (locationError) {
            console.error('Unable to load runner found rider location', locationError);

            if (isMounted) {
              setRiderLocation(null);
            }
          }
        }
      } catch {
        if (isMounted) {
          setLiveStatusAvailable(false);
          setAssignedRiderId(null);
        }
      }
    }

    syncAssignedRider();

    const interval = setInterval(syncAssignedRider, 5000);

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

  const runnerDetails = [
    { label: 'Motorcycle', value: runner?.motorcycle ?? 'Honda Click 125' },
    { label: 'Plate Number', value: runner?.plateNumber ?? 'CAM-0426' },
    { label: 'Rating', value: runner?.rating ?? '4.9' },
    { label: 'Distance Away', value: runner?.distanceAway ?? '1.2 km away' },
    { label: 'ETA', value: runnerCardEta },
  ];

  return (
    <AppScreen>
      <View style={styles.hero}>
        <View style={styles.photo}>
          <Text style={styles.photoText}>JD</Text>
        </View>
        <Text style={styles.runnerName}>{runner?.name ?? 'Juan Dela Cruz'}</Text>
        <Text style={styles.runnerRole}>Verified Camotes Runner</Text>
        <Text style={styles.statusText}>Status: {booking?.status ?? 'Accepted'}</Text>
      </View>

      <View style={styles.detailsCard}>
        {runnerDetails.map((detail) => (
          <View key={detail.label} style={styles.detailRow}>
            <Text style={styles.detailLabel}>{detail.label}</Text>
            <Text style={styles.detailValue}>{detail.value}</Text>
          </View>
        ))}
      </View>

      <View style={styles.actionRow}>
        <ContactButton
          label="Call"
          icon={{ ios: 'phone.fill', android: 'call', web: 'call' }}
        />
        <ContactButton
          label="Message"
          icon={{ ios: 'message.fill', android: 'chat', web: 'chat' }}
        />
      </View>

      <PrimaryButton title="Track Runner" variant="secondary" onPress={() => router.push('/tracking')} />
      <PrimaryButton title="Accept Ride" onPress={() => router.push('/tracking')} />
    </AppScreen>
  );
}

type ContactButtonProps = {
  icon: { ios: string; android: string; web: string };
  label: string;
};

function ContactButton({ icon, label }: ContactButtonProps) {
  return (
    <View style={styles.contactButton}>
      <AppIcon backgroundColor={BrandColors.softGreen} name={icon} size={22} style={styles.contactIcon} />
      <Text style={styles.contactText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: 28,
    backgroundColor: BrandColors.darkGreen,
    padding: 24,
    alignItems: 'center',
  },
  photo: {
    width: 112,
    height: 112,
    borderRadius: 42,
    backgroundColor: BrandColors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 5,
    borderColor: BrandColors.white,
  },
  photoText: {
    color: BrandColors.darkGreen,
    fontSize: 34,
    fontWeight: '900',
  },
  runnerName: {
    color: BrandColors.white,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '900',
    marginTop: 16,
  },
  runnerRole: {
    color: '#DFF3E4',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
  statusText: {
    color: BrandColors.yellow,
    fontSize: 13,
    fontWeight: '900',
    marginTop: 10,
  },
  detailsCard: {
    borderRadius: 24,
    backgroundColor: BrandColors.white,
    borderWidth: 1,
    borderColor: BrandColors.border,
    padding: 16,
    gap: 4,
  },
  detailRow: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: BrandColors.border,
  },
  detailLabel: {
    color: BrandColors.mutedInk,
    fontSize: 14,
    fontWeight: '800',
  },
  detailValue: {
    color: BrandColors.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  contactButton: {
    flex: 1,
    minHeight: 78,
    borderRadius: 24,
    backgroundColor: BrandColors.white,
    borderWidth: 1,
    borderColor: BrandColors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  contactIcon: {
    width: 38,
    height: 38,
    borderRadius: 15,
  },
  contactText: {
    color: BrandColors.ink,
    fontSize: 14,
    fontWeight: '900',
  },
});
