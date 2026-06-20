import { supabase } from '@/services/supabase';
import { addBookingStatusLog, updateBookingStatus, type Booking } from '@/services/booking-service';
import type { MockRunner } from '@/services/booking-simulation';
import {
  addFoodOrderStatusLog,
  getAssignedFoodOrdersForRider,
  updateFoodOrderStatus,
  type FoodOrderWithRestaurant,
} from '@/services/food-order-service';
import type { BookingStatus, FoodOrderStatus, Tables } from '@/types/database';

export type Rider = Tables<'riders'>;

export const MVP_RIDER_NAME = 'Juan Dela Cruz';

export const fallbackRider: Rider = {
  auth_user_id: null,
  created_at: new Date(0).toISOString(),
  current_location: 'Poro Public Market',
  full_name: MVP_RIDER_NAME,
  id: 'sample-rider-juan',
  is_available: true,
  motorcycle_model: 'Honda Click 125',
  phone: '09123456789',
  photo_url: null,
  plate_number: 'ABC 1234',
  push_token: null,
  rating: 4.9,
  updated_at: new Date(0).toISOString(),
};

export const fallbackRiderJobs: Booking[] = [
  {
    assigned_rider_id: fallbackRider.id,
    base_fare: 50,
    created_at: new Date().toISOString(),
    customer_id: null,
    destination: 'Santiago Bay, San Francisco',
    destination_lat: 10.5992,
    destination_lng: 124.3021,
    distance_km: 4.8,
    estimated_fare: 120,
    fare_estimate: 120,
    final_fare: null,
    id: 'sample-job-1',
    notes: 'Please call when arriving at the pickup point.',
    payment_method: 'Cash',
    pickup_lat: 10.6506,
    pickup_lng: 124.3437,
    pickup_location: 'Consuelo Port, San Francisco',
    rider_id: fallbackRider.id,
    service_type: 'Ride',
    status: 'accepted',
    updated_at: new Date().toISOString(),
  },
];

export const fallbackRiderFoodOrders: FoodOrderWithRestaurant[] = [
  {
    assigned_rider_id: fallbackRider.id,
    created_at: new Date().toISOString(),
    customer_id: null,
    customer_name: 'Maria Camotes',
    customer_phone: '09123456789',
    delivery_distance_km: 5.4,
    delivery_fee: 50,
    delivery_lat: 10.5992,
    delivery_lng: 124.3021,
    delivery_location: 'Santiago Bay Garden Resort',
    id: 'sample-food-order-1',
    notes: 'Meet at the lobby entrance.',
    order_subtotal: 315,
    order_total: 365,
    payment_method: 'GCash',
    restaurant_id: 'sample-restaurant-m-cafe',
    restaurant_name: 'M Cafe',
    service_fee: null,
    status: 'accepted',
    subtotal: 315,
    total_amount: 365,
    updated_at: new Date().toISOString(),
  },
];

export class RiderNotFoundError extends Error {
  constructor(riderId: string) {
    super(`Rider ${riderId} was not found.`);
    this.name = 'RiderNotFoundError';
  }
}

