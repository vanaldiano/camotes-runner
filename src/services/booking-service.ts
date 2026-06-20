import { supabase } from '@/services/supabase';
import type { BookingStatus, Tables, TablesInsert } from '@/types/database';

export type Booking = Tables<'bookings'>;
export type BookingStatusLog = Tables<'booking_status_logs'>;
export type CreateBookingInput = TablesInsert<'bookings'>;

export class BookingNotFoundError extends Error {
  constructor(bookingId: string) {
    super(`Booking ${bookingId} was not found.`);
    this.name = 'BookingNotFoundError';
  }
}

export async function createBooking(booking: CreateBookingInput) {
  console.log('BOOKING_SERVICE_INPUT', booking);

  const bookingPayload: CreateBookingInput = {
    ...booking,
    destination_lat: booking.destination_lat ?? null,
    destination_lng: booking.destination_lng ?? null,
    pickup_lat: booking.pickup_lat ?? null,
    pickup_lng: booking.pickup_lng ?? null,
  };

  console.log('BOOKING_COORDINATES_PAYLOAD', {
    destination_lat: bookingPayload.destination_lat,
    destination_lng: bookingPayload.destination_lng,
    pickup_lat: bookingPayload.pickup_lat,
    pickup_lng: bookingPayload.pickup_lng,
  });
  console.log('BOOKING_SUPABASE_INSERT_OBJECT', bookingPayload);

  const { data, error } = await supabase
    .from('bookings')
    .insert(bookingPayload)
    .select('*')
    .maybeSingle();

  console.log('BOOKING_INSERT_RESULT', {
    data,
    error,
  });

  if (error) {
    throw error;
  }

  if (!data) {
    const missingDataError = new Error('Supabase did not return the created booking.');
    throw missingDataError;
  }

  return data;
}

export async function createCoordinateAuditBooking() {
  return createBooking({
    base_fare: 50,
    destination: 'Coordinate audit destination',
    destination_lat: 10.123456,
    destination_lng: 124.654321,
    distance_km: 1,
    estimated_fare: 50,
    notes: 'Temporary coordinate insert audit booking.',
    payment_method: 'Cash',
    pickup_lat: 10.123456,
    pickup_lng: 124.654321,
    pickup_location: 'Coordinate audit pickup',
    service_type: 'Ride',
    status: 'pending',
  });
}

export async function getBookingById(bookingId: string) {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    const notFoundError = new BookingNotFoundError(bookingId);
    throw notFoundError;
  }

  return data;
}

export async function getUserBookings(customerId: string) {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getLatestBookings(limit = 10) {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function updateBookingStatus(bookingId: string, status: BookingStatus) {
  const { data, error } = await supabase
    .from('bookings')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', bookingId)
    .select('*')
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    const notFoundError = new BookingNotFoundError(bookingId);
    throw notFoundError;
  }

  return data;
}

export async function addBookingStatusLog(
  bookingId: string,
  status: BookingStatus,
  message?: string
) {
  const { data, error } = await supabase
    .from('booking_status_logs')
    .insert({
      booking_id: bookingId,
      message,
      status,
    })
    .select('*')
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    const missingDataError = new Error('Supabase did not return the created booking status log.');
    throw missingDataError;
  }

  return data;
}
