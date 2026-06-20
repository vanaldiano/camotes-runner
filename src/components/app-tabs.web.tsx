import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import { Pressable, useColorScheme, View, StyleSheet } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { isRiderAppVariant } from '@/constants/app-variant';
import { BrandColors } from '@/constants/brand';
import { Colors, MaxContentWidth, Spacing } from '@/constants/theme';

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList>
          {isRiderAppVariant ? null : (
            <>
              <TabTrigger name="index" href="/" asChild>
                <TabButton>Home</TabButton>
              </TabTrigger>
              <TabTrigger name="book" href="/book" asChild>
                <TabButton>Book</TabButton>
              </TabTrigger>
              <TabTrigger name="activity" href="/activity" asChild>
                <TabButton>Activity</TabButton>
              </TabTrigger>
            </>
          )}
          <TabTrigger name="profile" href="/profile" asChild>
            <TabButton>Profile</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

export function TabButton({ children, isFocused, ...props }: TabTriggerSlotProps) {
  return (
    <Pressable {...props} style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView
        type="backgroundElement"
        style={[styles.tabButtonView, isFocused && styles.activeTabButton]}>
        <View style={[styles.activeIndicator, !isFocused && styles.hiddenIndicator]} />
        <ThemedText
          type="smallBold"
          style={isFocused && styles.activeLabel}
          themeColor={isFocused ? 'text' : 'textSecondary'}>
          {children}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  return (
    <View {...props} style={styles.tabListContainer}>
      <ThemedView
        type="backgroundElement"
        style={[styles.innerContainer, { borderColor: colors.backgroundSelected }]}>
        {props.children}
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabListContainer: {
    position: 'absolute',
    width: '100%',
    bottom: 0,
    padding: Spacing.three,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  innerContainer: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: 28,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexGrow: 1,
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
  },
  pressed: {
    opacity: 0.7,
  },
  tabButtonView: {
    minWidth: 70,
    alignItems: 'center',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.three,
  },
  activeTabButton: {
    backgroundColor: BrandColors.softGreen,
  },
  activeIndicator: {
    width: 22,
    height: 4,
    borderRadius: 999,
    backgroundColor: BrandColors.green,
    marginBottom: Spacing.one,
  },
  hiddenIndicator: {
    opacity: 0,
  },
  activeLabel: {
    color: BrandColors.green,
  },
});
