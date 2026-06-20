import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { AppScreen } from '@/components/app-screen';
import { FoodImage } from '@/components/food-image';
import { ScreenHeader } from '@/components/screen-header';
import { BrandColors } from '@/constants/brand';
import { getBusinessPartnerById, type BusinessPartnerListItem } from '@/services/partner-service';

type PartnerDetailScreenProps = {
  partnerId: string;
};

export function PartnerDetailScreen({ partnerId }: PartnerDetailScreenProps) {
  const [partner, setPartner] = useState<BusinessPartnerListItem | null>(null);
  const [message, setMessage] = useState('Loading partner shop...');

  useEffect(() => {
    let isMounted = true;

    async function loadPartner() {
      const nextPartner = await getBusinessPartnerById(partnerId);

      if (!isMounted) {
        return;
      }

      setPartner(nextPartner);
      setMessage(nextPartner ? '' : 'No partner shops available yet.');
    }

    loadPartner();

    return () => {
      isMounted = false;
    };
  }, [partnerId]);

  return (
    <AppScreen>
      <ScreenHeader showHomeButton title={partner?.name ?? 'Partner shop'} />

      {partner ? (
        <>
          <View style={styles.heroCard}>
            <FoodImage imageUrl={partner.image_url} label={partner.name} variant="menuItem" />
            <View style={styles.heroCopy}>
              <Text style={styles.category}>{partner.categoryName}</Text>
              <Text style={styles.name}>{partner.name}</Text>
              <Text style={styles.description}>{partner.description ?? 'Local partner shop.'}</Text>
            </View>
          </View>

          <View style={styles.detailCard}>
            <DetailRow label="Sub-category" value={partner.subcategoryName} />
            <DetailRow label="Address" value={partner.address ?? 'Camotes Island'} />
            <DetailRow label="Estimated time" value={partner.estimated_time ?? 'Time varies'} />
            <DetailRow label="Delivery fee" value={partner.delivery_fee_label ?? 'Delivery fee varies'} />
          </View>

          <View style={styles.comingSoonCard}>
            <AppIcon
              backgroundColor={BrandColors.paleYellow}
              color={BrandColors.darkGreen}
              name={{ ios: 'bag', android: 'shopping_bag', web: 'shopping_bag' }}
              size={28}
              style={styles.comingSoonIcon}
            />
            <View style={styles.comingSoonCopy}>
              <Text style={styles.comingSoonTitle}>Products/menu coming soon</Text>
              <Text style={styles.comingSoonText}>
                This partner is listed for browsing while its full catalog is being prepared.
              </Text>
            </View>
          </View>
        </>
      ) : (
        <Text style={styles.message}>{message}</Text>
      )}
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

const styles = StyleSheet.create({
  category: {
    color: BrandColors.green,
    fontSize: 13,
    fontWeight: '900',
  },
  comingSoonCard: {
    borderRadius: 24,
    backgroundColor: BrandColors.white,
    borderWidth: 1,
    borderColor: BrandColors.border,
    flexDirection: 'row',
    gap: 14,
    padding: 16,
  },
  comingSoonCopy: {
    flex: 1,
    gap: 5,
  },
  comingSoonIcon: {
    width: 58,
    height: 58,
    borderRadius: 22,
  },
  comingSoonText: {
    color: BrandColors.mutedInk,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
  comingSoonTitle: {
    color: BrandColors.ink,
    fontSize: 17,
    fontWeight: '900',
  },
  description: {
    color: BrandColors.mutedInk,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  detailCard: {
    borderRadius: 24,
    backgroundColor: BrandColors.white,
    borderWidth: 1,
    borderColor: BrandColors.border,
    paddingHorizontal: 16,
  },
  detailLabel: {
    color: BrandColors.mutedInk,
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
  },
  detailRow: {
    borderBottomWidth: 1,
    borderBottomColor: BrandColors.border,
    flexDirection: 'row',
    gap: 14,
    minHeight: 48,
    alignItems: 'center',
  },
  detailValue: {
    color: BrandColors.ink,
    flex: 1,
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'right',
  },
  heroCard: {
    borderRadius: 26,
    backgroundColor: BrandColors.white,
    borderWidth: 1,
    borderColor: BrandColors.border,
    flexDirection: 'row',
    gap: 14,
    padding: 16,
    shadowColor: BrandColors.cardShadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 2,
  },
  heroCopy: {
    flex: 1,
    gap: 5,
  },
  message: {
    color: BrandColors.mutedInk,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  name: {
    color: BrandColors.ink,
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 28,
  },
});
