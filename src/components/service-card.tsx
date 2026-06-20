import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { BrandColors } from '@/constants/brand';
import type { CustomerService } from '@/constants/services';

type ServiceCardProps = {
  compact?: boolean;
  onPress?: () => void;
  service: CustomerService;
};

export function ServiceCard({ service, compact = false, onPress }: ServiceCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${service.title} service`}
      onPress={onPress}
      style={({ pressed }) => [compact ? styles.compactCard : styles.card, pressed && styles.pressed]}>
      <AppIcon
        backgroundColor={`${service.accentColor}18`}
        color={service.accentColor}
        name={service.icon}
        size={compact ? 30 : 26}
        style={compact ? styles.compactIcon : styles.iconCircle}
      />

      <View style={styles.copy}>
        <Text style={styles.title}>{service.title}</Text>
        <Text style={styles.description}>{service.description}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    minHeight: 96,
    borderRadius: 22,
    backgroundColor: BrandColors.white,
    borderWidth: 1,
    borderColor: BrandColors.border,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    shadowColor: BrandColors.darkGreen,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 2,
  },
  compactCard: {
    width: '48%',
    minHeight: 150,
    borderRadius: 24,
    backgroundColor: BrandColors.white,
    borderWidth: 1,
    borderColor: BrandColors.border,
    padding: 16,
    justifyContent: 'space-between',
    shadowColor: BrandColors.cardShadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 3,
  },
  pressed: {
    opacity: 0.84,
    transform: [{ scale: 0.99 }],
  },
  iconCircle: {
    width: 54,
    height: 54,
    borderRadius: 20,
  },
  compactIcon: {
    width: 58,
    height: 58,
    borderRadius: 22,
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: BrandColors.ink,
    fontSize: 16,
    fontWeight: '900',
  },
  description: {
    color: BrandColors.mutedInk,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
});
