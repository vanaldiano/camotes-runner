import { useLocalSearchParams } from 'expo-router';

import { CategoryMarketplaceScreen } from '@/screens/category-marketplace-screen';

export default function CategoryRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <CategoryMarketplaceScreen categoryId={id ?? ''} />;
}
