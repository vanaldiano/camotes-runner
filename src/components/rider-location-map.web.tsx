import { StyleSheet, Text, View } from 'react-native';

import { BrandColors } from '@/constants/brand';
import type { LocationPoint } from '@/services/location-service';

type RiderLocationMapProps = {
  destinationPoint: LocationPoint | null;
  pickupPoint: LocationPoint | null;
  riderPoint: LocationPoint | null;
};

export function RiderLocationMap({
  destinationPoint,
  pickupPoint,
  riderPoint,
}: RiderLocationMapProps) {
  if (!destinationPoint && !pickupPoint && !riderPoint) {
    return null;
  }

  console.log('TRACK_MAP_SKIPPED_SAFE_MODE', {
    hasDestinationPoint: Boolean(destinationPoint),
    hasPickupPoint: Boolean(pickupPoint),
    hasRiderPoint: Boolean(riderPoint),
  });

  return (
    <View style={styles.mapFallback}>
      <Text style={styles.mapFallbackText}>
        Map preview is temporarily disabled. Use Google Maps to view the rider location.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  mapFallback: {
    alignItems: 'center',
    backgroundColor: BrandColors.softGreen,
    borderColor: BrandColors.border,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 96,
    padding: 14,
  },
  mapFallbackText: {
    color: BrandColors.mutedInk,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
    textAlign: 'center',
  },
});
