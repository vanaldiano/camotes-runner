import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { AppScreen } from '@/components/app-screen';
import { InfoCard } from '@/components/info-card';
import { PrimaryButton } from '@/components/primary-button';
import { RiderLocationMap } from '@/components/rider-location-map';
import { SectionHeader } from '@/components/section-header';
import { BrandColors } from '@/constants/brand';
import { getBookingById, type Booking as SupabaseBooking } from '@/services/booking-service';
import { toSimulationStatus } from '@/services/booking-status';
import { useBookingSimulation, type BookingStatus } from '@/services/booking-simulation';
import {
  subscribeToBookingChanges,
  subscribeToRiderLocationForBooking,
} from '@/services/realtime-service';
import {
  getSafeGoogleMapsSearchUrl,
  openGoogleMaps,
  openGoogleMapsDirections,
  openGoogleMapsUrlDirect,
  type LocationPoint,
} from '@/services/location-service';
import {
  calculateDistanceKm,
  estimateEtaMinutes,
  formatDistance,
  formatEta,
} from '@/services/eta-service';
import { getCustomerRunnerCardEta } from '@/services/customer-runner-eta-service';
import {
  getLatestRiderLocationForBooking,
  type RiderLocation,
} from '@/services/rider-location-service';
import { getRiderById, mapRiderToRunner } from '@/services/rider-service';
import { hasSupabaseConfig } from '@/services/supabase';

const activeTrackingStatuses: BookingStatus[] = [
  'Pending',
  'Accepted',
  'Runner Arriving',
  'In Progress',
];

