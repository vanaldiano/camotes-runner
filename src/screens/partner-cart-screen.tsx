import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/app-screen';
import { FoodImage } from '@/components/food-image';
import { PrimaryButton } from '@/components/primary-button';
import { ScreenHeader } from '@/components/screen-header';
import { BrandColors } from '@/constants/brand';
import { usePartnerCart, type PartnerCartItem } from '@/services/partner-cart';

type PartnerCartScreenProps = {
  partnerId: string;
};

export function PartnerCartScreen({ partnerId }: PartnerCartScreenProps) {
  const {
    cartSubtotal,
    decreaseQuantity,
    increaseQuantity,
    itemCount,
    items,
    partnerId: cartPartnerId,
    partnerName,
    removeItem,
  } = usePartnerCart();
  const isCurrentPartnerCart = cartPartnerId === partnerId;
  const visibleItems = isCurrentPartnerCart ? items : [];

  return (
    <AppScreen>
      <ScreenHeader showHomeButton title="Partner cart" />

      {visibleItems.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Your partner cart is empty.</Text>
          <Text style={styles.emptyText}>Add products from a partner shop before checkout.</Text>
          <PrimaryButton
            title="Back to partner shop"
            variant="secondary"
            onPress={() => router.replace({ pathname: '/partner/[id]', params: { id: partnerId } })}
          />
        </View>
      ) : (
        <>
          <View style={styles.headerCard}>
            <Text style={styles.eyebrow}>Partner order</Text>
            <Text style={styles.partnerName}>{partnerName}</Text>
            <Text style={styles.headerText}>{itemCount} items ready for checkout</Text>
          </View>

          <View style={styles.itemList}>
            {visibleItems.map((item) => (
              <CartItemRow
                item={item}
                key={item.id}
                onDecrease={() => decreaseQuantity(item.id)}
                onIncrease={() => increaseQuantity(item.id)}
                onRemove={() => removeItem(item.id)}
              />
            ))}
          </View>

          <View style={styles.summaryCard}>
            <SummaryRow label="Subtotal" value={formatCurrency(cartSubtotal)} />
            <SummaryRow label="Delivery fee" value="Confirmed at checkout" />
          </View>

          <PrimaryButton
            title="Continue to Checkout"
            onPress={() =>
              router.push({ pathname: '/partner-checkout/[partnerId]', params: { partnerId } })
            }
          />
        </>
      )}
    </AppScreen>
  );
}

function CartItemRow({
  item,
  onDecrease,
  onIncrease,
  onRemove,
}: {
  item: PartnerCartItem;
  onDecrease: () => void;
  onIncrease: () => void;
  onRemove: () => void;
}) {
  return (
    <View style={styles.itemCard}>
      <FoodImage imageUrl={item.imageUrl} label={item.name} variant="menuItem" />
      <View style={styles.itemCopy}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemDescription}>{item.description ?? item.unitLabel ?? 'Partner product'}</Text>
        <Text style={styles.itemPrice}>{formatCurrency(item.price * item.quantity)}</Text>
        <View style={styles.quantityRow}>
          <Pressable accessibilityRole="button" style={styles.quantityButton} onPress={onDecrease}>
            <Text style={styles.quantityButtonText}>-</Text>
          </Pressable>
          <Text style={styles.quantityText}>{item.quantity}</Text>
          <Pressable accessibilityRole="button" style={styles.quantityButton} onPress={onIncrease}>
            <Text style={styles.quantityButtonText}>+</Text>
          </Pressable>
          <Pressable accessibilityRole="button" style={styles.removeButton} onPress={onRemove}>
            <Text style={styles.removeText}>Remove</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-PH', {
    currency: 'PHP',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(value);
}

const styles = StyleSheet.create({
  emptyCard: {
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.border,
    borderRadius: 24,
    borderWidth: 1,
    gap: 12,
    padding: 18,
  },
  emptyText: {
    color: BrandColors.mutedInk,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  emptyTitle: {
    color: BrandColors.ink,
    fontSize: 20,
    fontWeight: '900',
  },
  eyebrow: {
    color: BrandColors.green,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  headerCard: {
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.border,
    borderRadius: 24,
    borderWidth: 1,
    gap: 4,
    padding: 16,
  },
  headerText: {
    color: BrandColors.mutedInk,
    fontSize: 14,
    fontWeight: '700',
  },
  itemCard: {
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.border,
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 12,
  },
  itemCopy: {
    flex: 1,
    gap: 6,
  },
  itemDescription: {
    color: BrandColors.mutedInk,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  itemList: {
    gap: 10,
  },
  itemName: {
    color: BrandColors.ink,
    fontSize: 16,
    fontWeight: '900',
  },
  itemPrice: {
    color: BrandColors.darkGreen,
    fontSize: 15,
    fontWeight: '900',
  },
  partnerName: {
    color: BrandColors.ink,
    fontSize: 22,
    fontWeight: '900',
  },
  quantityButton: {
    alignItems: 'center',
    backgroundColor: BrandColors.softGreen,
    borderRadius: 14,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  quantityButtonText: {
    color: BrandColors.green,
    fontSize: 18,
    fontWeight: '900',
  },
  quantityRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  quantityText: {
    color: BrandColors.ink,
    fontSize: 15,
    fontWeight: '900',
    minWidth: 20,
    textAlign: 'center',
  },
  removeButton: {
    marginLeft: 'auto',
    padding: 6,
  },
  removeText: {
    color: BrandColors.danger,
    fontSize: 13,
    fontWeight: '900',
  },
  summaryCard: {
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.border,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  summaryLabel: {
    color: BrandColors.mutedInk,
    fontSize: 14,
    fontWeight: '800',
  },
  summaryRow: {
    alignItems: 'center',
    borderBottomColor: BrandColors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 48,
  },
  summaryValue: {
    color: BrandColors.ink,
    fontSize: 15,
    fontWeight: '900',
  },
});
