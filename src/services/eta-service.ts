const EARTH_RADIUS_KM = 6371;
export const DEFAULT_MOTORCYCLE_SPEED_KPH = 25;

export function calculateDistanceKm(
  fromLat: unknown,
  fromLng: unknown,
  toLat: unknown,
  toLng: unknown
) {
  console.log('ETA_CALCULATION_INPUT', {
    fromLat,
    fromLng,
    toLat,
    toLng,
  });

  const startLat = toValidCoordinate(fromLat);
  const startLng = toValidCoordinate(fromLng);
  const endLat = toValidCoordinate(toLat);
  const endLng = toValidCoordinate(toLng);

  if (startLat === null || startLng === null || endLat === null || endLng === null) {
    console.log('ETA_SKIPPED_MISSING_COORDINATES', {
      fromLat,
      fromLng,
      toLat,
      toLng,
    });
    return null;
  }

  const latDelta = toRadians(endLat - startLat);
  const lngDelta = toRadians(endLng - startLng);
  const startLatRadians = toRadians(startLat);
  const endLatRadians = toRadians(endLat);
  const haversine =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(startLatRadians) * Math.cos(endLatRadians) * Math.sin(lngDelta / 2) ** 2;
  const centralAngle = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  const distanceKm = EARTH_RADIUS_KM * centralAngle;

  console.log('ETA_CALCULATION_RESULT', {
    distanceKm,
  });

  return distanceKm;
}

export function estimateEtaMinutes(
  distanceKm: number | null | undefined,
  averageSpeedKph = DEFAULT_MOTORCYCLE_SPEED_KPH
) {
  if (
    typeof distanceKm !== 'number' ||
    !Number.isFinite(distanceKm) ||
    distanceKm < 0 ||
    !Number.isFinite(averageSpeedKph) ||
    averageSpeedKph <= 0
  ) {
    return null;
  }

  if (distanceKm === 0) {
    return 0;
  }

  return Math.max(1, Math.ceil((distanceKm / averageSpeedKph) * 60));
}

export function formatDistance(distanceKm: number | null | undefined) {
  if (typeof distanceKm !== 'number' || !Number.isFinite(distanceKm)) {
    return 'Unavailable';
  }

  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }

  return `${distanceKm.toFixed(1)} km`;
}

export function formatEta(minutes: number | null | undefined) {
  if (typeof minutes !== 'number' || !Number.isFinite(minutes)) {
    return 'Unavailable';
  }

  if (minutes <= 0) {
    return 'Arriving now';
  }

  return `${Math.round(minutes)} min`;
}

function toValidCoordinate(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }

  return value;
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}
