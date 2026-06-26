import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { AppScreen } from '@/components/app-screen';
import { PrimaryButton } from '@/components/primary-button';
import { SectionHeader } from '@/components/section-header';
import { BrandColors } from '@/constants/brand';
import { estimateEtaMinutes, formatEta } from '@/services/eta-service';
import { getCurrentAuthState } from '@/services/auth-service';
import {
  getLatestBookings,
  getUserBookings,
  type Booking,
} from '@/services/booking-service';
import { getStatusColor, toStatusLabel } from '@/services/booking-status';
import { useBookingSimulation } from '@/services/booking-simulation';
import {
  getLatestFoodOrders,
  getUserFoodOrders,
  type FoodOrderWithRestaurant,
} from '@/services/food-order-service';
import { useFoodOrderStatus } from '@/services/food-order-status';
import {
  getMyPartnerOrders,
  type PartnerOrderWithPartner,
} from '@/services/partner-order-service';
import { subscribeToCustomerActivityChanges } from '@/services/realtime-service';
import { hasSupabaseConfig } from '@/services/supabase';
import type { BookingStatus, FoodOrderStatus, PartnerOrderStatus } from '@/types/database';

type UnifiedActivityItem =
  | {
      amount: number;
      createdAt: string;
      id: string;
      kind: 'ride';
      primary: string;
      secondary: string;
      status: BookingStatus;
      trackingRecord: Booking;
    }
  | {
      amount: number;
      createdAt: string;
      id: string;
      kind: 'food';
      primary: string;
      secondary: string;
      status: FoodOrderStatus;
      trackingRecord: FoodOrderWithRestaurant;
    }
  | {
      amount: number;
      createdAt: string;
      id: string;
      kind: 'partner';
      paymentMethod: string;
      primary: string;
      secondary: string;
      status: PartnerOrderStatus;
      trackingRecord: PartnerOrderWithPartner;
    };

const activeRideStatuses: BookingStatus[] = [
  'pending',
  'accepted',
  'runner_arriving',
  'in_progress',
];
const activeFoodStatuses: FoodOrderStatus[] = [
  'pending',
  'accepted',
  'preparing',
  'picked_up',
  'on_the_way',
];
const historyRideStatuses: BookingStatus[] = ['completed', 'cancelled'];
const historyFoodStatuses: FoodOrderStatus[] = ['delivered', 'cancelled'];
const activePartnerStatuses: PartnerOrderStatus[] = [
  'pending',
  'accepted',
  'preparing',
  'picked_up',
  'on_the_way',
];
const historyPartnerStatuses: PartnerOrderStatus[] = ['completed', 'cancelled'];