export function BookingTrackingScreen() {
  const {
    booking,
    resetBooking,
    setAssignedRider,
    setAssignedRiderId,
    setLiveStatusAvailable,
    setStatus,
    statuses,
  } = useBookingSimulation();
  const [syncMessage, setSyncMessage] = useState('');
  const [liveSupabaseBooking, setLiveSupabaseBooking] = useState<SupabaseBooking | null>(null);
  const [riderLocation, setRiderLocation] = useState<RiderLocation | null>(null);
  const riderLocationFetchLogKeys = useRef(new Set<string>());
  const isCancelled = booking?.status === 'Cancelled';
  const isCompleted = booking?.status === 'Completed';
  const isFinalStatus = Boolean(isCancelled || isCompleted);
  const shouldKeepTracking = booking ? activeTrackingStatuses.includes(booking.status) : false;
  const timelineStatuses: BookingStatus[] = isCancelled ? ['Cancelled'] : statuses;
  const currentStatusIndex = booking ? Math.max(timelineStatuses.indexOf(booking.status), 0) : 0;
  const progressPercent = (
    booking ? `${((currentStatusIndex + 1) / timelineStatuses.length) * 100}%` : '20%'
  ) as `${number}%`;
  const canTrackRiderLocation = Boolean(
    booking?.supabaseBookingId &&
      hasSupabaseConfig &&
      !isFinalStatus &&
      liveSupabaseBooking?.assigned_rider_id
  );
  const visibleRiderLocation = canTrackRiderLocation ? riderLocation : null;
  const visibleRiderPoint = useMemo(
    () =>
      visibleRiderLocation
        ? getLocationPoint(visibleRiderLocation.latitude, visibleRiderLocation.longitude)
        : null,
    [visibleRiderLocation]
  );
  const pickupPoint = useMemo(
    () => getLocationPoint(liveSupabaseBooking?.pickup_lat, liveSupabaseBooking?.pickup_lng),
    [liveSupabaseBooking?.pickup_lat, liveSupabaseBooking?.pickup_lng]
  );
  const destinationPoint = useMemo(
    () =>
      getLocationPoint(liveSupabaseBooking?.destination_lat, liveSupabaseBooking?.destination_lng),
    [liveSupabaseBooking?.destination_lat, liveSupabaseBooking?.destination_lng]
  );
  const hasValidRiderCoordinates = Boolean(visibleRiderPoint);
  const routeEta = useMemo(() => {
    const target = getEtaTarget(booking?.status, pickupPoint, destinationPoint);
    const distanceKm = calculateDistanceKm(
      visibleRiderPoint?.latitude,
      visibleRiderPoint?.longitude,
      target?.point.latitude,
      target?.point.longitude
    );
    const etaMinutes = estimateEtaMinutes(distanceKm);

    if (!target || distanceKm === null || etaMinutes === null) {
      return null;
    }

    return {
      distanceDescription:
        target.kind === 'pickup'
          ? `Rider is ${formatDistance(distanceKm)} from pickup`
          : `Rider is ${formatDistance(distanceKm)} from destination`,
      distanceKm,
      etaDescription:
        target.kind === 'pickup'
          ? `Estimated pickup arrival: ${formatEta(etaMinutes)}`
          : `Estimated destination arrival: ${formatEta(etaMinutes)}`,
      etaMinutes,
      routeButtonTitle:
        target.kind === 'pickup'
          ? 'Open Rider to Pickup Route in Google Maps'
          : 'Open Rider to Destination Route in Google Maps',
      targetPoint: target.point,
    };
  }, [
    booking?.status,
    destinationPoint,
    pickupPoint,
    visibleRiderPoint,
  ]);
  const runnerInfoEta = useMemo(() => {
    return getCustomerRunnerCardEta({
      bookingId: booking?.supabaseBookingId,
      destinationLat: destinationPoint?.latitude,
      destinationLng: destinationPoint?.longitude,
      isRealBooking: Boolean(booking?.supabaseBookingId),
      pickupLat: pickupPoint?.latitude,
      pickupLng: pickupPoint?.longitude,
      riderLat: visibleRiderPoint?.latitude,
      riderLng: visibleRiderPoint?.longitude,
      staticEta: booking?.runner.eta,
      status: booking?.status,
    });
  }, [
    booking?.runner.eta,
    booking?.supabaseBookingId,
    booking?.status,
    destinationPoint,
    pickupPoint,
    visibleRiderPoint,
  ]);

  useEffect(() => {
    console.log('TRACK_SCREEN_OPENED', {
      bookingStatus: booking?.status ?? null,
      supabaseBookingId: booking?.supabaseBookingId ?? null,
    });
  }, [booking?.status, booking?.supabaseBookingId]);

  useEffect(() => {
    console.log('TRACK_RIDER_LOCATION_STATE', {
      canTrackRiderLocation,
      hasAssignedRider: Boolean(liveSupabaseBooking?.assigned_rider_id),
      hasValidRiderCoordinates,
      latitude: visibleRiderLocation?.latitude ?? null,
      longitude: visibleRiderLocation?.longitude ?? null,
      riderLocationId: visibleRiderLocation?.id ?? null,
      updatedAt: visibleRiderLocation?.updated_at ?? null,
    });
  }, [
    canTrackRiderLocation,
    hasValidRiderCoordinates,
    liveSupabaseBooking?.assigned_rider_id,
    visibleRiderLocation?.id,
    visibleRiderLocation?.latitude,
    visibleRiderLocation?.longitude,
    visibleRiderLocation?.updated_at,
  ]);

  useEffect(() => {
    if (!booking) {
      router.replace('/book');
    }
  }, [booking]);

  useEffect(() => {
    if (!booking?.supabaseBookingId || !hasSupabaseConfig || isFinalStatus) {
      return;
    }

    let isMounted = true;
    const supabaseBookingId = booking.supabaseBookingId;

    async function applySupabaseBooking(supabaseBooking: SupabaseBooking) {
      if (!isMounted) {
        return;
      }

      setLiveStatusAvailable(true);
      setStatus(toSimulationStatus(supabaseBooking.status));
      setLiveSupabaseBooking(supabaseBooking);
      await syncAssignedRider(supabaseBooking.assigned_rider_id);
      setSyncMessage('');
    }

    async function syncBookingStatus() {
      try {
        const supabaseBooking = await getBookingById(supabaseBookingId);
        await applySupabaseBooking(supabaseBooking);
      } catch {
        if (isMounted) {
          setLiveStatusAvailable(false);
          setSyncMessage('Live status is temporarily unavailable. Showing local tracking updates.');
        }
      }
    }

    async function syncAssignedRider(assignedRiderId: string | null) {
      if (!assignedRiderId) {
        setAssignedRiderId(null);
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

    syncBookingStatus();

    // Realtime updates the visible timeline quickly. Polling remains the fallback below.
    const unsubscribeFromRealtime = subscribeToBookingChanges(
      supabaseBookingId,
      (supabaseBooking) => {
        void applySupabaseBooking(supabaseBooking);
      },
      () => {
        if (isMounted) {
          setLiveStatusAvailable(false);
          setSyncMessage('Live status is temporarily unavailable. Showing local tracking updates.');
        }
      }
    );
    const interval = setInterval(syncBookingStatus, 5000);

    return () => {
      isMounted = false;
      unsubscribeFromRealtime();
      clearInterval(interval);
    };
  }, [
    booking?.supabaseBookingId,
    isFinalStatus,
    setAssignedRider,
    setAssignedRiderId,
    setLiveStatusAvailable,
    setStatus,
  ]);

  useEffect(() => {
    if (
      !booking?.supabaseBookingId ||
      !hasSupabaseConfig ||
      isFinalStatus ||
      !liveSupabaseBooking?.assigned_rider_id
    ) {
      return undefined;
    }

    let isMounted = true;
    const supabaseBookingId = booking.supabaseBookingId;

    async function syncRiderLocation() {
      try {
        logRiderLocationFetchOnce(
          riderLocationFetchLogKeys,
          `fetch:${supabaseBookingId}`,
          'RIDE_LOCATION_FETCH_BY_BOOKING',
          { bookingId: supabaseBookingId }
        );
        const latestLocation = await getLatestRiderLocationForBooking(supabaseBookingId);

        if (isMounted) {
          setRiderLocation(latestLocation);
        }

        if (!latestLocation) {
          logRiderLocationFetchOnce(
            riderLocationFetchLogKeys,
            `not-found:${supabaseBookingId}`,
            'RIDE_LOCATION_NOT_FOUND',
            { bookingId: supabaseBookingId }
          );
        }
      } catch (error) {
        if (__DEV__) {
          console.warn('RIDE_LOCATION_FETCH_FAILED', {
            bookingId: supabaseBookingId,
            error,
          });
        }

        if (isMounted) {
          setSyncMessage('Rider location is temporarily unavailable. Status tracking still works.');
        }
      }
    }

    void syncRiderLocation();

    const unsubscribeFromRiderLocation = subscribeToRiderLocationForBooking(
      supabaseBookingId,
      (nextLocation) => {
        setRiderLocation(nextLocation);
      },
      () => {
        if (isMounted) {
          setSyncMessage('Live rider location updates are temporarily unavailable. Polling continues.');
        }
      }
    );
    const interval = setInterval(syncRiderLocation, 5000);

    return () => {
      isMounted = false;
      unsubscribeFromRiderLocation();
      clearInterval(interval);
    };
  }, [
    booking?.supabaseBookingId,
    isFinalStatus,
    liveSupabaseBooking?.assigned_rider_id,
  ]);

  if (!booking) {
    return null;
  }

  return (
    <AppScreen>
      <SectionHeader eyebrow="Live booking" title="Track your runner" />

      <View style={styles.statusHero}>
        <View style={styles.statusHeader}>
          <AppIcon
            backgroundColor={BrandColors.yellow}
            color={BrandColors.darkGreen}
            name={{ ios: 'motorcycle', android: 'two_wheeler', web: 'two_wheeler' }}
            size={34}
            style={styles.heroIcon}
          />
          <View style={styles.statusCopy}>
            <Text style={styles.statusLabel}>Current status</Text>
            <Text style={styles.statusTitle}>{booking.status}</Text>
          </View>
        </View>

        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              isCancelled && styles.cancelledProgressFill,
              { width: progressPercent },
            ]}
          />
        </View>
      </View>

      <InfoCard title="Booking Details">
        <DetailRow label="Pickup location" value={booking.pickupLocation} />
        <DetailRow label="Destination" value={booking.destination} />
        <DetailRow label="Service type" value={booking.serviceType} />
        <DetailRow label="Distance estimate" value={booking.distance} />
        <DetailRow label="Fare estimate" value={booking.fareEstimate} />
        <View style={styles.buttonStack}>
          {pickupPoint ? (
            <PrimaryButton
              title="Open Pickup in Google Maps"
              variant="secondary"
              onPress={() =>
                void openGoogleMaps(pickupPoint, booking.pickupLocation).catch((error) =>
                  console.error('Unable to open pickup location', error)
                )
              }
            />
          ) : null}
          {destinationPoint ? (
            <PrimaryButton
              title="Open Destination in Google Maps"
              variant="secondary"
              onPress={() =>
                void openGoogleMaps(destinationPoint, booking.destination).catch((error) =>
                  console.error('Unable to open destination location', error)
                )
              }
            />
          ) : null}
        </View>
      </InfoCard>

      <InfoCard title="Runner Information">
        <DetailRow label="Runner" value={booking.runner.name} />
        <DetailRow label="Motorcycle" value={booking.runner.motorcycle} />
        <DetailRow label="Rating" value={booking.runner.rating} />
        <DetailRow label="ETA" value={runnerInfoEta} />
      </InfoCard>

      {visibleRiderLocation && visibleRiderPoint ? (
        <InfoCard title="Live Rider Location">
          <View style={styles.riderLocationContent}>
            <DetailRow label="Rider latitude" value={visibleRiderPoint.latitude.toFixed(6)} />
            <DetailRow label="Rider longitude" value={visibleRiderPoint.longitude.toFixed(6)} />
            <DetailRow
              label="Last updated"
              value={formatDateTime(visibleRiderLocation.updated_at)}
            />
            <RiderLocationMap
              destinationPoint={destinationPoint}
              pickupPoint={pickupPoint}
              riderPoint={visibleRiderPoint}
            />
            {routeEta ? (
              <View style={styles.etaBox}>
                <Text style={styles.etaPrimary}>{routeEta.distanceDescription}</Text>
                <Text style={styles.etaSecondary}>{routeEta.etaDescription}</Text>
              </View>
            ) : null}
            <PrimaryButton
              title="Open Rider Location in Google Maps"
              variant="secondary"
              onPress={() => void openCustomerRiderLocationMap(visibleRiderPoint)}
            />
            {routeEta ? (
              <PrimaryButton
                title={routeEta.routeButtonTitle}
                variant="secondary"
                onPress={() =>
                  void openGoogleMapsDirections(visibleRiderPoint, routeEta.targetPoint).catch(
                    (error) => console.error('Unable to open rider route', error)
                  )
                }
              />
            ) : null}
          </View>
        </InfoCard>
      ) : null}

      <InfoCard title="Status Timeline">
        <View style={styles.timeline}>
          {timelineStatuses.map((status, index) => (
            <TimelineItem
              key={status}
              isActive={index === currentStatusIndex}
              isComplete={!isCancelled && (index < currentStatusIndex || isCompleted)}
              isLast={index === timelineStatuses.length - 1}
              runnerName={booking.runner.name}
              status={status}
            />
          ))}
        </View>
      </InfoCard>

      {syncMessage ? <Text style={styles.syncMessage}>{syncMessage}</Text> : null}

      {isCompleted ? (
        <PrimaryButton
          title="Book Again"
          onPress={() => {
            resetBooking();
            router.replace('/book');
          }}
        />
      ) : null}

      {isCompleted ? (
        <PrimaryButton
          title="Back to Home"
          variant="secondary"
          onPress={() => {
            router.replace('/');
          }}
        />
      ) : null}

      {isCancelled ? (
        <PrimaryButton
          title="Back to Home"
          variant="secondary"
          onPress={() => {
            router.replace('/');
          }}
        />
      ) : null}

      {shouldKeepTracking ? (
        <>
          <PrimaryButton title="Keep Tracking" variant="secondary" />
          <PrimaryButton
            title="Back to Home"
            variant="secondary"
            onPress={() => {
              router.replace('/');
            }}
          />
        </>
      ) : null}
    </AppScreen>
  );
}

