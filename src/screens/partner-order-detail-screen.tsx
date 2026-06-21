import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { AppScreen } from '@/components/app-screen';
import { PrimaryButton } from '@/components/primary-button';
import { ScreenHeader } from '@/components/screen-header';
import { BrandColors } from '@/constants/brand';
import {
  calculateDistanceKm,
  estimateEtaMinutes,
  formatDistance,
  formatEta,
} from '@/services/eta-service';
import {
  getGoogleMapsDirectionsUrl,
  getSafeGoogleMapsSearchUrl,
  openGoogleMapsUrlDirect,
  type LocationPoint,
} from '@/services/location-service';
import {
  getBusinessPartnerById,
  type BusinessPartnerListItem,
} from '@/services/partner-service';
import {
  getPartnerOrderById,
  getPartnerOrderItems,
  type PartnerOrderItem,
  type PartnerOrderWithPartner,
} from '@/services/partner-order-service';
import { subscribeToRiderLocationForPartnerOrder } from '@/services/realtime-service';
import {
  getLatestRiderLocationForPartnerOrder,
  type RiderLocation,
} from '@/services/rider-location-service';
import { hasSupabaseConfig } from '@/services/supabase';
import type { PartnerOrderStatus } from '@/types/database';

type PartnerOrderDetailScreenProps = {
  orderId: string;
};

const partnerTimelineStatuses: PartnerOrderStatus[] = [
  'pending',
  'accepted',
  'preparing',
  'picked_up',
  'on_the_way',
  'completed',
];

