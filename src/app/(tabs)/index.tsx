import { Redirect } from 'expo-router';

import { isRiderAppVariant } from '@/constants/app-variant';
import { HomeScreen } from '@/screens/home-screen';

export default function IndexRoute() {
  if (isRiderAppVariant) {
    return <Redirect href="/rider" />;
  }

  return <HomeScreen />;
}