type DetailRowProps = {
  label: string;
  value: string;
};

function DetailRow({ label, value }: DetailRowProps) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

type TimelineItemProps = {
  isActive: boolean;
  isComplete: boolean;
  isLast: boolean;
  runnerName: string;
  status: BookingStatus;
};

function TimelineItem({ isActive, isComplete, isLast, runnerName, status }: TimelineItemProps) {
  const isCancelled = status === 'Cancelled';
  const activeColor = isCancelled ? BrandColors.danger : BrandColors.green;
  const dotColor = isComplete || isActive ? activeColor : BrandColors.border;

  return (
    <View style={styles.timelineItem}>
      <View style={styles.timelineRail}>
        <View style={[styles.timelineDot, { backgroundColor: dotColor }]} />
        {!isLast ? (
          <View
            style={[
              styles.timelineLine,
              (isComplete || isActive) && styles.timelineLineComplete,
            ]}
          />
        ) : null}
      </View>
      <View style={[
        styles.timelineCard,
        isActive && styles.activeTimelineCard,
        isActive && isCancelled && styles.cancelledTimelineCard,
      ]}>
        <Text style={[
          styles.timelineStatus,
          isActive && styles.activeTimelineStatus,
          isActive && isCancelled && styles.cancelledTimelineStatus,
        ]}>
          {status}
        </Text>
        <Text style={styles.timelineDescription}>{getStatusDescription(status, runnerName)}</Text>
      </View>
    </View>
  );
}

