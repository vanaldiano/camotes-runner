import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BrandColors } from '@/constants/brand';

type ScreenHeaderProps = {
  showHomeButton?: boolean;
  title: string;
};

export function ScreenHeader({ showHomeButton = false, title }: ScreenHeaderProps) {
  function goBackOrHome() {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/');
  }

  function goHome() {
    router.replace('/');
  }

  return (
    <View style={styles.header}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back"
        style={({ pressed }) => [styles.navButton, pressed && styles.pressed]}
        onPress={goBackOrHome}>
        <Text style={styles.navButtonText}>Back</Text>
      </Pressable>

      <Text numberOfLines={1} style={styles.title}>
        {title}
      </Text>

      {showHomeButton ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go home"
          style={({ pressed }) => [styles.navButton, pressed && styles.pressed]}
          onPress={goHome}>
          <Text style={styles.navButtonText}>Home</Text>
        </Pressable>
      ) : (
        <View style={styles.navButtonPlaceholder} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  navButton: {
    minWidth: 72,
    minHeight: 44,
    borderRadius: 16,
    backgroundColor: BrandColors.white,
    borderWidth: 1,
    borderColor: BrandColors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  navButtonPlaceholder: {
    minWidth: 72,
  },
  navButtonText: {
    color: BrandColors.green,
    fontSize: 14,
    fontWeight: '900',
  },
  title: {
    flex: 1,
    color: BrandColors.ink,
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.84,
    transform: [{ scale: 0.99 }],
  },
});
