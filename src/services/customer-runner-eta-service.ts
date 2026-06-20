import {
  calculateDistanceKm,
  estimateEtaMinutes,
  formatEta,
} from '@/services/eta-service';
import type { BookingStatus as SimulationBookingStatus } from '@/services/booking-simulation';
import type { BookingStatus as SupabaseBookingStatus } from '@/types/database';

type CustomerRunnerEtaStatus =
  | SimulationBookingStatus
  | SupabaseBookingStatus
  | null
  | undefined;

type CustomerRunnerCardEtaInput = {
  bookingId?: string | null;
  destinationLat?: number | null;
  destinationLng?: number | null;
  isRealBooking?: boolean;
  pickupLat?: number | null;
  pickupLng?: number | null;
  riderLat?: number | null;
  riderLng?: number | null;
  staticEta?: string | null;
  status?: CustomerRunnerEtaStatus;
};

export function getCustomerRunnerCardEta(input: CustomerRunnerCardEtaInput) {
  const normalizedStatus = normalizeStatus(input.status);
  const isRealBooking = Boolean(input.isRealBooking || input.bookingId);

  console.log('CUSTOMER_RUNNER_CARD_ETA_INPUT', {
    bookingId: input.bookingId ?? null,
    destinationLat: input.destinationLat ?? null,
    destinationLng: input.destinationLng ?? null,
    isRealBooking,
    pickupLat: input.pickupLat ?? null,
    pickupLng: input.pickupLng ?? null,
    riderLat: input.riderLat ?? null,
    riderLng: input.riderLng ?? null,
    status: input.status ?? null,
    staticEta: input.staticEta ?? null,
  });

  if (normalizedStatus === 'completed') {
    console.log('CUSTOMER_RUNNER_CARD_ETA_RESULT', {
      etaText: 'Completed',
      status: normalizedStatus,
    });
    return 'Completed';
  }

  if (normalizedStatus === 'cancelled') {
    console.log('CUSTOMER_RUNNER_CARD_ETA_RESULT', {
      etaText: 'Cancelled',
      status: normalizedStatus,
    });
    return 'Cancelled';
  }

  if (!isRealBooking) {
    const etaText = input.staticEta ?? 'Calculating...';

    console.log('CUSTOMER_RUNNER_CARD_ETA_FALLBACK', {
      etaText,
      reason: 'simulation_booking_static_eta',
    });
    return etaText;
  }

  const target = getTargetPoint(normalizedStatus, input);

  if (!target) {
    console.log('CUSTOMER_RUNNER_CARD_ETA_FALLBACK', {
      etaText: 'Calculating...',
      reason: 'missing_target_coordinates',
    });
    return 'Calculating...';
  }

  const distanceKm = calculateDistanceKm(
    input.riderLat,
    input.riderLng,
    target.latitude,
    target.longitude
  );
  const etaMinutes = estimateEtaMinutes(distanceKm);

  if (distanceKm === null || etaMinutes === null) {
    console.log('CUSTOMER_RUNNER_CARD_ETA_FALLBACK', {
      etaText: 'Calculating...',
      reason: 'missing_rider_or_route_coordinates',
    });
    return 'Calculating...';
  }

  const etaText =
    target.kind === 'pickup'
      ? `Estimated pickup arrival: ${formatEta(etaMinutes)}`
      : `Estimated destination arrival: ${formatEta(etaMinutes)}`;

  console.log('CUSTOMER_RUNNER_CARD_ETA_RESULT', {
    distanceKm,
    etaMinutes,
    etaText,
    target: target.kind,
  });

  return etaText;
}

function getTargetPoint(
  status: string,
  input: CustomerRunnerCardEtaInput
) {
  if (status === 'in_progress') {
    if (!isValidCoordinate(input.destinationLat) || !isValidCoordinate(input.destinationLng)) {
      return null;
    }

    return {
      kind: 'destination' as const,
      latitude: input.destinationLat,
      longitude: input.destinationLng,
    };
  }

  if (
    status === 'pending' ||
    status === 'accepted' ||
    status === 'arriving' ||
    status === 'runner_arriving'
  ) {
    if (!isValidCoordinate(input.pickupLat) || !isValidCoordinate(input.pickupLng)) {
      return null;
    }

    return {
      kind: 'pickup' as const,
      latitude: input.pickupLat,
      longitude: input.pickupLng,
    };
  }

  return null;
}

function normalizeStatus(status: CustomerRunnerEtaStatus) {
  return String(status ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

function isValidCoordinate(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}
