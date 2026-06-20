import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { BrandColors } from '@/constants/brand';

type InfoCardProps = {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  subtitle?: string;
  title: string;
};

export function InfoCard({ children, style, subtitle, title }: InfoCardProps) {
  return (
    <View style={[styles.card, style]}>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: BrandColors.white,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: BrandColors.border,
    padding: 18,
    gap: 14,
    shadowColor: BrandColors.cardShadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: 3,
  },
  copy: {
    gap: 4,
  },
  title: {
    color: BrandColors.ink,
    fontSize: 17,
    fontWeight: '900',
  },
  subtitle: {
    color: BrandColors.mutedInk,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
});