export function PartnerOrderDetailScreen({ orderId }: PartnerOrderDetailScreenProps) {
  const [order, setOrder] = useState<PartnerOrderWithPartner | null>(null);
  const [items, setItems] = useState<PartnerOrderItem[]>([]);
  const [partnerShop, setPartnerShop] = useState<BusinessPartnerListItem | null>(null);
  const [riderLocation, setRiderLocation] = useState<RiderLocation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');

  const loadOrder = useCallback(async ({ showLoading = true } = {}) => {
    if (showLoading) {
      setIsLoading(true);
    }
    setMessage('');

    try {
      const nextOrder = await getPartnerOrderById(orderId);
      const nextItems = await getPartnerOrderItems(orderId);
      const nextRiderLocation = await getLatestRiderLocationForPartnerOrder(orderId).catch(() => null);
      const nextPartnerShop = nextOrder?.partner_id
        ? await getBusinessPartnerById(nextOrder.partner_id).catch((error) => {
            if (__DEV__) {
              console.warn('PARTNER_ORDER_SHOP_LOAD_SKIPPED', { error, orderId });
            }

            return null;
          })
        : null;

      setOrder(nextOrder);
      setItems(nextItems);
      setPartnerShop(nextPartnerShop);
      setRiderLocation(nextRiderLocation);
      setMessage(nextOrder ? '' : 'Order details may take a moment to appear.');
    } catch (error) {
      if (__DEV__) {
        console.warn('PARTNER_ORDER_DETAIL_LOAD_SKIPPED', { error, orderId });
      }

      setOrder(null);
      setItems([]);
      setPartnerShop(null);
      setRiderLocation(null);
      setMessage('Order details may take a moment to appear.');
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  }, [orderId]);

  useFocusEffect(useCallback(() => {
    let isMounted = true;
    let unsubscribeFromRiderLocation: (() => void) | undefined;

    async function refreshOrder({ showLoading = false } = {}) {
      await loadOrder({ showLoading });

      if (!isMounted) {
        return;
      }
    }

    void refreshOrder({ showLoading: true });
    if (hasSupabaseConfig) {
      unsubscribeFromRiderLocation = subscribeToRiderLocationForPartnerOrder(
        orderId,
        (nextLocation) => {
          if (isMounted) {
            setRiderLocation(nextLocation);
          }
        },
        () => {
          if (isMounted) {
            setMessage('Live tracking is using periodic refresh.');
          }
        }
      );
    }

    const interval = setInterval(() => {
      if (isMounted) {
        void refreshOrder({ showLoading: false });
      }
    }, 5000);

    return () => {
      isMounted = false;
      unsubscribeFromRiderLocation?.();
      clearInterval(interval);
    };
  }, [loadOrder, orderId]));

  async function handleManualRefresh() {
    await loadOrder({ showLoading: true });
  }

  const currentStatus = order?.status ?? 'pending';
  const riderPoint = getLocationPoint(riderLocation?.latitude, riderLocation?.longitude);
  const partnerPoint = getLocationPoint(partnerShop?.latitude, partnerShop?.longitude);
  const deliveryPoint = getLocationPoint(order?.delivery_lat, order?.delivery_lng);
  const trackingSummary = useMemo(
    () => getPartnerOrderTrackingSummary(currentStatus, riderPoint, partnerPoint, deliveryPoint),
    [currentStatus, deliveryPoint, partnerPoint, riderPoint]
  );
  const riderToShopRouteUrl = getGoogleMapsDirectionsUrl(riderPoint, partnerPoint);
  const riderToDeliveryRouteUrl = getGoogleMapsDirectionsUrl(riderPoint, deliveryPoint);
  const deliveryLocationUrl = getSafeGoogleMapsSearchUrl(deliveryPoint, order?.delivery_address ?? undefined);

  return (
    <AppScreen>
      <ScreenHeader showHomeButton title="Partner order" />

      <View style={styles.statusHero}>
        <View style={styles.statusHeader}>
          <AppIcon
            backgroundColor={BrandColors.yellow}
            color={BrandColors.darkGreen}
            name={{ ios: 'shippingbox.fill', android: 'local_shipping', web: 'local_shipping' }}
            size={34}
            style={styles.heroIcon}
          />
          <View style={styles.statusCopy}>
            <Text style={styles.statusLabel}>Partner Order</Text>
            <Text style={styles.statusTitle}>{toPartnerOrderStatusLabel(currentStatus)}</Text>
          </View>
        </View>
      </View>

      {isLoading ? <Text style={styles.message}>Loading order details...</Text> : null}
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {order?.is_stale ? (
        <Text style={styles.message}>Showing saved order reference while latest status refreshes.</Text>
      ) : null}

      <DetailCard title="Order Details">
        <DetailRow label="Shop" value={order?.partner_name ?? 'Partner shop'} />
        <DetailRow label="Reference" value={orderId.slice(0, 8)} />
        <DetailRow label="Status" value={toPartnerOrderStatusLabel(currentStatus)} />
        <DetailRow label="Delivery address" value={order?.delivery_address ?? 'To be confirmed'} />
        <DetailRow label="Payment" value={toTitleCase(order?.payment_method ?? 'cash')} />
        <DetailRow label="Total" value={formatCurrency(Number(order?.total_amount ?? 0))} />
      </DetailCard>

      <DetailCard title="Assigned Rider">
        <DetailRow label="Rider" value={order?.assigned_rider_id ? 'Assigned' : 'Waiting for rider'} />
        <DetailRow label="Rider status" value={toTitleCase(order?.rider_status ?? 'not_started')} />
        <Text style={styles.emptyText}>{getTrackingStateMessage(currentStatus)}</Text>
      </DetailCard>

      <DetailCard title="Live ETA">
        <View style={styles.etaBox}>
          <Text style={styles.etaLabel}>{trackingSummary.label}</Text>
          <Text style={styles.etaPrimary}>{trackingSummary.primary}</Text>
          <Text style={styles.etaSecondary}>{trackingSummary.secondary}</Text>
        </View>
      </DetailCard>

      <DetailCard title="Rider Live Location">
        {riderPoint ? (
          <>
            <DetailRow label="Rider latitude" value={riderPoint.latitude.toFixed(6)} />
            <DetailRow label="Rider longitude" value={riderPoint.longitude.toFixed(6)} />
            <DetailRow label="Last updated" value={formatDateTime(riderLocation?.updated_at)} />
          </>
        ) : (
          <Text style={styles.emptyText}>
            Waiting for rider location. Tracking will appear once the rider starts sharing during pickup or delivery.
          </Text>
        )}
      </DetailCard>

      <DetailCard title="Map Actions">
        <View style={styles.mapActions}>
          {riderPoint ? (
            <PrimaryButton
              title="Open Rider Location"
              variant="secondary"
              onPress={() => void openRiderLocationMap(riderPoint)}
            />
          ) : null}
          {riderToShopRouteUrl ? (
            <PrimaryButton
              title="Open Rider to Shop Route"
              variant="secondary"
              onPress={() => void openMapUrl(riderToShopRouteUrl)}
            />
          ) : null}
          {riderToDeliveryRouteUrl ? (
            <PrimaryButton
              title="Open Rider to Delivery Route"
              variant="secondary"
              onPress={() => void openMapUrl(riderToDeliveryRouteUrl)}
            />
          ) : null}
          {deliveryLocationUrl ? (
            <PrimaryButton
              title="Open Delivery Location"
              variant="secondary"
              onPress={() => void openMapUrl(deliveryLocationUrl)}
            />
          ) : null}
          {!riderPoint && !deliveryLocationUrl ? (
            <Text style={styles.emptyText}>
              Map links will appear when rider or delivery coordinates are available.
            </Text>
          ) : null}
        </View>
      </DetailCard>

      <DetailCard title="Items">
        {items.length === 0 ? (
          <Text style={styles.emptyText}>Items may take a moment to appear.</Text>
        ) : (
          <View style={styles.itemList}>
            {items.map((item) => (
              <View style={styles.itemRow} key={item.id}>
                <Text style={styles.itemName}>
                  {item.quantity}x {item.product_name}
                </Text>
                <Text style={styles.itemTotal}>{formatCurrency(Number(item.line_total ?? 0))}</Text>
              </View>
            ))}
          </View>
        )}
      </DetailCard>

      <DetailCard title="Status Timeline">
        <View style={styles.timeline}>
          {(currentStatus === 'cancelled' ? ['cancelled'] : partnerTimelineStatuses).map((status, index, list) => (
            <TimelineItem
              currentStatus={currentStatus}
              isLast={index === list.length - 1}
              key={status}
              status={status as PartnerOrderStatus}
            />
          ))}
        </View>
      </DetailCard>

      <PrimaryButton
        disabled={isLoading}
        title={isLoading ? 'Refreshing...' : 'Refresh'}
        variant="secondary"
        onPress={() => void handleManualRefresh()}
      />
      <PrimaryButton title="Back to Activity" onPress={() => router.replace('/activity')} />
      <PrimaryButton title="Back Home" variant="secondary" onPress={() => router.replace('/')} />
    </AppScreen>
  );
}

function DetailCard({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
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

function TimelineItem({
  currentStatus,
  isLast,
  status,
}: {
  currentStatus: PartnerOrderStatus;
  isLast: boolean;
  status: PartnerOrderStatus;
}) {
  const currentIndex = partnerTimelineStatuses.indexOf(currentStatus);
  const statusIndex = partnerTimelineStatuses.indexOf(status);
  const isCancelled = currentStatus === 'cancelled';
  const isActive = status === currentStatus;
  const isComplete = !isCancelled && statusIndex >= 0 && currentIndex >= 0 && statusIndex < currentIndex;
  const activeColor = isCancelled ? BrandColors.danger : BrandColors.green;
  const dotColor = isActive || isComplete ? activeColor : BrandColors.border;

  return (
    <View style={styles.timelineItem}>
      <View style={styles.timelineRail}>
        <View style={[styles.timelineDot, { backgroundColor: dotColor }]} />
        {!isLast ? (
          <View style={[styles.timelineLine, (isActive || isComplete) && styles.timelineLineComplete]} />
        ) : null}
      </View>
      <View style={[styles.timelineCard, isActive && styles.activeTimelineCard]}>
        <Text style={[styles.timelineStatus, isActive && styles.activeTimelineStatus]}>
          {toPartnerOrderStatusLabel(status)}
        </Text>
        <Text style={styles.timelineDescription}>{getPartnerOrderStatusDescription(status)}</Text>
      </View>
    </View>
  );
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

function getPartnerOrderStatusDescription(status: PartnerOrderStatus) {
  switch (status) {
    case 'pending':
      return 'Your order was sent to the partner shop.';
    case 'accepted':
      return 'The partner shop accepted your order.';
    case 'preparing':
      return 'The partner shop is preparing your items.';
    case 'picked_up':
      return 'Your order is ready or has been picked up.';
    case 'on_the_way':
      return 'Your order is on the way.';
    case 'completed':
      return 'Partner order completed.';
    case 'cancelled':
      return 'This partner order was cancelled.';
  }
}

function toTitleCase(value: string) {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-PH', {
    currency: 'PHP',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(value);
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

async function openRiderLocationMap(riderPoint: LocationPoint) {
  const url = getSafeGoogleMapsSearchUrl(riderPoint);

  if (!url) {
    return;
  }

  await openMapUrl(url);
}

async function openMapUrl(url: string) {
  try {
    await openGoogleMapsUrlDirect(url);
  } catch (error) {
    if (__DEV__) {
      console.warn('PARTNER_ORDER_MAP_OPEN_FAILED', error);
    }
  }
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return 'Recently';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Recently';
  }

  return date.toLocaleString('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function getPartnerOrderTrackingSummary(
  status: PartnerOrderStatus,
  riderPoint: LocationPoint | null,
  partnerPoint: LocationPoint | null,
  deliveryPoint: LocationPoint | null
) {
  if (status === 'completed') {
    return {
      label: 'Delivery complete',
      primary: 'Completed',
      secondary: 'Your partner order has been completed.',
    };
  }

  if (status === 'cancelled') {
    return {
      label: 'Order cancelled',
      primary: 'Cancelled',
      secondary: 'This partner order was cancelled.',
    };
  }

  if (status === 'pending') {
    return {
      label: 'Waiting for confirmation',
      primary: 'Pending',
      secondary: 'The partner shop is reviewing your order.',
    };
  }

  if (!riderPoint) {
    return {
      label: 'Live ETA',
      primary: 'Waiting for rider location...',
      secondary: 'ETA will update once the rider starts sharing location.',
    };
  }

  const target =
    status === 'accepted' || status === 'preparing'
      ? { label: 'Rider to partner shop', point: partnerPoint }
      : { label: 'Rider to delivery location', point: deliveryPoint };

  if (!target.point) {
    return {
      label: target.label,
      primary: 'ETA unavailable',
      secondary: 'Coordinates are not available for this route yet.',
    };
  }

  const distanceKm = calculateDistanceKm(
    riderPoint.latitude,
    riderPoint.longitude,
    target.point.latitude,
    target.point.longitude
  );
  const etaMinutes = estimateEtaMinutes(distanceKm);

  return {
    label: target.label,
    primary: formatEta(etaMinutes),
    secondary: `${formatDistance(distanceKm)} away`,
  };
}

function getTrackingStateMessage(status: PartnerOrderStatus) {
  switch (status) {
    case 'pending':
      return 'Waiting for confirmation from the partner shop.';
    case 'accepted':
    case 'preparing':
      return 'The rider may be heading to the partner shop for pickup.';
    case 'picked_up':
    case 'on_the_way':
      return 'The rider is delivering your order to you.';
    case 'completed':
      return 'Delivery completed. Thank you for ordering with Camotes Runner.';
    case 'cancelled':
      return 'This partner order was cancelled.';
  }
}

const styles = StyleSheet.create({
  activeTimelineCard: {
    backgroundColor: BrandColors.softGreen,
    borderColor: BrandColors.limeGreen,
    borderWidth: 1,
  },
  activeTimelineStatus: {
    color: BrandColors.green,
  },
  card: {
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.border,
    borderRadius: 24,
    borderWidth: 1,
    elevation: 3,
    gap: 10,
    padding: 16,
    shadowColor: BrandColors.cardShadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
  },
  cardTitle: {
    color: BrandColors.ink,
    fontSize: 17,
    fontWeight: '900',
  },
  detailLabel: {
    color: BrandColors.mutedInk,
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
  },
  detailRow: {
    alignItems: 'center',
    borderBottomColor: BrandColors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'space-between',
    minHeight: 44,
  },
  detailValue: {
    color: BrandColors.ink,
    flex: 1,
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'right',
  },
  etaBox: {
    backgroundColor: BrandColors.softGreen,
    borderColor: BrandColors.limeGreen,
    borderRadius: 20,
    borderWidth: 1,
    gap: 4,
    padding: 14,
  },
  etaLabel: {
    color: BrandColors.green,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  etaPrimary: {
    color: BrandColors.darkGreen,
    fontSize: 25,
    fontWeight: '900',
  },
  etaSecondary: {
    color: BrandColors.mutedInk,
    fontSize: 13,
    fontWeight: '800',
  },
  emptyText: {
    color: BrandColors.mutedInk,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 19,
  },
  heroIcon: {
    borderRadius: 24,
    height: 64,
    width: 64,
  },
  itemList: {
    gap: 8,
  },
  itemName: {
    color: BrandColors.ink,
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
  },
  itemRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    minHeight: 34,
  },
  itemTotal: {
    color: BrandColors.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  mapActions: {
    gap: 10,
  },
  message: {
    color: BrandColors.mutedInk,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    textAlign: 'center',
  },
  statusCopy: {
    flex: 1,
    gap: 3,
  },
  statusHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
  },
  statusHero: {
    backgroundColor: BrandColors.darkGreen,
    borderRadius: 28,
    gap: 18,
    padding: 20,
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
    fontWeight: '900',
    lineHeight: 31,
  },
  timeline: {
    gap: 0,
  },
  timelineCard: {
    backgroundColor: BrandColors.background,
    borderRadius: 18,
    flex: 1,
    marginBottom: 10,
    minHeight: 72,
    padding: 13,
  },
  timelineDescription: {
    color: BrandColors.mutedInk,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    marginTop: 3,
  },
  timelineDot: {
    borderRadius: 7,
    height: 14,
    marginTop: 15,
    width: 14,
  },
  timelineItem: {
    flexDirection: 'row',
    gap: 12,
  },
  timelineLine: {
    backgroundColor: BrandColors.border,
    flex: 1,
    marginTop: 5,
    width: 2,
  },
  timelineLineComplete: {
    backgroundColor: BrandColors.green,
  },
  timelineRail: {
    alignItems: 'center',
    width: 20,
  },
  timelineStatus: {
    color: BrandColors.ink,
    fontSize: 15,
    fontWeight: '900',
  },
});
