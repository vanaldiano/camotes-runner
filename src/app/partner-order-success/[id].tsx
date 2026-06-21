import { useLocalSearchParams } from 'expo-router';

import { PartnerOrderSuccessScreen } from '@/screens/partner-order-success-screen';

export default function PartnerOrderSuccessRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PartnerOrderSuccessScreen orderId={id} />;
}
