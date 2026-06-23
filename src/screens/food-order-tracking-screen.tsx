import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/app-screen';
import { DeliveryTrackingCard } from '@/components/delivery-tracking-card';
import { InfoCard } from '@/components/info-card';
import { PrimaryButton } from '@/components/primary-button';
import { SectionHeader } from '@/components/section-header';
import { BrandColors } from '@/constants/brand';
import {
  calculateDistanceKm,
  estimateEtaMinutes,
  formatEta,
} from '@/services/eta-service';
import { useFoodOrderStatus } from '@/services/food-order-status';
import {
  getGoogleMapsDirectionsUrl,
  getSafeGoogleMapsSearchUrl,
  openGoogleMapsUrlDirect,
  type LocationPoint,
} from '@/services/location-service';
import {
  getLatestRiderLocationForFoodOrder,
  type RiderLocation,
} from '@/services/rider-location-service';
import { subscribeToRiderLocationForFoodOrder } from '@/services/realtime-service';
import { hasSupabaseConfig } from '@/services/supabase';
import type { FoodOrderStatus } from '@/types/database';

const foodTimelineStatuses: FoodOrderStatus[] = [
  'pending',
  'accepted',
  'preparing',
  'picked_up',
  'on_the_way',
  'delivered',
];

const activeFoodStatuses: FoodOrderStatus[] = [
  'pending',
  'accepted',
  'preparing',
  'picked_up',
  'on_the_way',
];

