import { useLocalSearchParams } from 'expo-router';

import { PartnerOrderDetailScreen } from '@/screens/partner-order-detail-screen';

export default function PartnerOrderDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <PartnerOrderDetailScreen orderId={id} />;
}
