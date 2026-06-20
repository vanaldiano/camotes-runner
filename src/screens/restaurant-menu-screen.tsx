import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/app-screen';
import { FoodImage } from '@/components/food-image';
import { ScreenHeader } from '@/components/screen-header';
import { BrandColors } from '@/constants/brand';
import { useFoodCart } from '@/services/food-cart';
import {
  getRestaurantMenu,
  type RestaurantMenu,
  type RestaurantMenuItem,
} from '@/services/restaurant-service';
import { hasSupabaseConfig } from '@/services/supabase';

const fallbackMenu: RestaurantMenu = {
  restaurant: {
    id: 'sample-m-cafe',
    name: 'M Cafe',
    category: 'Cafe',
    address: 'Camotes Island',
    deliveryFee: 'PHP 50',
    estimatedDeliveryTime: '35-45 min',
    imageUrl: null,
    isOpen: true,
    latitude: 10.6460,
    longitude: 124.3510,
  },
  categories: [
    {
      id: 'sample-burger',
      name: 'Burger',
      items: [
        {
          id: 'sample-m-cafe-burger',
          name: 'M Cafe Burger',
          description: 'Classic burger with cheese and house sauce.',
          price: 'PHP 120',
          unitPrice: 120,
          imageUrl: null,
          isAvailable: true,
        },
      ],
    },
    {
      id: 'sample-rice-meal',
      name: 'Rice meal',
      items: [
        {
          id: 'sample-chicken-rice-meal',
          name: 'Chicken Rice Meal',
          description: 'Chicken rice meal with side and sauce.',
          price: 'PHP 150',
          unitPrice: 150,
          imageUrl: null,
          isAvailable: true,
        },
      ],
    },
    {
      id: 'sample-drinks',
      name: 'Drinks',
      items: [
        {
          id: 'sample-iced-tea',
          name: 'Iced Tea',
          description: 'Refreshing house iced tea.',
          price: 'PHP 45',
          unitPrice: 45,
          imageUrl: null,
          isAvailable: false,
        },
      ],
    },
  ],
};

type RestaurantMenuScreenProps = {
  restaurantId: string;
};