function getStatusDescription(status: BookingStatus, runnerName: string) {
  switch (status) {
    case 'Pending':
      return 'Looking for the best nearby runner.';
    case 'Accepted':
      return `${runnerName} accepted your booking.`;
    case 'Runner Arriving':
      return 'Your runner is heading to pickup.';
    case 'In Progress':
      return 'Your request is currently being handled.';
    case 'Completed':
      return 'Booking completed. Thanks for using Camotes Runner.';
    case 'Cancelled':
      return 'This booking was cancelled.';
  }
}

function getLocationPoint(
  latitude: number | null | undefined,
  longitude: number | null | undefined
): LocationPoint | null {
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return null;
  }

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return { latitude, longitude };
}

function getEtaTarget(
  status: BookingStatus | undefined,
  pickupPoint: LocationPoint | null,
  destinationPoint: LocationPoint | null
) {
  if (status === 'Pending' || status === 'Accepted' || status === 'Runner Arriving') {
    return pickupPoint ? { kind: 'pickup' as const, point: pickupPoint } : null;
  }

  if (status === 'In Progress') {
    return destinationPoint ? { kind: 'destination' as const, point: destinationPoint } : null;
  }

  return null;
}

async function openCustomerRiderLocationMap(riderPoint: LocationPoint) {
  console.log('CUSTOMER_OPEN_RIDER_LOCATION_MAP_REQUEST', {
    latitude: riderPoint.latitude,
    longitude: riderPoint.longitude,
  });

  const url = getSafeGoogleMapsSearchUrl(riderPoint);

  if (!url) {
    showCustomerMapOpenFailure(new Error('Rider location URL could not be created.'));
    return;
  }

  console.log('CUSTOMER_RIDER_LOCATION_MAP_URL', url);

  try {
    await openGoogleMapsUrlDirect(url);
  } catch (error) {
    showCustomerMapOpenFailure(error);
  }
}

