import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/app-screen';
import { FoodImage } from '@/components/food-image';
import { ScreenHeader } from '@/components/screen-header';
import { BrandColors } from '@/constants/brand';
import { getRestaurants, type RestaurantListItem } from '@/services/restaurant-service';
import { hasSupabaseConfig } from '@/services/supabase';

const sampleRestaurants: RestaurantListItem[] = [
  {
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
  {
    id: 'sample-island-meals',
    name: 'Island Meals',
    category: 'Rice meals',
    address: 'San Francisco, Camotes',
    deliveryFee: 'PHP 60',
    estimatedDeliveryTime: '40-50 min',
    imageUrl: null,
    isOpen: true,
    latitude: 10.6881,
    longitude: 124.4020,
  },
  {
    id: 'sample-port-snacks',
    name: 'Port Snacks',
    category: 'Snacks & drinks',
    address: 'Consuelo Port',
    deliveryFee: 'PHP 45',
    estimatedDeliveryTime: '30-40 min',
    imageUrl: null,
    isOpen: false,
    latitude: 10.6365167,
    longitude: 124.2980967,
  },
];

export function RestaurantsScreen() {
  const [restaurants, setRestaurants] = useState<RestaurantListItem[]>(sampleRestaurants);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!hasSupabaseConfig) {
      return;
    }

    let isMounted = true;

    async function loadRestaurants() {
      try {
        const rows = await getRestaurants();

        if (!isMounted) {
          return;
        }

        if (rows.length > 0) {
          setRestaurants(rows);
          setMessage('');
        }
      } catch {
        if (isMounted) {
          setRestaurants(sampleRestaurants);
          setMessage('Live restaurants are temporarily unavailable. Showing sample places.');
        }
      }
    }

    loadRestaurants();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <AppScreen>
      <ScreenHeader showHomeButton title="Restaurants" />

      <View style={styles.restaurantList}>
        {restaurants.map((restaurant) => (
          <RestaurantCard key={restaurant.id} restaurant={restaurant} />
        ))}
      </View>

      {message ? <Text style={styles.message}>{message}</Text> : null}
    </AppScreen>
  );
}

function RestaurantCard({ restaurant }: { restaurant: RestaurantListItem }) {
  const statusColor = restaurant.isOpen ? BrandColors.green : BrandColors.danger;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`View ${restaurant.name} menu`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={() =>
        router.push({
          pathname: '/restaurant/[id]',
          params: { id: restaurant.id },
        })
      }>
      <View style={styles.cardTop}>
        <FoodImage imageUrl={restaurant.imageUrl} label={restaurant.name} variant="restaurant" />

        <View style={styles.cardCopy}>
          <Text style={styles.name}>{restaurant.name}</Text>
          <Text style={styles.category}>{restaurant.category}</Text>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: `${statusColor}1F` }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>
            {restaurant.isOpen ? 'Open' : 'Closed'}
          </Text>
        </View>
      </View>

      <View style={styles.detailRows}>
        <DetailRow label="Address" value={restaurant.address} />
        <DetailRow label="Delivery fee" value={restaurant.deliveryFee} />
        <DetailRow label="Estimated delivery" value={restaurant.estimatedDeliveryTime} />
      </View>
    </Pressable>
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
  restaurantList: {
    gap: 14,
  },
  card: {
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
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardCopy: {
    flex: 1,
    gap: 3,
  },
  name: {
    color: BrandColors.ink,
    fontSize: 18,
    fontWeight: '900',
  },
  category: {
    color: BrandColors.mutedInk,
    fontSize: 13,
    fontWeight: '800',
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
  message: {
    color: BrandColors.mutedInk,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.84,
    transform: [{ scale: 0.99 }],
  },
});