export function ActivityScreen() {
  const { setBookingFromSupabase } = useBookingSimulation();
  const { setCurrentFoodOrder } = useFoodOrderStatus();
  const [items, setItems] = useState<UnifiedActivityItem[]>([]);
  const [activityMessage, setActivityMessage] = useState(
    hasSupabaseConfig ? '' : 'Live activity needs Supabase. Showing sample activity.'
  );
  const [isLoading, setIsLoading] = useState(hasSupabaseConfig);

  const loadActivity = useCallback(async ({ showLoading = true } = {}) => {
    if (!hasSupabaseConfig) {
      setItems(getSampleActivityItems());
      setIsLoading(false);
      return;
    }

    if (showLoading) {
      setIsLoading(true);
    }

    try {
      const authState = await getCurrentAuthState().catch(() => null);
      const [bookings, foodOrders, partnerOrders] = await Promise.all([
        authState?.user ? getUserBookings(authState.user.id) : getLatestBookings(20),
        authState?.user ? getUserFoodOrders(authState.user.id) : getLatestFoodOrders(20),
        getMyPartnerOrders(authState?.user?.id ?? null).catch((error) => {
          if (__DEV__) {
            console.warn('PARTNER_ACTIVITY_LOAD_SKIPPED', error);
          }

          return [];
        }),
      ]);

      setItems([
        ...bookings.map(mapBookingToActivityItem),
        ...foodOrders.map(mapFoodOrderToActivityItem),
        ...partnerOrders.map(mapPartnerOrderToActivityItem),
      ].sort(sortByNewest));
      setActivityMessage('');
    } catch {
      setItems(getSampleActivityItems());
      setActivityMessage('Live activity is temporarily unavailable. Showing sample activity.');
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  }, []);

  useFocusEffect(useCallback(() => {
    let isMounted = true;

    function refreshActivity() {
      if (isMounted) {
        void loadActivity({ showLoading: false });
      }
    }

    void loadActivity();

    if (!hasSupabaseConfig) {
      return () => {
        isMounted = false;
      };
    }

    const unsubscribe = subscribeToCustomerActivityChanges(refreshActivity, () => {
      if (isMounted) {
        setActivityMessage(
          'Activity realtime updates are temporarily unavailable. Activity will keep polling.'
        );
      }
    });
    const interval = setInterval(refreshActivity, 5000);

    return () => {
      isMounted = false;
      unsubscribe();
      clearInterval(interval);
    };
  }, [loadActivity]));

  const activeItems = useMemo(
    () => items.filter((item) => isActiveActivityItem(item)),
    [items]
  );
  const historyItems = useMemo(
    () => items.filter((item) => isHistoryActivityItem(item)),
    [items]
  );

  function handleTrackItem(item: UnifiedActivityItem) {
    if (item.kind === 'ride') {
      setBookingFromSupabase(item.trackingRecord);
      router.push('/tracking');
      return;
    }

    if (item.kind === 'partner') {
      router.push({ pathname: '/partner-order/[id]', params: { id: item.id } });
      return;
    }

    setCurrentFoodOrder(item.trackingRecord);
    router.push('/food-tracking');
  }

  return (
    <AppScreen>
      <SectionHeader eyebrow="Activity" title="Track active orders" />

      {isLoading ? <Text style={styles.activityMessage}>Loading activity...</Text> : null}
      {activityMessage ? <Text style={styles.activityMessage}>{activityMessage}</Text> : null}

      <ActivitySection
        emptyText="No active orders or bookings yet."
        items={activeItems}
        title="Active"
        onTrackItem={handleTrackItem}
      />

      <ActivitySection
        emptyText="Completed and cancelled items will appear here."
        items={historyItems}
        title="History"
        onTrackItem={handleTrackItem}
      />
    </AppScreen>
  );
}

function ActivitySection({
  emptyText,
  items,
  onTrackItem,
  title,
}: {
  emptyText: string;
  items: UnifiedActivityItem[];
  onTrackItem: (item: UnifiedActivityItem) => void;
  title: string;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {items.length === 0 ? (
        <Text style={styles.emptyText}>{emptyText}</Text>
      ) : (
        <View style={styles.cards}>
          {items.map((item) => (
            <ActivityCard item={item} key={`${item.kind}-${item.id}`} onTrackItem={onTrackItem} />
          ))}
        </View>
      )}
    </View>
  );
}

function ActivityCard({
  item,
  onTrackItem,
}: {
  item: UnifiedActivityItem;
  onTrackItem: (item: UnifiedActivityItem) => void;
}) {
  const color = getActivityStatusColor(item);
  const isActive = isActiveActivityItem(item);

  return (
    <View style={styles.activityCard}>
      <View style={styles.cardTop}>
        <View style={styles.serviceBlock}>
          <AppIcon
            backgroundColor={BrandColors.softGreen}
            color={BrandColors.green}
            name={
              item.kind === 'ride'
                ? { ios: 'motorcycle', android: 'two_wheeler', web: 'two_wheeler' }
                : item.kind === 'food'
                  ? { ios: 'takeoutbag.and.cup.and.straw', android: 'delivery_dining', web: 'delivery_dining' }
                  : { ios: 'shippingbox.fill', android: 'local_shipping', web: 'local_shipping' }
            }
            size={20}
            style={styles.cardIcon}
          />
          <View style={styles.cardTitleBlock}>
            <Text style={styles.service}>{item.primary}</Text>
            <Text style={styles.date}>{formatActivityDate(item.createdAt)}</Text>
          </View>
        </View>
        <StatusBadge color={color} status={getActivityStatusLabel(item)} />
      </View>

      <Text style={styles.secondary}>{item.secondary}</Text>
      {item.kind === 'partner' ? (
        <Text style={styles.secondary}>
          Ref {item.id.slice(0, 8)} - {toTitleCase(item.paymentMethod || 'cash')}
        </Text>
      ) : null}
      {item.kind !== 'ride' ? (
        <Text style={styles.deliveryHint}>{getDeliveryActivityHint(item)}</Text>
      ) : null}
      {item.kind === 'partner' && item.trackingRecord.is_stale ? (
        <Text style={styles.secondary}>
          Status may be updating. Pulling latest details when available.
        </Text>
      ) : null}

      <View style={styles.cardBottom}>
        <View>
          <Text style={styles.metaLabel}>{item.kind === 'ride' ? 'Fare' : 'Total'}</Text>
          <Text style={styles.fare}>{formatPeso(item.amount)}</Text>
        </View>
        {isActive || item.kind === 'partner' ? (
          <PrimaryButton
            title={item.kind === 'partner' ? 'Track Order' : 'Track'}
            style={styles.trackButton}
            onPress={() => onTrackItem(item)}
          />
        ) : null}
      </View>
    </View>
  );
}

function StatusBadge({ color, status }: { color: string; status: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: `${color}1F` }]}>
      <Text style={[styles.badgeText, { color }]}>{status}</Text>
    </View>
  );
}