export async function getRiders() {
  const { data, error } = await supabase
    .from('riders')
    .select('*')
    .order('full_name', { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getRiderByName(fullName: string) {
  const { data, error } = await supabase
    .from('riders')
    .select('*')
    .eq('full_name', fullName)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    const notFoundError = new Error(`Rider ${fullName} was not found.`);
    notFoundError.name = 'RiderNotFoundError';
    throw notFoundError;
  }

  return data;
}

export async function getRiderById(riderId: string) {
  const { data, error } = await supabase
    .from('riders')
    .select('*')
    .eq('id', riderId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    const notFoundError = new RiderNotFoundError(riderId);
    throw notFoundError;
  }

  return data;
}

export async function getRiderByAuthUserId(authUserId: string) {
  const { data, error } = await supabase
    .from('riders')
    .select('*')
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function getAssignedBookingsForRider(riderId: string) {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('assigned_rider_id', riderId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getMvpRiderJobs() {
  const rider = await getRiderByName(MVP_RIDER_NAME);
  const [jobs, foodOrders] = await Promise.all([
    getAssignedBookingsForRider(rider.id),
    getAssignedFoodOrdersForRider(rider.id),
  ]);

  return { foodOrders, jobs, rider };
}

export async function getAuthenticatedRiderJobs(authUserId: string) {
  const rider = await getRiderByAuthUserId(authUserId);

  if (!rider) {
    throw new RiderNotFoundError(authUserId);
  }

  const [jobs, foodOrders] = await Promise.all([
    getAssignedBookingsForRider(rider.id),
    getAssignedFoodOrdersForRider(rider.id),
  ]);

  return { foodOrders, jobs, rider };
}

export async function linkRiderAccountToRider(riderId: string, authUserId: string) {
  const { data, error } = await supabase
    .from('riders')
    .update({ auth_user_id: authUserId, updated_at: new Date().toISOString() })
    .eq('id', riderId)
    .select('*')
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new RiderNotFoundError(riderId);
  }

  return data;
}

export async function updateRiderAvailability(riderId: string, isAvailable: boolean) {
  const { data, error } = await supabase
    .from('riders')
    .update({ is_available: isAvailable, updated_at: new Date().toISOString() })
    .eq('id', riderId)
    .select('*')
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new RiderNotFoundError(riderId);
  }

  return data;
}

export async function updateRiderJobStatus(bookingId: string, status: BookingStatus) {
  const booking = await updateBookingStatus(bookingId, status);

  await addBookingStatusLog(
    bookingId,
    status,
    `${MVP_RIDER_NAME} updated this job to ${formatStatusForLog(status)}.`
  );

  void notifyCustomerForBookingStatusFromRider(bookingId, booking.customer_id, status).catch((error) => {
    console.error('Failed to send customer booking notification from rider update', {
      bookingId,
      error,
      status,
    });
  });

  return booking;
}

export async function updateRiderFoodOrderStatus(
  foodOrderId: string,
  status: FoodOrderStatus
) {
  const foodOrder = await updateFoodOrderStatus(foodOrderId, status);

  try {
    await addFoodOrderStatusLog(
      foodOrderId,
      status,
      `${MVP_RIDER_NAME} updated this food delivery to ${formatStatusForLog(status)}.`
    );
  } catch (error) {
    console.error('Supabase failed to insert rider food order status log', {
      error,
      foodOrderId,
      status,
    });
  }

  void notifyCustomerForFoodStatusFromRider(foodOrderId, foodOrder.customer_id, status).catch((error) => {
    console.error('Failed to send customer food notification from rider update', {
      error,
      foodOrderId,
      status,
    });
  });

  return foodOrder;
}

export async function assignRiderToBooking(bookingId: string, riderId: string | null) {
  const { data, error } = await supabase
    .from('bookings')
    .update({
      assigned_rider_id: riderId,
      rider_id: riderId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', bookingId)
    .select('*')
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(`Booking ${bookingId} was not found.`);
  }

  return data;
}

export function mapRiderToRunner(rider: Rider): MockRunner {
  return {
    distanceAway: rider.current_location ?? 'Assigned rider',
    eta: '3 minutes away',
    motorcycle: rider.motorcycle_model,
    name: rider.full_name,
    plateNumber: rider.plate_number,
    rating: String(Number(rider.rating).toFixed(1)),
  };
}

function formatStatusForLog(status: string) {
  return status
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

async function notifyCustomerForBookingStatusFromRider(
  bookingId: string,
  customerId: string | null,
  status: BookingStatus
) {
  const { notifyCustomerForBookingStatus } = await import('@/services/push-notification-service');
  await notifyCustomerForBookingStatus(bookingId, customerId, status);
}

async function notifyCustomerForFoodStatusFromRider(
  foodOrderId: string,
  customerId: string | null,
  status: FoodOrderStatus
) {
  const { notifyCustomerForFoodStatus } = await import('@/services/push-notification-service');
  await notifyCustomerForFoodStatus(foodOrderId, customerId, status);
}
