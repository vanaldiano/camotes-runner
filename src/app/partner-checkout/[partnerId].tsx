import { useLocalSearchParams } from 'expo-router';

import { PartnerCheckoutScreen } from '@/screens/partner-checkout-screen';

export default function PartnerCheckoutRoute() {
  const { partnerId } = useLocalSearchParams<{ partnerId: string }>();
  return <PartnerCheckoutScreen partnerId={partnerId} />;
}