function mapBookingToActivityItem(booking: Booking): UnifiedActivityItem {
  return {
    amount: Number(booking.final_fare ?? booking.fare_estimate ?? booking.estimated_fare ?? 0),
    createdAt: booking.created_at,
    id: booking.id,
    kind: 'ride',
    primary: booking.service_type,
    secondary: `${booking.pickup_location} to ${booking.destination}`,
    status: booking.status,
    trackingRecord: booking,
  };
}

function mapFoodOrderToActivityItem(foodOrder: FoodOrderWithRestaurant): UnifiedActivityItem {
  return {
    amount: Number(foodOrder.total_amount ?? 0),
    createdAt: foodOrder.created_at,
    id: foodOrder.id,
    kind: 'food',
    primary: foodOrder.restaurant_name,
    secondary: foodOrder.delivery_location,
    status: foodOrder.status,
    trackingRecord: foodOrder,
  };
}

function mapPartnerOrderToActivityItem(partnerOrder: PartnerOrderWithPartner): UnifiedActivityItem {
  return {
    amount: Number(partnerOrder.total_amount ?? 0),
    createdAt: partnerOrder.updated_at ?? partnerOrder.created_at,
    id: partnerOrder.id,
    kind: 'partner',
    paymentMethod: partnerOrder.payment_method,
    primary: partnerOrder.partner_name,
    secondary: partnerOrder.delivery_address ?? 'Delivery address to be confirmed',
    status: partnerOrder.status,
    trackingRecord: partnerOrder,
  };
}

function isActiveActivityItem(item: UnifiedActivityItem) {
  if (item.kind === 'ride') {
    return activeRideStatuses.includes(item.status);
  }

  if (item.kind === 'food') {
    return activeFoodStatuses.includes(item.status);
  }

  return activePartnerStatuses.includes(item.status);
}

function isHistoryActivityItem(item: UnifiedActivityItem) {
  if (item.kind === 'ride') {
    return historyRideStatuses.includes(item.status);
  }

  if (item.kind === 'food') {
    return historyFoodStatuses.includes(item.status);
  }

  return historyPartnerStatuses.includes(item.status);
}

function getActivityStatusLabel(item: UnifiedActivityItem) {
  if (item.kind === 'ride') {
    return toStatusLabel(item.status);
  }

  if (item.kind === 'partner') {
    return toPartnerOrderStatusLabel(item.status);
  }

  return toTitleCase(item.status);
}

function getActivityStatusColor(item: UnifiedActivityItem) {
  if (item.kind === 'ride') {
    return getStatusColor(item.status);
  }

  switch (item.status) {
    case 'accepted':
      return BrandColors.limeGreen;
    case 'preparing':
      return BrandColors.yellow;
    case 'picked_up':
      return BrandColors.green;
    case 'on_the_way':
      return BrandColors.darkGreen;
    case 'delivered':
    case 'completed':
      return BrandColors.ink;
    case 'cancelled':
      return BrandColors.danger;
    case 'pending':
    default:
      return BrandColors.yellow;
  }
}

