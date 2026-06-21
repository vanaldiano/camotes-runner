import { useLocalSearchParams } from 'expo-router';

import { PartnerCartScreen } from '@/screens/partner-cart-screen';

export default function PartnerCartRoute() {
  const { partnerId } = useLocalSearchParams<{ partnerId: string }>();
  return <PartnerCartScreen partnerId={partnerId} />;
}