function showCustomerMapOpenFailure(error: unknown) {
  console.error('CUSTOMER_RIDER_LOCATION_MAP_OPEN_FAILED', error);
  Alert.alert(
    'Unable to open Google Maps',
    'Unable to open Google Maps. Please check if Maps or a browser is installed.'
  );
}

function logRiderLocationFetchOnce(
  logKeysRef: MutableRefObject<Set<string>>,
  key: string,
  label: string,
  details: Record<string, unknown>
) {
  if (!__DEV__ || logKeysRef.current.has(key)) {
    return;
  }

  logKeysRef.current.add(key);
  console.log(label, details);
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Unknown';
  }

  return date.toLocaleString('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

const styles = StyleSheet.create({
  statusHero: {
    borderRadius: 28,
    padding: 20,
    backgroundColor: BrandColors.darkGreen,
    gap: 18,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  heroIcon: {
    width: 70,
    height: 70,
    borderRadius: 26,
  },
  statusCopy: {
    flex: 1,
    gap: 3,
  },
  statusLabel: {
    color: BrandColors.yellow,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  statusTitle: {
    color: BrandColors.white,
    fontSize: 25,
    lineHeight: 31,
    fontWeight: '900',
  },
  progressTrack: {
    height: 9,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: BrandColors.yellow,
  },
  cancelledProgressFill: {
    backgroundColor: BrandColors.danger,
  },
  detailRow: {
    minHeight: 44,
    borderBottomWidth: 1,
    borderBottomColor: BrandColors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  detailLabel: {
    flex: 1,
    color: BrandColors.mutedInk,
    fontSize: 13,
    fontWeight: '800',
  },
  detailValue: {
    flex: 1,
    color: BrandColors.ink,
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'right',
  },
  timeline: {
    gap: 0,
  },
  timelineItem: {
    flexDirection: 'row',
    gap: 12,
  },
  timelineRail: {
    width: 20,
    alignItems: 'center',
  },
  timelineDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginTop: 15,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: BrandColors.border,
    marginTop: 5,
  },
  timelineLineComplete: {
    backgroundColor: BrandColors.green,
  },
  timelineCard: {
    flex: 1,
    minHeight: 72,
    borderRadius: 18,
    backgroundColor: BrandColors.background,
    padding: 13,
    marginBottom: 10,
  },
  activeTimelineCard: {
    backgroundColor: BrandColors.softGreen,
    borderWidth: 1,
    borderColor: BrandColors.limeGreen,
  },
  cancelledTimelineCard: {
    backgroundColor: '#FFF0EE',
    borderColor: '#FFD0CB',
  },
  timelineStatus: {
    color: BrandColors.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  activeTimelineStatus: {
    color: BrandColors.green,
  },
  cancelledTimelineStatus: {
    color: BrandColors.danger,
  },
  timelineDescription: {
    color: BrandColors.mutedInk,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
    marginTop: 3,
  },
  syncMessage: {
    color: BrandColors.mutedInk,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    textAlign: 'center',
  },
  riderLocationContent: {
    gap: 12,
  },
  buttonStack: {
    gap: 10,
    paddingTop: 10,
  },
  etaBox: {
    backgroundColor: BrandColors.softGreen,
    borderColor: BrandColors.border,
    borderRadius: 18,
    borderWidth: 1,
    gap: 4,
    padding: 14,
  },
  etaPrimary: {
    color: BrandColors.ink,
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 19,
  },
  etaSecondary: {
    color: BrandColors.green,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 18,
  },
});
