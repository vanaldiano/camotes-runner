import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { AppScreen } from '@/components/app-screen';
import { PrimaryButton } from '@/components/primary-button';
import { SectionHeader } from '@/components/section-header';
import { BrandColors } from '@/constants/brand';
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
import { subscribeToCustomerActivityChanges } from '@/services/realtime-service';
import { hasSupabaseConfig } from '@/services/supabase';
import type { BookingStatus, FoodOrderStatus } from '@/types/database';

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
      const [bookings, foodOrders] = await Promise.all([
        authState?.user ? getUserBookings(authState.user.id) : getLatestBookings(20),
        authState?.user ? getUserFoodOrders(authState.user.id) : getLatestFoodOrders(20),
      ]);

      setItems([
        ...bookings.map(mapBookingToActivityItem),
        ...foodOrders.map(mapFoodOrderToActivityItem),
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

    setCurrentFoodOrder(item.trackingRecord);
    router.push('/food-tracking');
  }

  return (
    <AppScreen>
      <SectionHeader eyebrow="Activity" title="Track active orders" />

      {isLoading ? <Text style={styles.activityMessage}>Loading activity...</Text> : null}
      {activityMessage ? <Text style={styles.activityMessage}>{activityMessage}</Text> : null}

      <ActivitySection
        emptyText="No active rides or food orders right now."
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
                : { ios: 'takeoutbag.and.cup.and.straw', android: 'delivery_dining', web: 'delivery_dining' }
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

      <View style={styles.cardBottom}>
        <View>
          <Text style={styles.metaLabel}>{item.kind === 'ride' ? 'Fare' : 'Total'}</Text>
          <Text style={styles.fare}>{formatPeso(item.amount)}</Text>
        </View>
        {isActive ? (
          <PrimaryButton
            title="Track"
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

function isActiveActivityItem(item: UnifiedActivityItem) {
  return item.kind === 'ride'
    ? activeRideStatuses.includes(item.status)
    : activeFoodStatuses.includes(item.status);
}

function isHistoryActivityItem(item: UnifiedActivityItem) {
  return item.kind === 'ride'
    ? historyRideStatuses.includes(item.status)
    : historyFoodStatuses.includes(item.status);
}

function getActivityStatusLabel(item: UnifiedActivityItem) {
  if (item.kind === 'ride') {
    return toStatusLabel(item.status);
  }

  return item.status
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
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
      return BrandColors.ink;
    case 'cancelled':
      return BrandColors.danger;
    case 'pending':
    default:
      return BrandColors.yellow;
  }
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
        payment_method: 'GCash',
        restaurant_id: 'sample-restaurant',
        restaurant_name: 'M Cafe',
        service_fee: null,
        status: 'on_the_way',
        subtotal: 315,
        total_amount: 365,
        updated_at: now,
      },
    },
  ];
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
