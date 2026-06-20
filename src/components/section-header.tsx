import { StyleSheet, Text, View } from 'react-native';

import { BrandColors } from '@/constants/brand';

type SectionHeaderProps = {
  eyebrow?: string;
  title: string;
};

export function SectionHeader({ eyebrow, title }: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 3,
  },
  eyebrow: {
    color: BrandColors.green,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  title: {
    color: BrandColors.ink,
    fontSize: 22,
    fontWeight: '900',
  },
});