function getDeliveryActivityHint(item: Extract<UnifiedActivityItem, { kind: 'food' | 'partner' }>) {
  if (item.kind === 'food') {
    return getFoodActivityHint(item.trackingRecord);
  }

  return getPartnerActivityHint(item.trackingRecord);
}

function getFoodActivityHint(order: FoodOrderWithRestaurant) {
  const status = order.status;

  if (status === 'delivered') {
    return 'Delivered';
  }

  if (status === 'cancelled') {
    return 'Cancelled';
  }

  if (status === 'pending') {
    return 'Waiting for order confirmation';
  }

  if (!order.assigned_rider_id) {
    return 'Waiting for rider assignment';
  }

  if (status === 'on_the_way') {
    const etaText = getActivityEtaText(order.delivery_distance_km);

    return etaText ? `Rider is on the way - ${etaText}` : 'Rider is on the way';
  }

  if (status === 'picked_up') {
    const distanceText = getActivityDistanceText(order.delivery_distance_km);

    return distanceText ? `Food picked up - ${distanceText}` : 'Food picked up';
  }

  return 'Food is being prepared';
}

function getPartnerActivityHint(order: PartnerOrderWithPartner) {
  if (order.status === 'completed') {
    return 'Delivered';
  }

  if (order.status === 'cancelled') {
    return 'Cancelled';
  }

  if (order.status === 'pending') {
    return 'Waiting for order confirmation';
  }

  if (!order.assigned_rider_id) {
    return 'Waiting for rider assignment';
  }

  if (order.status === 'picked_up') {
    return 'Items picked up';
  }

  if (order.status === 'on_the_way') {
    return 'Rider is on the way';
  }

  return 'Shop is preparing your items';
}

function getActivityDistanceText(distanceKm: number | null | undefined) {
  if (typeof distanceKm !== 'number' || !Number.isFinite(distanceKm)) {
    return null;
  }

  if (distanceKm <= 0.1) {
    return 'almost there';
  }

  return `${distanceKm.toFixed(1)} km away`;
}

function getActivityEtaText(distanceKm: number | null | undefined) {
  const etaMinutes = estimateEtaMinutes(distanceKm);

  if (etaMinutes === null) {
    return null;
  }

  return `ETA ${formatEta(etaMinutes)}`;
}

function getSampleActivityItems(): UnifiedActivityItem[] {
  const now = new Date().toISOString();

  return [
    {
      amount: 120,
      createdAt: now,
      id: 'sample-ride-active',
      kind: 'ride',
      primary: 'Ride',
      secondary: 'Consuelo Port to Santiago Bay',
      status: 'accepted',
      trackingRecord: {
        assigned_rider_id: null,
        base_fare: 50,
        created_at: now,
        customer_id: null,
        destination: 'Santiago Bay',
        destination_lat: 10.5992,
        destination_lng: 124.3021,
        distance_km: 4.8,
        estimated_fare: 120,
        fare_estimate: 120,
        final_fare: null,
        id: 'sample-ride-active',
        notes: null,
        payment_method: 'Cash',
        pickup_lat: 10.6506,
        pickup_lng: 124.3437,
        pickup_location: 'Consuelo Port',
        rider_id: null,
        service_type: 'Ride',
        status: 'accepted',
        updated_at: now,
      },
    },
    {
      amount: 365,
      createdAt: now,
      id: 'sample-food-active',
      kind: 'food',
      primary: 'M Cafe',
      secondary: 'Santiago Bay Garden Resort',
      status: 'on_the_way',
      trackingRecord: {
        assigned_rider_id: null,
        created_at: now,
        customer_id: null,
        customer_name: 'Juan Customer',
        customer_phone: '09123456789',
        delivery_distance_km: 5.4,
        delivery_fee: 50,
        delivery_lat: 10.5992,
        delivery_lng: 124.3021,
        delivery_location: 'Santiago Bay Garden Resort',
        id: 'sample-food-active',
        notes: null,
        order_subtotal: 315,
        order_total: 365,
        partner_id: null,
        partner_notification_status: 'pending',
        partner_notified_at: null,
        payment_confirmed_at: now,
        payment_confirmed_by: null,
        payment_method: 'GCash',
        payment_notes: null,
        payment_proof_path: null,
        payment_proof_url: null,
        payment_reference: 'SAMPLE-GCASH-FOOD',
        payment_status: 'paid',
        payment_submitted_at: now,
        restaurant_id: 'sample-restaurant',
        restaurant_name: 'M Cafe',
        service_fee: null,
        status: 'on_the_way',
        subtotal: 315,
        total_amount: 365,
        updated_at: now,
      },
    },
    {
      amount: 215,
      createdAt: now,
      id: 'sample-partner-order-active',
      kind: 'partner',
      paymentMethod: 'cash',
      primary: 'Camotes Mini Mart',
      secondary: 'San Francisco Town Center',
      status: 'pending',
      trackingRecord: {
        accepted_at: null,
        assigned_at: null,
        assigned_rider_id: null,
        cancelled_at: null,
        completed_at: null,
        created_at: now,
        customer_id: null,
        customer_name: 'Juan Customer',
        customer_phone: '09123456789',
        customer_tracking_token: 'sample-token',
        customer_tracking_token_created_at: now,
        delivery_address: 'San Francisco Town Center',
        delivery_fee: 50,
        delivery_lat: 10.6469,
        delivery_lng: 124.3506,
        id: 'sample-partner-order-active',
        notes: null,
        partner_id: 'sample-partner-camotes-mini-mart',
        partner_name: 'Camotes Mini Mart',
        partner_status: 'new',
        payment_confirmed_at: null,
        payment_confirmed_by: null,
        payment_method: 'GCash',
        payment_notes: null,
        payment_proof_path: null,
        payment_proof_url: null,
        payment_reference: 'SAMPLE-GCASH-PARTNER',
        payment_status: 'payment_submitted',
        payment_submitted_at: now,
        rider_status: null,
        service_fee: 0,
        status: 'pending',
        subtotal: 165,
        total_amount: 215,
        updated_at: now,
      },
    },
  ];
}