export function FoodOrderTrackingScreen() {
  const { currentFoodOrder, syncMessage } = useFoodOrderStatus();
  const [riderLocation, setRiderLocation] = useState<RiderLocation | null>(null);
  const [riderLocationMessage, setRiderLocationMessage] = useState('');
  const isFoodOrderFinal =
    currentFoodOrder?.status === 'delivered' || currentFoodOrder?.status === 'cancelled';
  const canTrackFoodRiderLocation = Boolean(
    currentFoodOrder?.id &&
      currentFoodOrder.assigned_rider_id &&
      hasSupabaseConfig &&
      !isFoodOrderFinal
  );
  const visibleRiderLocation =
    canTrackFoodRiderLocation && riderLocation?.food_order_id === currentFoodOrder?.id
      ? riderLocation
      : null;
  const riderPoint = useMemo(
    () =>
      visibleRiderLocation
        ? getLocationPoint(visibleRiderLocation.latitude, visibleRiderLocation.longitude)
        : null,
    [visibleRiderLocation]
  );
  const deliveryPoint = useMemo(
    () => getLocationPoint(currentFoodOrder?.delivery_lat, currentFoodOrder?.delivery_lng),
    [currentFoodOrder?.delivery_lat, currentFoodOrder?.delivery_lng]
  );
  const deliveryEta = useMemo(
    () => getFoodDeliveryEta(currentFoodOrder?.status, riderPoint, deliveryPoint),
    [currentFoodOrder?.status, deliveryPoint, riderPoint]
  );
  const isWaitingForFoodRider = Boolean(
    currentFoodOrder &&
      currentFoodOrder.status !== 'pending' &&
      activeFoodStatuses.includes(currentFoodOrder.status) &&
      !currentFoodOrder.assigned_rider_id
  );
  const isWaitingForFoodRiderLocation = Boolean(
    currentFoodOrder?.assigned_rider_id &&
      activeFoodStatuses.includes(currentFoodOrder.status) &&
      !visibleRiderLocation
  );
  const deliveryLocationUrl = getSafeGoogleMapsSearchUrl(
    deliveryPoint,
    currentFoodOrder?.delivery_location
  );

  useEffect(() => {
    if (
      !currentFoodOrder?.id ||
      !currentFoodOrder.assigned_rider_id ||
      !hasSupabaseConfig ||
      isFoodOrderFinal
    ) {
      console.log('FOOD_LIVE_RIDER_LOCATION_SKIPPED', {
        foodOrderId: currentFoodOrder?.id ?? null,
        hasAssignedRider: Boolean(currentFoodOrder?.assigned_rider_id),
        hasSupabaseConfig,
        isFoodOrderFinal,
      });
      return undefined;
    }

    let isMounted = true;
    const foodOrderId = currentFoodOrder.id;

    async function syncRiderLocation() {
      try {
        console.log('FOOD_LIVE_RIDER_LOCATION_FETCH', { foodOrderId });
        const latestLocation = await getLatestRiderLocationForFoodOrder(foodOrderId);

        if (isMounted) {
          setRiderLocation(latestLocation);
          setRiderLocationMessage(
            latestLocation ? '' : 'Waiting for rider location...'
          );
        }
      } catch (error) {
        console.error('FOOD_LIVE_RIDER_LOCATION_SKIPPED', {
          error,
          foodOrderId,
          reason: 'fetch_failed',
        });

        if (isMounted) {
          setRiderLocationMessage('Waiting for rider location...');
        }
      }
    }

    void syncRiderLocation();

    console.log('FOOD_LIVE_RIDER_LOCATION_SUBSCRIBED', { foodOrderId });
    const unsubscribe = subscribeToRiderLocationForFoodOrder(
      foodOrderId,
      (nextLocation) => {
        console.log('FOOD_LIVE_RIDER_LOCATION_UPDATE', {
          foodOrderId,
          latitude: nextLocation.latitude,
          longitude: nextLocation.longitude,
          riderLocationId: nextLocation.id,
          updatedAt: nextLocation.updated_at,
        });

        if (isMounted) {
          setRiderLocation(nextLocation);
          setRiderLocationMessage('');
        }
      },
      () => {
        if (isMounted) {
          setRiderLocationMessage('Rider location realtime is delayed. Polling continues.');
        }
      }
    );
    const interval = setInterval(syncRiderLocation, 5000);

    return () => {
      isMounted = false;
      unsubscribe();
      clearInterval(interval);
    };
  }, [
    currentFoodOrder?.assigned_rider_id,
    currentFoodOrder?.id,
    isFoodOrderFinal,
  ]);

  if (!currentFoodOrder) {
    return (
      <AppScreen>
        <SectionHeader eyebrow="Food order" title="No order selected" />
        <Text style={styles.emptyText}>Open Activity and choose a food order to track.</Text>
        <PrimaryButton title="Open Activity" onPress={() => router.replace('/activity')} />
      </AppScreen>
    );
  }

  const isCancelled = currentFoodOrder.status === 'cancelled';
  const isDelivered = currentFoodOrder.status === 'delivered';
  const foodOrderId = currentFoodOrder.id;
  const foodOrderStatus = currentFoodOrder.status;
  const shouldKeepTracking = activeFoodStatuses.includes(currentFoodOrder.status);

  function handleKeepTracking() {
    console.log('FOOD_TRACKING_KEEP_TRACKING_PRESSED', {
      foodOrderId,
      status: foodOrderStatus,
    });
  }

  function handleBackHome() {
    console.log('FOOD_TRACKING_BACK_HOME_PRESSED', {
      foodOrderId,
      status: foodOrderStatus,
    });
    router.replace('/');
  }

  return (
    <AppScreen>
      <SectionHeader eyebrow="Food order" title="Track delivery" />

      <DeliveryTrackingCard
        currentStepKey={currentFoodOrder.status}
        distanceKm={deliveryEta.distanceKm}
        etaPrimary={deliveryEta.primary}
        etaMinutes={deliveryEta.etaMinutes}
        etaSecondary={deliveryEta.secondary}
        icon={{ ios: 'takeoutbag.and.cup.and.straw', android: 'delivery_dining', web: 'delivery_dining' }}
        isWaitingForLocation={isWaitingForFoodRiderLocation}
        isWaitingForRider={isWaitingForFoodRider}
        lastUpdated={
          visibleRiderLocation?.updated_at ? formatDateTime(visibleRiderLocation.updated_at) : null
        }
        mapActions={[
          ...(riderPoint && deliveryPoint && currentFoodOrder.status === 'on_the_way'
            ? [
                {
                  label: 'Open Delivery Route',
                  onPress: () => void openFoodRiderDeliveryRoute(riderPoint, deliveryPoint),
                },
              ]
            : []),
          ...(deliveryLocationUrl
            ? [
                {
                  label: 'View Delivery Location',
                  onPress: () => void openMapUrl(deliveryLocationUrl),
                },
              ]
            : []),
        ]}
        riderName={currentFoodOrder.assigned_rider_id ? 'Assigned rider' : null}
        routeTarget="delivery"
        serviceLabel="Food delivery"
        statusLabel={getFriendlyFoodTrackingTitle(currentFoodOrder.status)}
        statusMessage={riderLocationMessage || getFoodTrackingStateMessage(currentFoodOrder.status)}
        steps={getFoodDeliverySteps(currentFoodOrder.status)}
      />

      <InfoCard title="Delivery Details">
        <DetailRow label="Customer" value={currentFoodOrder.customer_name ?? 'Customer'} />
        <DetailRow label="Delivery address" value={currentFoodOrder.delivery_location} />
        <DetailRow
          label="Delivery distance"
          value={formatOptionalDistance(currentFoodOrder.delivery_distance_km)}
        />
        <DetailRow label="Delivery fee" value={formatPeso(currentFoodOrder.delivery_fee)} />
        <DetailRow label="Payment" value={currentFoodOrder.payment_method} />
        <DetailRow
          label="Total"
          value={formatPeso(currentFoodOrder.order_total ?? currentFoodOrder.total_amount)}
        />
      </InfoCard>

      {syncMessage ? <Text style={styles.syncMessage}>{syncMessage}</Text> : null}

      {isDelivered ? (
        <PrimaryButton title="Order Again" onPress={() => router.replace('/restaurants')} />
      ) : null}

      {shouldKeepTracking ? (
        <PrimaryButton title="Keep Tracking" variant="secondary" onPress={handleKeepTracking} />
      ) : null}

      {shouldKeepTracking || isDelivered || isCancelled ? (
        <PrimaryButton title="Back to Home" variant="secondary" onPress={handleBackHome} />
      ) : null}
    </AppScreen>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function formatOptionalDistance(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 'To be confirmed';
  }

  return `${value.toFixed(1)} km`;
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

function getFoodDeliveryEta(
  status: FoodOrderStatus | undefined,
  riderPoint: LocationPoint | null,
  deliveryPoint: LocationPoint | null
) {
  if (status === 'delivered') {
    console.log('FOOD_DELIVERY_ETA_RESULT', { etaText: 'Delivered', status });
    return { distanceKm: null, etaMinutes: null, primary: 'Delivered successfully', secondary: null };
  }

  if (status === 'cancelled') {
    console.log('FOOD_DELIVERY_ETA_RESULT', { etaText: 'Cancelled', status });
    return { distanceKm: null, etaMinutes: null, primary: 'Cancelled', secondary: null };
  }

  if (status === 'accepted' || status === 'preparing') {
    console.log('FOOD_DELIVERY_ETA_RESULT', {
      etaText: 'Preparing order',
      status,
    });
    return {
      distanceKm: null,
      etaMinutes: null,
      primary: 'Preparing order',
      secondary: 'Delivery ETA will update after pickup.',
    };
  }

  if (status !== 'picked_up' && status !== 'on_the_way') {
    console.log('FOOD_DELIVERY_ETA_RESULT', {
      etaText: 'Waiting for rider location...',
      status: status ?? null,
    });
    return { distanceKm: null, etaMinutes: null, primary: 'Waiting for rider update', secondary: null };
  }

  const distanceKm = calculateDistanceKm(
    riderPoint?.latitude,
    riderPoint?.longitude,
    deliveryPoint?.latitude,
    deliveryPoint?.longitude
  );
  const etaMinutes = estimateEtaMinutes(distanceKm);

  if (distanceKm === null || etaMinutes === null) {
    console.log('FOOD_DELIVERY_ETA_RESULT', {
      distanceKm,
      etaMinutes,
      etaText: 'Waiting for rider location...',
      status,
    });
    return {
      distanceKm: null,
      etaMinutes: null,
      primary: 'Distance unavailable',
      secondary: 'ETA will update soon',
    };
  }

  const distanceSummary = getCustomerDistanceSummary(distanceKm);
  const primary = distanceSummary.primary;
  const secondary = `${distanceSummary.secondary} • ${formatEta(etaMinutes)}`;

  console.log('FOOD_DELIVERY_ETA_RESULT', {
    distanceKm,
    etaMinutes,
    primary,
    secondary,
    status,
  });

  return { distanceKm, etaMinutes, primary, secondary };
}

function getCustomerDistanceSummary(distanceKm: number) {
  if (distanceKm === 0) {
    return {
      primary: 'Rider is at the delivery area',
      secondary: 'At delivery area',
    };
  }

  if (distanceKm <= 0.1) {
    return {
      primary: 'Rider is almost there',
      secondary: `${formatMeters(distanceKm)} m away`,
    };
  }

  return {
    primary: `Rider is ${distanceKm.toFixed(1)} km away`,
    secondary: `${distanceKm.toFixed(1)} km away`,
  };
}

function formatMeters(distanceKm: number) {
  return Math.max(1, Math.round(distanceKm * 1000));
}

function getFriendlyFoodTrackingTitle(status: FoodOrderStatus) {
  switch (status) {
    case 'pending':
      return 'Order sent';
    case 'accepted':
      return 'Restaurant accepted your order';
    case 'preparing':
      return 'Food is being prepared';
    case 'picked_up':
      return 'Rider picked up your order';
    case 'on_the_way':
      return 'Rider is on the way';
    case 'delivered':
      return 'Food delivered';
    case 'cancelled':
      return 'Order cancelled';
  }
}

function getFoodTrackingStateMessage(status: FoodOrderStatus) {
  switch (status) {
    case 'pending':
      return 'Your food order has been sent to the restaurant.';
    case 'accepted':
      return 'The restaurant is reviewing and preparing your food.';
    case 'preparing':
      return 'The restaurant is preparing your food.';
    case 'picked_up':
      return 'Your rider is now carrying your food.';
    case 'on_the_way':
      return 'Your rider is heading to your delivery address.';
    case 'delivered':
      return 'Enjoy your meal!';
    case 'cancelled':
      return 'This food order was cancelled.';
  }
}

function getFoodDeliverySteps(currentStatus: FoodOrderStatus) {
  if (currentStatus === 'cancelled') {
    return [
      {
        description: 'This food order was cancelled.',
        key: 'cancelled',
        label: 'Cancelled',
      },
    ];
  }

  return foodTimelineStatuses.map((status) => ({
    description: getFoodStatusDescription(status),
    key: status,
    label: toFoodStatusLabel(status),
  }));
}

async function openMapUrl(url: string) {
  console.log('FOOD_DELIVERY_MAP_URL', url);

  try {
    await openGoogleMapsUrlDirect(url);
  } catch (error) {
    showFoodRiderMapOpenFailure(error);
  }
}

async function openFoodRiderDeliveryRoute(
  riderPoint: LocationPoint,
  deliveryPoint: LocationPoint
) {
  const url = getGoogleMapsDirectionsUrl(riderPoint, deliveryPoint);

  if (!url) {
    showFoodRiderMapOpenFailure(new Error('Food delivery route URL could not be created.'));
    return;
  }

  console.log('FOOD_RIDER_MAP_URL', url);

  await openMapUrl(url);
}

function showFoodRiderMapOpenFailure(error: unknown) {
  console.error('FOOD_RIDER_MAP_OPEN_FAILED', error);
  Alert.alert(
    'Unable to open Google Maps',
    'Unable to open Google Maps. Please check if Maps or a browser is installed.'
  );
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

function toFoodStatusLabel(status: FoodOrderStatus) {
  return status
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getFoodStatusDescription(status: FoodOrderStatus) {
  switch (status) {
    case 'pending':
      return 'Your food order has been sent to the restaurant.';
    case 'accepted':
      return 'The restaurant is reviewing and preparing your food.';
    case 'preparing':
      return 'The restaurant is preparing your food.';
    case 'picked_up':
      return 'Your rider is now carrying your food.';
    case 'on_the_way':
      return 'Your rider is heading to your delivery address.';
    case 'delivered':
      return 'Enjoy your meal!';
    case 'cancelled':
      return 'This food order was cancelled.';
  }
}

function formatPeso(value: number) {
  return new Intl.NumberFormat('en-PH', {
    currency: 'PHP',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(value);
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
  riderLocationContent: {
    gap: 12,
  },
  waitingText: {
    color: BrandColors.mutedInk,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 19,
  },
  etaBox: {
    backgroundColor: BrandColors.softGreen,
    borderColor: BrandColors.border,
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    gap: 4,
  },
  etaPrimary: {
    color: BrandColors.green,
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 20,
  },
  etaSecondary: {
    color: BrandColors.mutedInk,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 19,
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
  emptyText: {
    color: BrandColors.mutedInk,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    textAlign: 'center',
  },
});
