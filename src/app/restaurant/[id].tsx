import { useLocalSearchParams } from 'expo-router';

import { RestaurantMenuScreen } from '@/screens/restaurant-menu-screen';

export default function RestaurantMenuRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <RestaurantMenuScreen restaurantId={id ?? ''} />;
}
