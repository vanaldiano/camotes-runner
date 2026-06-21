import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { AppScreen } from '@/components/app-screen';
import { PrimaryButton } from '@/components/primary-button';
import { ScreenHeader } from '@/components/screen-header';
import { BrandColors } from '@/constants/brand';
import { getPartnerOrderById, type PartnerOrder } from '@/services/partner-order-service';

type PartnerOrderSuccessScreenProps = {
  orderId: string;
};

export function PartnerOrderSuccessScreen({ orderId }: PartnerOrderSuccessScreenProps) {
  const [order, setOrder] = useState<PartnerOrder | null>(null);
  const [couldLoadOrder, setCouldLoadOrder] = useState(true);

  useEffect(() => {
    let isMounted = true;

    getPartnerOrderById(orderId)
      .then((nextOrder) => {
        if (isMounted) {
          setOrder(nextOrder);
          setCouldLoadOrder(Boolean(nextOrder));
        }
      })
      .catch((error) => {
        if (__DEV__) {
          console.warn('PARTNER_ORDER_SUCCESS_LOAD_SKIPPED', {
            error,
            orderId,
          });
        }

        if (isMounted) {
          setOrder(null);
          setCouldLoadOrder(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [orderId]);

  return (
    <AppScreen>
      <ScreenHeader showHomeButton title="Order sent" />

      <View style={styles.statusHero}>
        <View style={styles.statusHeader}>
          <AppIcon
            backgroundColor={BrandColors.yellow}
            color={BrandColors.darkGreen}
            name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }}
            size={34}
            style={styles.icon}
          />
          <View style={styles.statusCopy}>
            <Text style={styles.statusLabel}>Partner order</Text>
            <Text style={styles.title}>Order sent</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Your order was sent to the partner shop.</Text>
        <DetailRow label="Order reference" value={orderId.slice(0, 8)} />
        <DetailRow label="Status" value={order?.status ? toTitleCase(order.status) : 'Pending'} />
        {!couldLoadOrder ? (
          <Text style={styles.note}>Order details may take a moment to appear.</Text>
        ) : null}
      </View>

      <PrimaryButton title="Back to Home" onPress={() => router.replace('/')} />
      <PrimaryButton
        title="View Activity"
        variant="secondary"
        onPress={() => router.replace('/activity')}
      />
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

function toTitleCase(value: string) {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.border,
    borderRadius: 24,
    borderWidth: 1,
    gap: 8,
    padding: 16,
    shadowColor: BrandColors.cardShadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: 3,
  },
  cardTitle: {
    color: BrandColors.ink,
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 23,
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
  icon: {
    borderRadius: 24,
    height: 64,
    width: 64,
  },
  note: {
    color: BrandColors.green,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 19,
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
  text: {
    color: BrandColors.mutedInk,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  title: {
    color: BrandColors.white,
    fontSize: 25,
    fontWeight: '900',
    lineHeight: 31,
  },
});
