import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { AppScreen } from '@/components/app-screen';
import { FoodImage } from '@/components/food-image';
import { ScreenHeader } from '@/components/screen-header';
import { BrandColors } from '@/constants/brand';
import {
  getAvailablePartnerProducts,
  type PartnerProduct,
} from '@/services/partner-product-service';
import { getBusinessPartnerById, type BusinessPartnerListItem } from '@/services/partner-service';
import { usePartnerCart } from '@/services/partner-cart';

type PartnerDetailScreenProps = {
  partnerId: string;
};

export function PartnerDetailScreen({ partnerId }: PartnerDetailScreenProps) {
  const [partner, setPartner] = useState<BusinessPartnerListItem | null>(null);
  const [products, setProducts] = useState<PartnerProduct[]>([]);
  const [isProductLoading, setIsProductLoading] = useState(false);
  const [message, setMessage] = useState('Loading partner shop...');
  const { addItem, cartSubtotal, itemCount, items, partnerId: cartPartnerId } = usePartnerCart();
  const isCurrentPartnerCart = cartPartnerId === partnerId;

  useEffect(() => {
    let isMounted = true;

    async function loadPartner() {
      setIsProductLoading(true);
      const nextPartner = await getBusinessPartnerById(partnerId);
      const nextProducts = nextPartner?.restaurant_id
        ? []
        : await getAvailablePartnerProducts(partnerId);

      if (!isMounted) {
        return;
      }

      setPartner(nextPartner);
      setProducts(nextProducts);
      setMessage(nextPartner ? '' : 'No partner shops available yet.');
      setIsProductLoading(false);
    }

    loadPartner().catch(() => {
      if (!isMounted) {
        return;
      }

      setPartner(null);
      setProducts([]);
      setMessage('No partner shops available yet.');
      setIsProductLoading(false);
    });

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

          {!partner.restaurant_id && products.length > 0 ? (
            <View style={styles.productSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Products / Menu</Text>
                <Text style={styles.sectionCount}>{products.length} available</Text>
              </View>
              <View style={styles.productList}>
                {products.map((product) => (
                  <View key={product.id} style={styles.productCard}>
                    <FoodImage imageUrl={product.image_url} label={product.name} variant="menuItem" />
                    <View style={styles.productCopy}>
                      <View style={styles.productTitleRow}>
                        <Text style={styles.productName}>{product.name}</Text>
                        <Text style={styles.productPrice}>{formatCurrency(product.price)}</Text>
                      </View>
                      <Text style={styles.productDescription}>
                        {product.description ?? 'Local partner product.'}
                      </Text>
                      <View style={styles.productFooter}>
                        <Text style={styles.productUnit}>{product.unit_label ?? 'Item'}</Text>
                        <Pressable
                          accessibilityRole="button"
                          style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
                          onPress={() => addItem({ partner, product })}>
                          <Text style={styles.productAction}>
                            {getProductQuantity(product.id, items, isCurrentPartnerCart) > 0
                              ? `${getProductQuantity(product.id, items, isCurrentPartnerCart)} in cart`
                              : 'Add'}
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
              {isCurrentPartnerCart && itemCount > 0 ? (
                <Pressable
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.cartSummary, pressed && styles.pressed]}
                  onPress={() =>
                    router.push({ pathname: '/partner-cart/[partnerId]', params: { partnerId } })
                  }>
                  <Text style={styles.cartSummaryText}>
                    {itemCount} items - {formatCurrency(cartSubtotal)}
                  </Text>
                  <Text style={styles.cartSummaryAction}>View Cart</Text>
                </Pressable>
              ) : null}
            </View>
          ) : (
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
                  {isProductLoading
                    ? 'Loading available products...'
                    : partner.restaurant_id
                      ? 'Food ordering for this shop continues through the restaurant menu.'
                      : 'This partner is listed for browsing while its full catalog is being prepared.'}
                </Text>
              </View>
            </View>
          )}
        </>
      ) : (
        <Text style={styles.message}>{message}</Text>
      )}
    </AppScreen>
  );
}

function getProductQuantity(
  productId: string,
  items: { id: string; quantity: number }[],
  isCurrentPartnerCart: boolean
) {
  if (!isCurrentPartnerCart) {
    return 0;
  }

  return items.find((item) => item.id === productId)?.quantity ?? 0;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-PH', {
    currency: 'PHP',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(value);
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
  addButton: {
    backgroundColor: BrandColors.softGreen,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  cartSummary: {
    alignItems: 'center',
    backgroundColor: BrandColors.green,
    borderRadius: 22,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    shadowColor: BrandColors.darkGreen,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 4,
  },
  cartSummaryAction: {
    color: BrandColors.yellow,
    fontSize: 14,
    fontWeight: '900',
  },
  cartSummaryText: {
    color: BrandColors.white,
    fontSize: 15,
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
  pressed: {
    opacity: 0.86,
  },
  productAction: {
    color: BrandColors.green,
    fontSize: 13,
    fontWeight: '900',
  },
  productCard: {
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.border,
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 12,
  },
  productCopy: {
    flex: 1,
    gap: 6,
  },
  productDescription: {
    color: BrandColors.mutedInk,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
  productFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  productList: {
    gap: 10,
  },
  productName: {
    color: BrandColors.ink,
    flex: 1,
    fontSize: 15,
    fontWeight: '900',
  },
  productPrice: {
    color: BrandColors.darkGreen,
    fontSize: 14,
    fontWeight: '900',
  },
  productSection: {
    gap: 12,
  },
  productTitleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  productUnit: {
    color: BrandColors.mutedInk,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  sectionCount: {
    color: BrandColors.green,
    fontSize: 13,
    fontWeight: '900',
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: BrandColors.ink,
    fontSize: 18,
    fontWeight: '900',
  },
});
