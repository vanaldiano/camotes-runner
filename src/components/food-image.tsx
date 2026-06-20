import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { BrandColors } from '@/constants/brand';

type FoodImageProps = {
  imageUrl?: string | null;
  label: string;
  variant: 'menuItem' | 'restaurant';
};

export function FoodImage({ imageUrl, label, variant }: FoodImageProps) {
  const [hasImageError, setHasImageError] = useState(false);
  const safeImageUrl = typeof imageUrl === 'string' && imageUrl.trim() ? imageUrl : null;
  const shouldShowImage = Boolean(safeImageUrl && !hasImageError);

  return (
    <View
      accessibilityLabel={shouldShowImage ? label : `${label} image placeholder`}
      style={[styles.container, variant === 'menuItem' ? styles.menuItem : styles.restaurant]}>
      {shouldShowImage ? (
        <Image
          contentFit="cover"
          source={{ uri: safeImageUrl ?? undefined }}
          style={styles.image}
          onError={() => setHasImageError(true)}
        />
      ) : (
        <AppIcon
          backgroundColor={BrandColors.softGreen}
          color={BrandColors.green}
          name={{ ios: 'photo.fill', android: 'image', web: 'image' }}
          size={variant === 'menuItem' ? 22 : 25}
          style={styles.placeholderIcon}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: BrandColors.softGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restaurant: {
    width: 58,
    height: 58,
    borderRadius: 20,
  },
  menuItem: {
    width: 72,
    height: 72,
    borderRadius: 18,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderIcon: {
    width: '100%',
    height: '100%',
    borderRadius: 0,
  },
});
