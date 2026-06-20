import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { Booking as SupabaseBooking } from '@/services/booking-service';

export type BookingStatus =
  | 'Pending'
  | 'Accepted'
  | 'Runner Arriving'
  | 'In Progress'
  | 'Completed'
  | 'Cancelled';

export type MockRunner = {
  distanceAway: string;
  eta: string;
  motorcycle: string;
  name: string;
  plateNumber: string;
  rating: string;
};

export type SimulatedBooking = {
  assignedRiderId?: string | null;
  baseFare: string;
  destination: string;
  distance: string;
  fareEstimate: string;
  id: string;
  notes: string;
  paymentMethod: string;
  pickupLocation: string;
  runner: MockRunner;
  serviceType: string;
  status: BookingStatus;
  isLiveStatusAvailable?: boolean;
  supabaseBookingId?: string;
};

type CreateBookingInput = {
  destination: string;
  distance?: string;
  fareEstimate?: string;
  notes: string;
  paymentMethod: string;
  pickupLocation: string;
  serviceType: string;
  supabaseBookingId?: string;
};

type BookingSimulationContextValue = {
  booking: SimulatedBooking | null;
  createBooking: (input: CreateBookingInput) => SimulatedBooking;
  resetBooking: () => void;
  setBookingFromSupabase: (booking: SupabaseBooking) => SimulatedBooking;
  setAssignedRider: (runner: MockRunner, assignedRiderId?: string | null) => void;
  setAssignedRiderId: (assignedRiderId?: string | null) => void;
  setLiveStatusAvailable: (isAvailable: boolean) => void;
  setStatus: (status: BookingStatus) => void;
  statuses: BookingStatus[];
};

const statuses: BookingStatus[] = [
  'Pending',
  'Accepted',
  'Runner Arriving',
  'In Progress',
  'Completed',
];

const mockRunner: MockRunner = {
  name: 'Juan Dela Cruz',
  motorcycle: 'Honda Click 125',
  plateNumber: 'CAM-0426',
  rating: '4.9',
  distanceAway: '1.2 km away',
  eta: '3 minutes away',
};

const statusDelays: Partial<Record<BookingStatus, number>> = {
  Pending: 3000,
  Accepted: 3000,
  'Runner Arriving': 3000,
  'In Progress': 5000,
};

const BookingSimulationContext = createContext<BookingSimulationContextValue | undefined>(undefined);

export function BookingSimulationProvider({ children }: { children: ReactNode }) {
  const [booking, setBooking] = useState<SimulatedBooking | null>(null);

  useEffect(() => {
    if (!booking || booking.status === 'Completed' || booking.isLiveStatusAvailable) {
      return;
    }

    const delay = statusDelays[booking.status];
    if (!delay) {
      return;
    }

    const timeout = setTimeout(() => {
      setBooking((currentBooking) => {
        if (!currentBooking || currentBooking.status !== booking.status) {
          return currentBooking;
        }

        const currentIndex = statuses.indexOf(currentBooking.status);
        const nextStatus = statuses[currentIndex + 1];

        return nextStatus ? { ...currentBooking, status: nextStatus } : currentBooking;
      });
    }, delay);

    return () => clearTimeout(timeout);
  }, [booking]);

  const createBooking = useCallback((input: CreateBookingInput) => {
    const nextBooking: SimulatedBooking = {
      ...input,
      id: `CR-${Date.now()}`,
      baseFare: 'PHP 50',
      distance: input.distance ?? 'Distance pending',
      fareEstimate: input.fareEstimate ?? 'Fare pending',
      isLiveStatusAvailable: false,
      runner: mockRunner,
      status: 'Pending',
    };

    setBooking(nextBooking);

    return nextBooking;
  }, []);

  const resetBooking = useCallback(() => setBooking(null), []);

  const setBookingFromSupabase = useCallback((supabaseBooking: SupabaseBooking) => {
    const nextBooking: SimulatedBooking = {
      assignedRiderId: supabaseBooking.assigned_rider_id,
      baseFare: formatPeso(supabaseBooking.base_fare),
      destination: supabaseBooking.destination,
      distance: supabaseBooking.distance_km
        ? `${Number(supabaseBooking.distance_km).toFixed(1)} km`
        : 'Distance pending',
      fareEstimate: formatPeso(
        supabaseBooking.final_fare ??
          supabaseBooking.fare_estimate ??
          supabaseBooking.estimated_fare
      ),
      id: `CR-${supabaseBooking.id.slice(0, 8)}`,
      isLiveStatusAvailable: true,
      notes: supabaseBooking.notes ?? '',
      paymentMethod: supabaseBooking.payment_method,
      pickupLocation: supabaseBooking.pickup_location,
      runner: mockRunner,
      serviceType: supabaseBooking.service_type,
      status: toSimulationStatus(supabaseBooking.status),
      supabaseBookingId: supabaseBooking.id,
    };

    setBooking(nextBooking);

    return nextBooking;
  }, []);

  const setAssignedRider = useCallback((runner: MockRunner, assignedRiderId?: string | null) => {
    setBooking((currentBooking) => {
      if (!currentBooking) {
        return currentBooking;
      }

      return { ...currentBooking, assignedRiderId, runner };
    });
  }, []);

  const setAssignedRiderId = useCallback((assignedRiderId?: string | null) => {
    setBooking((currentBooking) => {
      if (!currentBooking || currentBooking.assignedRiderId === assignedRiderId) {
        return currentBooking;
      }

      if (!assignedRiderId) {
        return { ...currentBooking, assignedRiderId, runner: mockRunner };
      }

      return { ...currentBooking, assignedRiderId };
    });
  }, []);

  const setLiveStatusAvailable = useCallback((isAvailable: boolean) => {
    setBooking((currentBooking) => {
      if (!currentBooking || currentBooking.isLiveStatusAvailable === isAvailable) {
        return currentBooking;
      }

      return { ...currentBooking, isLiveStatusAvailable: isAvailable };
    });
  }, []);

  const setStatus = useCallback((status: BookingStatus) => {
    setBooking((currentBooking) => {
      if (!currentBooking || currentBooking.status === status) {
        return currentBooking;
      }

      return { ...currentBooking, status };
    });
  }, []);

  const value = useMemo<BookingSimulationContextValue>(
    () => ({
      booking,
      createBooking,
      resetBooking,
      setBookingFromSupabase,
      setAssignedRider,
      setAssignedRiderId,
      setLiveStatusAvailable,
      setStatus,
      statuses,
    }),
    [
      booking,
      createBooking,
      resetBooking,
      setBookingFromSupabase,
      setAssignedRider,
      setAssignedRiderId,
      setLiveStatusAvailable,
      setStatus,
    ]
  );

  return (
    <BookingSimulationContext.Provider value={value}>
      {children}
    </BookingSimulationContext.Provider>
  );
}

function toSimulationStatus(status: SupabaseBooking['status']): BookingStatus {
  switch (status) {
    case 'accepted':
      return 'Accepted';
    case 'runner_arriving':
      return 'Runner Arriving';
    case 'in_progress':
      return 'In Progress';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    case 'pending':
    default:
      return 'Pending';
  }
}

function formatPeso(value: number) {
  return `PHP ${Math.round(Number(value))}`;
}

export function useBookingSimulation() {
  const context = useContext(BookingSimulationContext);

  if (!context) {
    throw new Error('useBookingSimulation must be used inside BookingSimulationProvider');
  }

  return context;
}