export function RestaurantMenuScreen({ restaurantId }: RestaurantMenuScreenProps) {
  const [menu, setMenu] = useState<RestaurantMenu>(fallbackMenu);
  const [message, setMessage] = useState('');
  const { addItem, itemCount, items, total } = useFoodCart();

  useEffect(() => {
    if (!restaurantId || !hasSupabaseConfig || restaurantId.startsWith('sample-')) {
      return;
    }

    let isMounted = true;

    async function loadMenu() {
      try {
        const nextMenu = await getRestaurantMenu(restaurantId);

        if (isMounted) {
          setMenu(nextMenu);
          setMessage('');
        }
      } catch {
        if (isMounted) {
          setMenu(fallbackMenu);
          setMessage('Live menu is temporarily unavailable. Showing a sample menu.');
        }
      }
    }

    loadMenu();

    return () => {
      isMounted = false;
    };
  }, [restaurantId]);

  const statusColor = menu.restaurant.isOpen ? BrandColors.green : BrandColors.danger;

  return (
    <AppScreen>
      <ScreenHeader showHomeButton title={menu.restaurant.name} />

      <View style={styles.restaurantCard}>
        <View style={styles.restaurantHeader}>
          <View style={styles.restaurantCopy}>
            <Text style={styles.category}>{menu.restaurant.category}</Text>
            <Text style={styles.address}>{menu.restaurant.address}</Text>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}1F` }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {menu.restaurant.isOpen ? 'Open' : 'Closed'}
            </Text>
          </View>
        </View>

        <View style={styles.detailRows}>
          <DetailRow label="Delivery fee" value={menu.restaurant.deliveryFee} />
          <DetailRow label="Estimated delivery" value={menu.restaurant.estimatedDeliveryTime} />
        </View>
      </View>

      <View style={styles.menuSections}>
        {menu.categories.map((category) => (
          <View key={category.id} style={styles.categoryCard}>
            <Text style={styles.categoryTitle}>{category.name}</Text>

            {category.items.length === 0 ? (
              <Text style={styles.emptyText}>No menu items yet.</Text>
            ) : (
              <View style={styles.itemList}>
                {category.items.map((item) => (
                  <MenuItemRow
                    key={item.id}
                    item={item}
                    quantity={items.find((cartItem) => cartItem.id === item.id)?.quantity ?? 0}
                    onAdd={() =>
                      addItem({
                        description: item.description,
                        id: item.id,
                        name: item.name,
                        price: item.price,
                        restaurantId: menu.restaurant.id,
                        restaurantLatitude: menu.restaurant.latitude,
                        restaurantLongitude: menu.restaurant.longitude,
                        restaurantName: menu.restaurant.name,
                        unitPrice: item.unitPrice,
                      })
                    }
                  />
                ))}
              </View>
            )}
          </View>
        ))}
      </View>

      {itemCount > 0 ? (
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [styles.cartSummary, pressed && styles.pressed]}
          onPress={() => router.push('/cart')}>
          <Text style={styles.cartSummaryText}>
            {`View Cart • ${itemCount} ${itemCount === 1 ? 'item' : 'items'} • ${formatPeso(total)}`}
          </Text>
        </Pressable>
      ) : null}

      {message ? <Text style={styles.message}>{message}</Text> : null}
    </AppScreen>
  );
}

function MenuItemRow({
  item,
  onAdd,
  quantity,
}: {
  item: RestaurantMenuItem;
  onAdd: () => void;
  quantity: number;
}) {
  const statusColor = item.isAvailable ? BrandColors.green : BrandColors.danger;

  return (
    <View style={styles.menuItem}>
      <FoodImage imageUrl={item.imageUrl} label={item.name} variant="menuItem" />

      <View style={styles.itemCopy}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemDescription}>{item.description}</Text>
        <Text style={styles.itemPrice}>{item.price}</Text>
      </View>

      <View style={[styles.itemStatusBadge, { backgroundColor: `${statusColor}1F` }]}>
        <Text style={[styles.itemStatusText, { color: statusColor }]}>
          {item.isAvailable ? 'Available' : 'Unavailable'}
        </Text>
      </View>

      <View style={styles.itemActions}>
        {quantity > 0 ? <Text style={styles.quantityText}>{quantity} in cart</Text> : null}
        <Pressable
          accessibilityRole="button"
          disabled={!item.isAvailable}
          style={({ pressed }) => [
            styles.addButton,
            !item.isAvailable && styles.disabledAddButton,
            pressed && item.isAvailable && styles.pressed,
          ]}
          onPress={onAdd}>
          <Text style={[styles.addButtonText, !item.isAvailable && styles.disabledAddButtonText]}>
            Add
          </Text>
        </Pressable>
      </View>
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

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  restaurantCard: {
    borderRadius: 24,
    backgroundColor: BrandColors.white,
    borderWidth: 1,
    borderColor: BrandColors.border,
    padding: 16,
    gap: 14,
    shadowColor: BrandColors.cardShadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: 3,
  },
  restaurantHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  restaurantCopy: {
    flex: 1,
    gap: 4,
  },
  category: {
    color: BrandColors.green,
    fontSize: 14,
    fontWeight: '900',
  },
  address: {
    color: BrandColors.ink,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '900',
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '900',
  },
  detailRows: {
    borderTopWidth: 1,
    borderTopColor: BrandColors.border,
  },
  detailRow: {
    minHeight: 42,
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
  menuSections: {
    gap: 14,
  },
  categoryCard: {
    borderRadius: 24,
    backgroundColor: BrandColors.white,
    borderWidth: 1,
    borderColor: BrandColors.border,
    padding: 16,
    gap: 12,
  },
  categoryTitle: {
    color: BrandColors.ink,
    fontSize: 17,
    fontWeight: '900',
  },
  itemList: {
    gap: 10,
  },
  menuItem: {
    minHeight: 96,
    borderRadius: 18,
    backgroundColor: BrandColors.background,
    borderWidth: 1,
    borderColor: BrandColors.border,
    padding: 13,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    alignItems: 'flex-start',
  },
  itemCopy: {
    flex: 1,
    minWidth: 160,
    gap: 4,
  },
  itemName: {
    color: BrandColors.ink,
    fontSize: 15,
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
  itemStatusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  itemStatusText: {
    fontSize: 11,
    fontWeight: '900',
  },
  itemActions: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  quantityText: {
    color: BrandColors.green,
    fontSize: 12,
    fontWeight: '900',
  },
  addButton: {
    minHeight: 40,
    borderRadius: 16,
    backgroundColor: BrandColors.green,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledAddButton: {
    backgroundColor: BrandColors.border,
  },
  addButtonText: {
    color: BrandColors.white,
    fontSize: 14,
    fontWeight: '900',
  },
  disabledAddButtonText: {
    color: BrandColors.mutedInk,
  },
  cartSummary: {
    minHeight: 58,
    borderRadius: 22,
    backgroundColor: BrandColors.darkGreen,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    shadowColor: BrandColors.darkGreen,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 5,
  },
  cartSummaryText: {
    color: BrandColors.white,
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
  },
  emptyText: {
    color: BrandColors.mutedInk,
    fontSize: 13,
    fontWeight: '700',
  },
  message: {
    color: BrandColors.mutedInk,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
});
