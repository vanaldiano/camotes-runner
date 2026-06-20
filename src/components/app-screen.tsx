import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandColors } from '@/constants/brand';
import { BottomTabInset, MaxContentWidth } from '@/constants/theme';

type AppScreenProps = {
  children: ReactNode;
  paddedTop?: boolean;
};

export function AppScreen({ children, paddedTop = true }: AppScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          !paddedTop && styles.noTopPadding,
          { paddingBottom: insets.bottom + BottomTabInset + 28 },
        ]}>
        <View style={styles.page}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BrandColors.background,
  },
  noTopPadding: {
    paddingTop: 0,
  },
  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  page: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: 18,
  },
});
