import { calculateDistanceKm } from '@/services/eta-service';

const BASE_FARE = 50;
const PER_KM_RATE = 7;
const MINIMUM_FARE = 80;
const FARE_ROUNDING_STEP = 5;
const BASE_DELIVERY_FEE = 40;
const DELIVERY_PER_KM_RATE = 6;
const MINIMUM_DELIVERY_FEE = 50;
const DELIVERY_FEE_ROUNDING_STEP = 5;

export function calculateRideDistanceKm(
  pickupLat: unknown,
  pickupLng: unknown,
  destinationLat: unknown,
  destinationLng: unknown
) {
  console.log('FARE_ESTIMATE_INPUT', {
    destinationLat,
    destinationLng,
    pickupLat,
    pickupLng,
  });

  const distanceKm = calculateDistanceKm(pickupLat, pickupLng, destinationLat, destinationLng);

  if (distanceKm === null || distanceKm <= 0) {
    console.log('FARE_ESTIMATE_SKIPPED_MISSING_COORDINATES', {
      destinationLat,
      destinationLng,
      distanceKm,
      pickupLat,
      pickupLng,
    });
    return null;
  }

  return distanceKm;
}

export function calculateRideFare(distanceKm: number | null | undefined) {
  if (typeof distanceKm !== 'number' || !Number.isFinite(distanceKm) || distanceKm <= 0) {
    return null;
  }

  const rawFare = Math.max(MINIMUM_FARE, BASE_FARE + distanceKm * PER_KM_RATE);
  const fare = Math.round(rawFare / FARE_ROUNDING_STEP) * FARE_ROUNDING_STEP;

  console.log('FARE_ESTIMATE_RESULT', {
    baseFare: BASE_FARE,
    distanceKm,
    fare,
    minimumFare: MINIMUM_FARE,
    perKmRate: PER_KM_RATE,
  });

  return fare;
}

export function calculateFoodDeliveryDistanceKm(
  shopLat: unknown,
  shopLng: unknown,
  deliveryLat: unknown,
  deliveryLng: unknown
) {
  console.log('FOOD_DELIVERY_FEE_INPUT', {
    deliveryLat,
    deliveryLng,
    shopLat,
    shopLng,
  });

  const distanceKm = calculateDistanceKm(shopLat, shopLng, deliveryLat, deliveryLng);

  if (distanceKm === null || distanceKm <= 0) {
    console.log('FOOD_DELIVERY_FEE_SKIPPED_MISSING_COORDINATES', {
      deliveryLat,
      deliveryLng,
      distanceKm,
      shopLat,
      shopLng,
    });
    return null;
  }

  return distanceKm;
}

export function calculateFoodDeliveryFee(distanceKm: number | null | undefined) {
  if (typeof distanceKm !== 'number' || !Number.isFinite(distanceKm) || distanceKm <= 0) {
    return null;
  }

  const rawFee = Math.max(
    MINIMUM_DELIVERY_FEE,
    BASE_DELIVERY_FEE + distanceKm * DELIVERY_PER_KM_RATE
  );
  const deliveryFee =
    Math.round(rawFee / DELIVERY_FEE_ROUNDING_STEP) * DELIVERY_FEE_ROUNDING_STEP;

  console.log('FOOD_DELIVERY_FEE_RESULT', {
    baseDeliveryFee: BASE_DELIVERY_FEE,
    deliveryFee,
    distanceKm,
    minimumDeliveryFee: MINIMUM_DELIVERY_FEE,
    perKmRate: DELIVERY_PER_KM_RATE,
  });

  return deliveryFee;
}

export function formatFare(amount: number | null | undefined) {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) {
    return 'Fare unavailable';
  }

  return formatPhp(amount);
}

export function formatDistance(distanceKm: number | null | undefined) {
  if (typeof distanceKm !== 'number' || !Number.isFinite(distanceKm)) {
    return 'Distance unavailable';
  }

  return `${distanceKm.toFixed(1)} km`;
}

export function formatDeliveryFee(amount: number | null | undefined) {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) {
    return 'To be confirmed';
  }

  return formatPhp(amount);
}

export function formatFoodDistance(distanceKm: number | null | undefined) {
  if (typeof distanceKm !== 'number' || !Number.isFinite(distanceKm)) {
    return 'To be confirmed';
  }

  return `${distanceKm.toFixed(1)} km`;
}

function formatPhp(amount: number) {
  return new Intl.NumberFormat('en-PH', {
    currency: 'PHP',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(amount);
}