function toPartnerOrderStatusLabel(status: PartnerOrderStatus) {
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'accepted':
      return 'Accepted';
    case 'preparing':
      return 'Preparing';
    case 'picked_up':
      return 'Picked Up';
    case 'on_the_way':
      return 'On the Way';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
  }
}

function toTitleCase(value: string) {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function sortByNewest(a: UnifiedActivityItem, b: UnifiedActivityItem) {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

function formatActivityDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Recent activity';
  }

  return date.toLocaleString('en-PH', {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatPeso(value: number) {
  return new Intl.NumberFormat('en-PH', {
    currency: 'PHP',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(value);
}

const styles = StyleSheet.create({
  section: {
    gap: 12,
  },
  sectionTitle: {
    color: BrandColors.ink,
    fontSize: 20,
    fontWeight: '900',
  },
  cards: {
    gap: 12,
  },
  activityCard: {
    borderRadius: 24,
    backgroundColor: BrandColors.white,
    borderWidth: 1,
    borderColor: BrandColors.border,
    padding: 16,
    shadowColor: BrandColors.cardShadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
    gap: 12,
  },
  cardTop: {
    gap: 12,
  },
  serviceBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 17,
  },
  cardTitleBlock: {
    flex: 1,
  },
  service: {
    color: BrandColors.ink,
    fontSize: 17,
    fontWeight: '900',
  },
  date: {
    color: BrandColors.mutedInk,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  secondary: {
    color: BrandColors.mutedInk,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
  deliveryHint: {
    backgroundColor: BrandColors.softGreen,
    borderColor: BrandColors.border,
    borderRadius: 16,
    borderWidth: 1,
    color: BrandColors.darkGreen,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 18,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '900',
  },
  cardBottom: {
    borderTopWidth: 1,
    borderTopColor: BrandColors.border,
    paddingTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  metaLabel: {
    color: BrandColors.mutedInk,
    fontSize: 13,
    fontWeight: '800',
  },
  fare: {
    color: BrandColors.ink,
    fontSize: 16,
    fontWeight: '900',
    marginTop: 2,
  },
  trackButton: {
    minHeight: 46,
    minWidth: 104,
    borderRadius: 18,
    shadowOpacity: 0.08,
  },
  activityMessage: {
    color: BrandColors.mutedInk,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    textAlign: 'center',
  },
  emptyText: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BrandColors.border,
    backgroundColor: BrandColors.white,
    color: BrandColors.mutedInk,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    padding: 16,
    textAlign: 'center',
  },
});
