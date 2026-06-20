import { useLocalSearchParams } from 'expo-router';

import { PartnerDetailScreen } from '@/screens/partner-detail-screen';

export default function PartnerRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <PartnerDetailScreen partnerId={id ?? ''} />;
}
