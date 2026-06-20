import { supabase } from '@/services/supabase';
import type { FoodCartItem } from '@/services/food-cart';
import type { FoodOrderStatus, PaymentMethod, Tables, TablesInsert } from '@/types/database';

export type FoodOrder = Tables<'food_orders'>;
export type FoodOrderItem = Tables<'food_order_items'>;
export type FoodOrderStatusLog = Tables<'food_order_status_logs'>;
export type FoodOrderWithRestaurant = FoodOrder & {
  restaurant_name: string;
};
export type CreateFoodOrderInput = {
  customerId?: string | null;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  deliveryDistanceKm?: number | null;
  deliveryFee: number;
  deliveryLat?: number | null;
  deliveryLng?: number | null;
  items: FoodCartItem[];
  notes: string;
  orderSubtotal?: number | null;
  orderTotal?: number | null;
  paymentMethod: PaymentMethod;
  restaurantId: string;
  serviceFee?: number | null;
  subtotal: number;
  total: number;
};

export class FoodOrderNotFoundError extends Error {
  constructor(foodOrderId: string) {
    super(`Food order ${foodOrderId} was not found.`);
    this.name = 'FoodOrderNotFoundError';
  }
}

export async function createFoodOrder(input: CreateFoodOrderInput) {
  if (input.items.length === 0) {
    throw new Error('Your cart is empty.');
  }

  const orderPayload: TablesInsert<'food_orders'> = {
    customer_id: input.customerId ?? null,
    customer_name: input.customerName,
    customer_phone: input.customerPhone,
    delivery_distance_km: input.deliveryDistanceKm ?? null,
    delivery_fee: input.deliveryFee,
    delivery_lat: input.deliveryLat ?? null,
    delivery_lng: input.deliveryLng ?? null,
    delivery_location: input.deliveryAddress,
    notes: input.notes,
    order_subtotal: input.orderSubtotal ?? input.subtotal,
    order_total: input.orderTotal ?? input.total,
    payment_method: input.paymentMethod,
    restaurant_id: input.restaurantId,
    service_fee: input.serviceFee ?? null,
    status: 'pending',
    subtotal: input.subtotal,
    total_amount: input.total,
  };

  console.log('FOOD_ORDER_COORDINATES_PAYLOAD', {
    delivery_lat: orderPayload.delivery_lat,
    delivery_lng: orderPayload.delivery_lng,
  });
  console.log('FOOD_ORDER_DISTANCE_FEE_SAVED', {
    delivery_distance_km: orderPayload.delivery_distance_km,
    delivery_fee: orderPayload.delivery_fee,
    order_subtotal: orderPayload.order_subtotal,
    order_total: orderPayload.order_total,
    service_fee: orderPayload.service_fee,
    total_amount: orderPayload.total_amount,
  });

  const { data: order, error: orderError } = await supabase
    .from('food_orders')
    .insert(orderPayload)
    .select('*')
    .maybeSingle();

  if (orderError) {
    throw orderError;
  }

  if (!order) {
    throw new Error('Supabase did not return the created food order.');
  }

  const itemPayloads: TablesInsert<'food_order_items'>[] = input.items.map((item) => ({
    food_order_id: order.id,
    item_name: item.name,
    line_total: item.unitPrice * item.quantity,
    menu_item_id: isUuid(item.id) ? item.id : null,
    quantity: item.quantity,
    unit_price: item.unitPrice,
  }));

  const { data: orderItems, error: itemsError } = await supabase
    .from('food_order_items')
    .insert(itemPayloads)
    .select('*');

  if (itemsError) {
    throw itemsError;
  }

  return {
    order,
    orderItems: orderItems ?? [],
  };
}

export async function getFoodOrderById(foodOrderId: string) {
  const { data, error } = await supabase
    .from('food_orders')
    .select('*')
    .eq('id', foodOrderId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new FoodOrderNotFoundError(foodOrderId);
  }

  return data;
}

export async function getLatestFoodOrders(limit = 10) {
  const { data, error } = await supabase
    .from('food_orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return withRestaurantNames(data ?? []);
}

export async function getUserFoodOrders(customerId: string) {
  const { data, error } = await supabase
    .from('food_orders')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return withRestaurantNames(data ?? []);
}

export async function getAssignedFoodOrdersForRider(riderId: string) {
  const { data: orders, error: ordersError } = await supabase
    .from('food_orders')
    .select('*')
    .eq('assigned_rider_id', riderId)
    .order('created_at', { ascending: false });

  if (ordersError) {
    throw ordersError;
  }

  if (!orders || orders.length === 0) {
    return [];
  }

  return withRestaurantNames(orders);
}

async function withRestaurantNames(orders: FoodOrder[]) {
  if (orders.length === 0) {
    return [];
  }

  const restaurantIds = [...new Set(orders.map((order) => order.restaurant_id))];
  const { data: restaurants, error: restaurantsError } = await supabase
    .from('restaurants')
    .select('id, name')
    .in('id', restaurantIds);

  if (restaurantsError) {
    throw restaurantsError;
  }

  return orders.map<FoodOrderWithRestaurant>((order) => ({
    ...order,
    restaurant_name:
      restaurants?.find((restaurant) => restaurant.id === order.restaurant_id)?.name ??
      'Restaurant',
  }));
}

export async function updateFoodOrderStatus(foodOrderId: string, status: FoodOrderStatus) {
  const { data, error } = await supabase
    .from('food_orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', foodOrderId)
    .select('*')
    .maybeSingle();

  if (error) {
    console.error('Supabase failed to update food order status', {
      error,
      foodOrderId,
      status,
    });
    throw error;
  }

  if (!data) {
    throw new FoodOrderNotFoundError(foodOrderId);
  }

  return data;
}

export async function addFoodOrderStatusLog(
  foodOrderId: string,
  status: FoodOrderStatus,
  message?: string
) {
  const { data, error } = await supabase
    .from('food_order_status_logs')
    .insert({
      food_order_id: foodOrderId,
      message,
      status,
    })
    .select('*')
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error('Supabase did not return the created food order status log.');
  }

  return data;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}
