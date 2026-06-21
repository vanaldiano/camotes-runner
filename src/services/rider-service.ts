import { supabase } from '@/services/supabase';
import { addBookingStatusLog, updateBookingStatus, type Booking } from '@/services/booking-service';
import type { MockRunner } from '@/services/booking-simulation';
import {
  addFoodOrderStatusLog,
  getAssignedFoodOrdersForRider,
  updateFoodOrderStatus,
  type FoodOrderWithRestaurant,
} from '@/services/food-order-service';
import type { BookingStatus, FoodOrderStatus, Json, PartnerOrderStatus, Tables } from '@/types/database';

export type Rider = Tables<'riders'>;
export type RiderPartnerOrderItem = Tables<'partner_order_items'>;
export type RiderPartnerOrder = Tables<'partner_orders'> & {
  items: RiderPartnerOrderItem[];
  partner_address: string | null;
  partner_latitude: number | null;
  partner_longitude: number | null;
  partner_name: string;
};

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
    partner_id: null,
    partner_notification_status: 'pending',
    partner_notified_at: null,
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

export const fallbackRiderPartnerOrders: RiderPartnerOrder[] = [
  {
    accepted_at: null,
    assigned_at: new Date().toISOString(),
    assigned_rider_id: fallbackRider.id,
    cancelled_at: null,
    completed_at: null,
    created_at: new Date().toISOString(),
    customer_id: null,
    customer_name: 'Juan Customer',
    customer_phone: '09123456789',
    customer_tracking_token: 'sample-token',
    customer_tracking_token_created_at: new Date().toISOString(),
    delivery_address: 'San Francisco Town Center',
    delivery_fee: 50,
    delivery_lat: 10.6469,
    delivery_lng: 124.3506,
    id: 'sample-partner-order-1',
    items: [
      {
        created_at: new Date().toISOString(),
        id: 'sample-partner-order-item-1',
        line_total: 165,
        partner_order_id: 'sample-partner-order-1',
        product_description: 'Daily essentials',
        product_id: null,
        product_name: 'Mini mart items',
        quantity: 3,
        unit_price: 55,
      },
    ],
    notes: 'Please call before delivery.',
    partner_address: 'Camotes Mini Mart, San Francisco',
    partner_id: 'sample-partner-camotes-mini-mart',
    partner_latitude: 10.6469,
    partner_longitude: 124.3506,
    partner_name: 'Camotes Mini Mart',
    partner_status: 'new',
    payment_method: 'cash',
    rider_status: null,
    service_fee: 0,
    status: 'accepted',
    subtotal: 165,
    total_amount: 215,
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

export async function getAssignedPartnerOrdersForRider(riderId: string) {
  const { data, error } = await supabase.rpc('get_assigned_partner_orders_for_rider', {
    target_rider_id: riderId,
  });

  if (error) {
    throw error;
  }

  return normalizeRiderPartnerOrders(data);
}

export async function getMvpRiderJobs() {
  const rider = await getRiderByName(MVP_RIDER_NAME);
  const [jobs, foodOrders, partnerOrders] = await Promise.all([
    getAssignedBookingsForRider(rider.id),
    getAssignedFoodOrdersForRider(rider.id),
    getAssignedPartnerOrdersForRider(rider.id),
  ]);

  return { foodOrders, jobs, partnerOrders, rider };
}

export async function getAuthenticatedRiderJobs(authUserId: string) {
  const rider = await getRiderByAuthUserId(authUserId);

  if (!rider) {
    throw new RiderNotFoundError(authUserId);
  }

  const [jobs, foodOrders, partnerOrders] = await Promise.all([
    getAssignedBookingsForRider(rider.id),
    getAssignedFoodOrdersForRider(rider.id),
    getAssignedPartnerOrdersForRider(rider.id),
  ]);

  return { foodOrders, jobs, partnerOrders, rider };
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

export async function updateRiderPartnerOrderStatus(
  partnerOrderId: string,
  riderId: string,
  status: Extract<PartnerOrderStatus, 'accepted' | 'picked_up' | 'on_the_way' | 'completed'>
) {
  const { data, error } = await supabase.rpc('update_partner_order_status_for_rider', {
    next_status: status,
    target_partner_order_id: partnerOrderId,
    target_rider_id: riderId,
  });

  if (error) {
    throw error;
  }

  const order = normalizeRiderPartnerOrder(data);

  if (!order) {
    throw new Error('Supabase did not return the updated partner order.');
  }

  return order;
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

function normalizeRiderPartnerOrders(data: Json | null): RiderPartnerOrder[] {
  if (!Array.isArray(data)) {
    return [];
  }

  return data
    .map(normalizeRiderPartnerOrder)
    .filter((order): order is RiderPartnerOrder => Boolean(order));
}

function normalizeRiderPartnerOrder(data: Json | null): RiderPartnerOrder | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return null;
  }

  const rawOrder = data as Partial<RiderPartnerOrder> & {
    items?: Json;
  };

  if (!rawOrder.id || !rawOrder.partner_id || !rawOrder.status || !rawOrder.created_at) {
    return null;
  }

  return {
    accepted_at: rawOrder.accepted_at ?? null,
    assigned_at: rawOrder.assigned_at ?? null,
    assigned_rider_id: rawOrder.assigned_rider_id ?? null,
    cancelled_at: rawOrder.cancelled_at ?? null,
    completed_at: rawOrder.completed_at ?? null,
    created_at: rawOrder.created_at,
    customer_id: rawOrder.customer_id ?? null,
    customer_name: rawOrder.customer_name ?? null,
    customer_phone: rawOrder.customer_phone ?? null,
    customer_tracking_token: rawOrder.customer_tracking_token ?? null,
    customer_tracking_token_created_at: rawOrder.customer_tracking_token_created_at ?? null,
    delivery_address: rawOrder.delivery_address ?? null,
    delivery_fee: Number(rawOrder.delivery_fee ?? 0),
    delivery_lat: getOptionalNumber(rawOrder.delivery_lat),
    delivery_lng: getOptionalNumber(rawOrder.delivery_lng),
    id: rawOrder.id,
    items: normalizeRiderPartnerOrderItems(rawOrder.items),
    notes: rawOrder.notes ?? null,
    partner_address: rawOrder.partner_address ?? null,
    partner_id: rawOrder.partner_id,
    partner_latitude: getOptionalNumber(rawOrder.partner_latitude),
    partner_longitude: getOptionalNumber(rawOrder.partner_longitude),
    partner_name: rawOrder.partner_name ?? 'Partner shop',
    partner_status: rawOrder.partner_status ?? 'new',
    payment_method: rawOrder.payment_method ?? 'cash',
    rider_status: rawOrder.rider_status ?? null,
    service_fee: Number(rawOrder.service_fee ?? 0),
    status: rawOrder.status,
    subtotal: Number(rawOrder.subtotal ?? 0),
    total_amount: Number(rawOrder.total_amount ?? 0),
    updated_at: rawOrder.updated_at ?? rawOrder.created_at,
  };
}

function normalizeRiderPartnerOrderItems(data: Json | undefined): RiderPartnerOrderItem[] {
  if (!Array.isArray(data)) {
    return [];
  }

  return data
    .map((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        return null;
      }

      const rawItem = item as Partial<RiderPartnerOrderItem>;

      if (!rawItem.id || !rawItem.partner_order_id || !rawItem.product_name) {
        return null;
      }

      return {
        created_at: rawItem.created_at ?? new Date(0).toISOString(),
        id: rawItem.id,
        line_total: Number(rawItem.line_total ?? 0),
        partner_order_id: rawItem.partner_order_id,
        product_description: rawItem.product_description ?? null,
        product_id: rawItem.product_id ?? null,
        product_name: rawItem.product_name,
        quantity: Number(rawItem.quantity ?? 1),
        unit_price: Number(rawItem.unit_price ?? 0),
      };
    })
    .filter((item): item is RiderPartnerOrderItem => Boolean(item));
}

function getOptionalNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
