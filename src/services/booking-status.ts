import type { BookingStatus as SupabaseBookingStatus } from '@/types/database';
import type { BookingStatus as SimulationBookingStatus } from '@/services/booking-simulation';

export function toSimulationStatus(status: SupabaseBookingStatus): SimulationBookingStatus {
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

export function toStatusLabel(status: SupabaseBookingStatus) {
  return toSimulationStatus(status);
}

export function getStatusColor(status: SupabaseBookingStatus | SimulationBookingStatus) {
  switch (status) {
    case 'accepted':
    case 'Accepted':
      return '#8BC34A';
    case 'runner_arriving':
    case 'Runner Arriving':
      return '#1E8E3E';
    case 'in_progress':
    case 'In Progress':
      return '#0B6B22';
    case 'completed':
    case 'Completed':
      return '#12321F';
    case 'cancelled':
    case 'Cancelled':
      return '#D93F35';
    case 'pending':
    case 'Pending':
    default:
      return '#FFC928';
  }
}
