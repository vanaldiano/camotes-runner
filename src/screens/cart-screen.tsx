import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/app-screen';
import { PrimaryButton } from '@/components/primary-button';
import { ScreenHeader } from '@/components/screen-header';
import { BrandColors } from '@/constants/brand';
import { useFoodCart, type FoodCartItem } from '@/services/food-cart';

export function CartScreen() {
  const {
    cartSubtotal,
    clearCart,
    decreaseQuantity,
    increaseQuantity,
    items,
    restaurantName,
  } = useFoodCart();

  return (
    <AppScreen>
      <ScreenHeader showHomeButton title="Your order" />

      <View style={styles.restaurantCard}>
        <Text style={styles.restaurantLabel}>Restaurant</Text>
        <Text style={styles.restaurantName}>{restaurantName || 'No restaurant selected'}</Text>
      </View>

      {items.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Your cart is empty.</Text>
          <Text style={styles.emptyText}>Add menu items from a restaurant before checkout.</Text>
        </View>
      ) : (
        <View style={styles.cartItems}>
          {items.map((item) => (
            <CartItemRow
              key={item.id}
              item={item}
              onDecrease={() => decreaseQuantity(item.id)}
              onIncrease={() => increaseQuantity(item.id)}
            />
          ))}
        </View>
      )}

      <View style={styles.totalCard}>
        <TotalRow label="Subtotal" value={formatPeso(cartSubtotal)} />
        <TotalRow label="Delivery fee" value="To be confirmed at checkout" />
        <View style={styles.totalDivider} />
        <TotalRow highlighted label="Items total" value={formatPeso(cartSubtotal)} />
      </View>

      <PrimaryButton
        disabled={items.length === 0}
        title="Continue to Checkout"
        onPress={() => router.push('/food-checkout')}
      />

      {items.length > 0 ? (
        <PrimaryButton title="Clear Cart" variant="danger" onPress={clearCart} />
      ) : null}
    </AppScreen>
  );
}

function CartItemRow({
  item,
  onDecrease,
  onIncrease,
}: {
  item: FoodCartItem;
  onDecrease: () => void;
  onIncrease: () => void;
}) {
  return (
    <View style={styles.itemCard}>
      <View style={styles.itemCopy}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemDescription}>{item.description}</Text>
        <Text style={styles.itemPrice}>{formatPeso(item.unitPrice * item.quantity)}</Text>
      </View>

      <View style={styles.quantityControls}>
        <QuantityButton label="-" onPress={onDecrease} />
        <Text style={styles.quantityText}>{item.quantity}</Text>
        <QuantityButton label="+" onPress={onIncrease} />
      </View>
    </View>
  );
}

function QuantityButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [styles.quantityButton, pressed && styles.pressed]}
      onPress={onPress}>
      <Text style={styles.quantityButtonText}>{label}</Text>
    </Pressable>
  );
}

function TotalRow({
  highlighted = false,
  label,
  value,
}: {
  highlighted?: boolean;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.totalRow}>
      <Text style={[styles.totalLabel, highlighted && styles.highlightedTotalText]}>{label}</Text>
      <Text style={[styles.totalValue, highlighted && styles.highlightedTotalText]}>{value}</Text>
    </View>
  );
}

function formatPeso(value: number) {
  return new Intl.NumberFormat('en-PH', {
    currency: 'PHP',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(value);
}

const styles = StyleSheet.create({
  restaurantCard: {
    borderRadius: 24,
    backgroundColor: BrandColors.white,
    borderWidth: 1,
    borderColor: BrandColors.border,
    padding: 16,
    gap: 5,
  },
  restaurantLabel: {
    color: BrandColors.mutedInk,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  restaurantName: {
    color: BrandColors.ink,
    fontSize: 19,
    fontWeight: '900',
  },
  emptyCard: {
    borderRadius: 24,
    backgroundColor: BrandColors.white,
    borderWidth: 1,
    borderColor: BrandColors.border,
    padding: 18,
    gap: 5,
  },
  emptyTitle: {
    color: BrandColors.ink,
    fontSize: 17,
    fontWeight: '900',
  },
  emptyText: {
    color: BrandColors.mutedInk,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  cartItems: {
    gap: 12,
  },
  itemCard: {
    borderRadius: 24,
    backgroundColor: BrandColors.white,
    borderWidth: 1,
    borderColor: BrandColors.border,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  itemCopy: {
    flex: 1,
    gap: 4,
  },
  itemName: {
    color: BrandColors.ink,
    fontSize: 16,
    fontWeight: '900',
  },
  itemDescription: {
    color: BrandColors.mutedInk,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  itemPrice: {
    color: BrandColors.green,
    fontSize: 14,
    fontWeight: '900',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  quantityButton: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: BrandColors.softGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityButtonText: {
    color: BrandColors.green,
    fontSize: 20,
    lineHeight: 23,
    fontWeight: '900',
  },
  quantityText: {
    minWidth: 20,
    color: BrandColors.ink,
    fontSize: 15,
    textAlign: 'center',
    fontWeight: '900',
  },
  totalCard: {
    borderRadius: 24,
    backgroundColor: BrandColors.white,
    borderWidth: 1,
    borderColor: BrandColors.border,
    padding: 16,
    gap: 10,
  },
  totalRow: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  totalLabel: {
    color: BrandColors.mutedInk,
    fontSize: 14,
    fontWeight: '800',
  },
  totalValue: {
    color: BrandColors.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  totalDivider: {
    height: 1,
    backgroundColor: BrandColors.border,
  },
  highlightedTotalText: {
    color: BrandColors.green,
    fontSize: 17,
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
});
