import { supabase } from '@/services/supabase';
import type { Tables } from '@/types/database';

export type Restaurant = Tables<'restaurants'>;
export type MenuCategory = Tables<'menu_categories'>;
export type MenuItem = Tables<'menu_items'>;

export type RestaurantListItem = {
  address: string;
  category: string;
  deliveryFee: string;
  estimatedDeliveryTime: string;
  id: string;
  imageUrl: string | null;
  isOpen: boolean;
  latitude: number | null;
  longitude: number | null;
  name: string;
};

export type RestaurantMenuItem = {
  description: string;
  id: string;
  imageUrl: string | null;
  isAvailable: boolean;
  name: string;
  price: string;
  unitPrice: number;
};

export type RestaurantMenuCategory = {
  id: string;
  items: RestaurantMenuItem[];
  name: string;
};

export type RestaurantMenu = {
  categories: RestaurantMenuCategory[];
  restaurant: RestaurantListItem;
};

export async function getRestaurants() {
  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapRestaurantToListItem);
}

export async function getRestaurantById(restaurantId: string) {
  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .eq('id', restaurantId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(`Restaurant ${restaurantId} was not found.`);
  }

  return data;
}

export async function getMenuCategories(restaurantId: string) {
  const { data, error } = await supabase
    .from('menu_categories')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .eq('is_active', true)
    .order('display_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getMenuItems(restaurantId: string) {
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('display_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getRestaurantMenu(restaurantId: string): Promise<RestaurantMenu> {
  const [restaurant, categories, items] = await Promise.all([
    getRestaurantById(restaurantId),
    getMenuCategories(restaurantId),
    getMenuItems(restaurantId),
  ]);

  return {
    restaurant: mapRestaurantToListItem(restaurant),
    categories: groupMenuItemsByCategory(categories, items),
  };
}

export function mapRestaurantToListItem(restaurant: Restaurant): RestaurantListItem {
  return {
    address: restaurant.address,
    category: restaurant.category,
    deliveryFee: formatMenuPrice(restaurant.delivery_fee),
    estimatedDeliveryTime: restaurant.estimated_delivery_time,
    id: restaurant.id,
    imageUrl: restaurant.image_url,
    isOpen: restaurant.is_active,
    latitude: restaurant.latitude,
    longitude: restaurant.longitude,
    name: restaurant.name,
  };
}

export function groupMenuItemsByCategory(
  categories: MenuCategory[],
  items: MenuItem[]
): RestaurantMenuCategory[] {
  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    items: items
      .filter((item) => item.category_id === category.id)
      .map((item) => ({
        description: item.description ?? 'No description yet.',
        id: item.id,
        imageUrl: item.image_url,
        isAvailable: item.is_available,
        name: item.name,
        price: formatMenuPrice(item.price),
        unitPrice: Number(item.price),
      })),
  }));
}

function formatMenuPrice(value: number) {
  return `PHP ${Math.round(value)}`;
}
