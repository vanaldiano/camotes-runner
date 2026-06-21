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

      <View style={styles.card}>
        <AppIcon
          backgroundColor={BrandColors.paleYellow}
          color={BrandColors.darkGreen}
          name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }}
          size={36}
          style={styles.icon}
        />
        <Text style={styles.title}>Your order was sent to the partner shop.</Text>
        <Text style={styles.text}>
          Order reference: {orderId.slice(0, 8)}
        </Text>
        <Text style={styles.text}>
          Status: {order?.status ? toTitleCase(order.status) : 'Pending'}
        </Text>
        {!couldLoadOrder ? (
          <Text style={styles.note}>Order details may take a moment to appear.</Text>
        ) : null}
      </View>

      <PrimaryButton title="Back to Home" onPress={() => router.replace('/')} />
      <PrimaryButton
        title="Browse Categories"
        variant="secondary"
        onPress={() => router.replace('/')}
      />
    </AppScreen>
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
    alignItems: 'center',
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.border,
    borderRadius: 28,
    borderWidth: 1,
    gap: 10,
    padding: 24,
  },
  icon: {
    borderRadius: 26,
    height: 64,
    width: 64,
  },
  note: {
    color: BrandColors.green,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 19,
    textAlign: 'center',
  },
  text: {
    color: BrandColors.mutedInk,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  title: {
    color: BrandColors.ink,
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 28,
    textAlign: 'center',
  },
});
