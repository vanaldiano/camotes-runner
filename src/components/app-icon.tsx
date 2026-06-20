import { SymbolView, type SFSymbol, type AndroidSymbol } from 'expo-symbols';
import { StyleSheet, View, type ColorValue, type ViewStyle } from 'react-native';

import { BrandColors } from '@/constants/brand';

type PlatformSymbol = {
  ios: string;
  android: string;
  web: string;
};

type AppIconProps = {
  backgroundColor?: string;
  color?: ColorValue;
  name: PlatformSymbol;
  size?: number;
  style?: ViewStyle;
};

export function AppIcon({
  backgroundColor = BrandColors.softGreen,
  color = BrandColors.green,
  name,
  size = 24,
  style,
}: AppIconProps) {
  return (
    <View style={[styles.shell, { backgroundColor }, style]}>
      <SymbolView
        name={{
          ios: name.ios as SFSymbol,
          android: name.android as AndroidSymbol,
          web: name.web as AndroidSymbol,
        }}
        size={size}
        tintColor={color}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    width: 54,
    height: 54,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
