import {
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { BrandColors } from '@/constants/brand';

type PrimaryButtonProps = Omit<PressableProps, 'style'> & {
  variant?: 'primary' | 'secondary' | 'danger';
  style?: StyleProp<ViewStyle>;
  title: string;
};

export function PrimaryButton({ title, style, variant = 'primary', ...props }: PrimaryButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        variant === 'secondary' && styles.secondaryButton,
        variant === 'danger' && styles.dangerButton,
        pressed && styles.pressed,
        style,
      ]}
      {...props}>
      <Text
        style={[
          styles.text,
          variant === 'secondary' && styles.secondaryText,
          variant === 'danger' && styles.dangerText,
        ]}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 58,
    borderRadius: 22,
    backgroundColor: BrandColors.green,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    shadowColor: BrandColors.darkGreen,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 5,
  },
  secondaryButton: {
    backgroundColor: BrandColors.white,
    borderWidth: 1,
    borderColor: BrandColors.border,
    shadowOpacity: 0.05,
  },
  dangerButton: {
    backgroundColor: '#FFF0EE',
    borderWidth: 1,
    borderColor: '#FFD0CB',
    shadowOpacity: 0.04,
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
  text: {
    color: BrandColors.white,
    fontSize: 17,
    fontWeight: '800',
  },
  secondaryText: {
    color: BrandColors.green,
  },
  dangerText: {
    color: BrandColors.danger,
  },
});
