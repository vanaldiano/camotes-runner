import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useColorScheme } from 'react-native';

import { isRiderAppVariant } from '@/constants/app-variant';
import { BrandColors } from '@/constants/brand';
import { Colors } from '@/constants/theme';

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  return (
    <NativeTabs
      backgroundColor={colors.background}
      iconColor={{ default: colors.textSecondary, selected: BrandColors.green }}
      indicatorColor={BrandColors.paleYellow}
      labelStyle={{
        default: { color: colors.textSecondary, fontSize: 12, fontWeight: '700' },
        selected: { color: BrandColors.green, fontSize: 12, fontWeight: '900' },
      }}>
      {isRiderAppVariant ? null : (
        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            sf={{ default: 'house', selected: 'house.fill' }}
            md={{ default: 'home', selected: 'home_filled' }}
          />
        </NativeTabs.Trigger>
      )}

      {isRiderAppVariant ? null : (
        <NativeTabs.Trigger name="book">
          <NativeTabs.Trigger.Label>Book</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            sf={{ default: 'plus.circle', selected: 'plus.circle.fill' }}
            md={{ default: 'edit_square', selected: 'edit_square' }}
          />
        </NativeTabs.Trigger>
      )}

      {isRiderAppVariant ? null : (
        <NativeTabs.Trigger name="activity">
          <NativeTabs.Trigger.Label>Activity</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            sf={{ default: 'clock', selected: 'clock.fill' }}
            md={{ default: 'history', selected: 'history' }}
          />
        </NativeTabs.Trigger>
      )}

      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }}
          md={{ default: 'account_circle', selected: 'account_circle' }}
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
