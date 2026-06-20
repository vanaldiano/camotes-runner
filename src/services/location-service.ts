import * as Location from 'expo-location';
import { Linking, Platform } from 'react-native';

export type LocationPoint = {
  latitude: number;
  label?: string;
  longitude: number;
};

const CURRENT_LOCATION_TIMEOUT_MS = 15000;
const LAST_KNOWN_LOCATION_MAX_AGE_MS = 10000;
const REVERSE_GEOCODE_TIMEOUT_MS = 10000;
const FALLBACK_LOCATION_LABEL = 'Selected location';

type CurrentLocationOptions = Location.LocationOptions & {
  maximumAge?: number;
  timeout?: number;
};

export async function getCurrentLocationPoint(): Promise<LocationPoint> {
  if (Platform.OS === 'web') {
    throw new Error('Current location is available in native app builds.');
  }

  console.log('[Location] Permission requested');
  const permission = await Location.requestForegroundPermissionsAsync();

  if (permission.status !== 'granted') {
    console.log('[Location] Permission denied');
    throw new Error('Location permission was not granted.');
  }

  console.log('[Location] Permission granted');

  const lastKnownPosition = await Location.getLastKnownPositionAsync({
    maxAge: LAST_KNOWN_LOCATION_MAX_AGE_MS,
  }).catch((error: unknown) => {
    console.warn('[Location] Last known location failure', getErrorMessage(error));
    return null;
  });

  if (lastKnownPosition) {
    const point = getLocationPointFromPosition(lastKnownPosition);

    console.log('[Location] Coordinates received', point);
    return addReverseGeocodeLabel(point);
  }

  console.log('[Location] No recent last known location available');
  console.log('[Location] Location request started');
  const currentLocationOptions: CurrentLocationOptions = {
    accuracy: Location.Accuracy.Balanced,
    maximumAge: LAST_KNOWN_LOCATION_MAX_AGE_MS,
    timeout: CURRENT_LOCATION_TIMEOUT_MS,
  };
  const currentPosition = await withTimeout(
    Location.getCurrentPositionAsync(currentLocationOptions),
    CURRENT_LOCATION_TIMEOUT_MS,
    'Location request timed out. Please type the address manually or try again.'
  ).catch((error: unknown) => {
    console.warn('[Location] Location request failure', getErrorMessage(error));
    throw error;
  });

  const point = getLocationPointFromPosition(currentPosition);

  console.log('[Location] Coordinates received', point);

  return addReverseGeocodeLabel(point);
}

async function addReverseGeocodeLabel(point: LocationPoint): Promise<LocationPoint> {
  const label = await getReverseGeocodeLabel(point);

  return {
    ...point,
    label,
  };
}

export function formatLocationPoint(point: LocationPoint | null) {
  if (!point) {
    return 'No coordinates selected';
  }

  return `${point.latitude.toFixed(6)}, ${point.longitude.toFixed(6)}`;
}

export function getGoogleMapsUrl(point: LocationPoint | null, fallbackQuery: string) {
  if (isValidLocationPoint(point)) {
    return `https://www.google.com/maps/search/?api=1&query=${point.latitude},${point.longitude}`;
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fallbackQuery)}`;
}

export function getSafeGoogleMapsSearchUrl(point: LocationPoint | null, fallbackQuery?: string) {
  if (isValidLocationPoint(point)) {
    return `https://www.google.com/maps/search/?api=1&query=${point.latitude},${point.longitude}`;
  }

  const safeFallbackQuery = fallbackQuery?.trim();

  if (!safeFallbackQuery) {
    return null;
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(safeFallbackQuery)}`;
}

export function getGoogleMapsDirectionsUrl(
  origin: LocationPoint | null,
  destination: LocationPoint | null
) {
  if (!isValidLocationPoint(origin) || !isValidLocationPoint(destination)) {
    return null;
  }

  return (
    'https://www.google.com/maps/dir/?api=1' +
    `&origin=${origin.latitude},${origin.longitude}` +
    `&destination=${destination.latitude},${destination.longitude}` +
    '&travelmode=driving'
  );
}

export async function openGoogleMaps(point: LocationPoint | null, fallbackQuery: string) {
  const url = getGoogleMapsUrl(point, fallbackQuery);
  const canOpen = await Linking.canOpenURL(url);

  if (!canOpen) {
    throw new Error('Google Maps could not be opened on this device.');
  }

  await Linking.openURL(url);
}

export async function openGoogleMapsDirections(
  origin: LocationPoint | null,
  destination: LocationPoint | null
) {
  const url = getGoogleMapsDirectionsUrl(origin, destination);

  if (!url) {
    throw new Error('Route coordinates are not available yet.');
  }

  const canOpen = await Linking.canOpenURL(url);

  if (!canOpen) {
    throw new Error('Google Maps directions could not be opened on this device.');
  }

  await Linking.openURL(url);
}

export async function openGoogleMapsUrlDirect(url: string) {
  await Linking.openURL(url);
}

async function getReverseGeocodeLabel(point: LocationPoint) {
  console.log('[Location] Reverse geocode started');

  try {
    const results = await withTimeout(
      Location.reverseGeocodeAsync({
        latitude: point.latitude,
        longitude: point.longitude,
      }),
      REVERSE_GEOCODE_TIMEOUT_MS,
      'Reverse geocode timed out.'
    );
    const label = formatReverseGeocodeLabel(results[0]) || FALLBACK_LOCATION_LABEL;

    console.log('[Location] Reverse geocode success', label);
    return label;
  } catch (error) {
    console.warn('[Location] Reverse geocode failure', getErrorMessage(error));
    return FALLBACK_LOCATION_LABEL;
  }
}

function getLocationPointFromPosition(position: Location.LocationObject): LocationPoint {
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  };
}

function isValidLocationPoint(point: LocationPoint | null): point is LocationPoint {
  return (
    typeof point?.latitude === 'number' &&
    Number.isFinite(point.latitude) &&
    typeof point.longitude === 'number' &&
    Number.isFinite(point.longitude)
  );
}

function formatReverseGeocodeLabel(address: Location.LocationGeocodedAddress | undefined) {
  if (!address) {
    return '';
  }

  return [
    address.name,
    address.street,
    address.district,
    address.city,
    address.subregion,
    address.region,
  ]
    .filter(Boolean)
    .join(', ');
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  });
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'object' && error && 'message' in error) {
    return String(error.message);
  }

  return 'Unknown location error';
}
