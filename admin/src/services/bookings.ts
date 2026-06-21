import { supabase } from '../lib/supabase';
import {
  notifyCustomerForBookingStatus,
  notifyCustomerForFoodStatus,
  notifyRiderForBookingAssignment,
  notifyRiderForFoodAssignment,
} from './notifications';

import type {
  BookingStatus,
  FoodOrderStatus,
  PartnerOrderStatus,
  Tables,
  TablesInsert,
  TablesUpdate,
} from '../../../src/types/database';
import {
  calculateDistanceKm,
  estimateEtaMinutes,
  formatDistance,
  formatEta,
} from '../../../src/services/eta-service';

export type AdminBooking = Tables<'bookings'> & {
  latest_rider_location_eta?: string | null;
  latest_rider_location_updated_at?: string | null;
};
export type AdminRider = Tables<'riders'>;
export type AdminRiderLocation = Tables<'rider_locations'>;
export type AdminRestaurant = Tables<'restaurants'>;
export type AdminMenuCategory = Tables<'menu_categories'>;
export type AdminMenuItem = Tables<'menu_items'>;
export type AdminServiceCategory = Tables<'service_categories'>;
export type AdminServiceSubcategory = Tables<'service_subcategories'>;
export type AdminBusinessPartner = Tables<'business_partners'>;
export type AdminPartnerUser = Tables<'partner_users'>;
export type AdminPartnerOrderNotification = Tables<'partner_order_notifications'>;
export type AdminPartnerProduct = Tables<'partner_products'>;
export type AdminPartnerOrder = Tables<'partner_orders'>;
export type AdminPartnerOrderItem = Tables<'partner_order_items'>;
export type AdminPartnerDeliveryRateProfile = Tables<'partner_delivery_rate_profiles'>;
export type AdminFoodOrder = Tables<'food_orders'> & {
  latest_rider_location_updated_at?: string | null;
};
export type AdminFoodOrderItem = Tables<'food_order_items'>;
export type RestaurantInput = Pick<
  TablesInsert<'restaurants'>,
  | 'address'
  | 'category'
  | 'delivery_fee'
  | 'estimated_delivery_time'
  | 'image_url'
  | 'is_active'
  | 'latitude'
  | 'longitude'
  | 'name'
>;
export type MenuItemInput = Pick<
  TablesInsert<'menu_items'>,
  | 'category_id'
  | 'description'
  | 'image_url'
  | 'is_available'
  | 'name'
  | 'price'
  | 'restaurant_id'
>;
export type BusinessPartnerInput = Pick<
  TablesInsert<'business_partners'>,
  | 'address'
  | 'business_hours'
  | 'category_id'
  | 'delivery_fee_label'
  | 'description'
  | 'estimated_time'
  | 'image_url'
  | 'is_active'
  | 'is_open'
  | 'latitude'
  | 'longitude'
  | 'name'
  | 'owner_email'
  | 'owner_name'
  | 'owner_phone'
  | 'partner_notes'
  | 'phone'
  | 'rating'
  | 'restaurant_id'
  | 'status'
  | 'subcategory_id'
>;
export type PartnerUserInput = Pick<
  TablesInsert<'partner_users'>,
  | 'email'
  | 'full_name'
  | 'is_active'
  | 'partner_id'
  | 'phone'
  | 'role'
  | 'user_id'
>;
export type PartnerProductInput = Pick<
  TablesInsert<'partner_products'>,
  | 'category_id'
  | 'description'
  | 'image_url'
  | 'is_active'
  | 'is_available'
  | 'name'
  | 'partner_id'
  | 'price'
  | 'sku'
  | 'sort_order'
  | 'subcategory_id'
  | 'unit_label'
>;
export type PartnerDeliveryRateProfileInput = Pick<
  TablesInsert<'partner_delivery_rate_profiles'>,
  | 'base_fee'
  | 'base_km'
  | 'category_id'
  | 'is_active'
  | 'is_manual_quote'
  | 'minimum_fee'
  | 'name'
  | 'partner_id'
  | 'per_km_fee'
  | 'service_fee'
  | 'service_type'
  | 'subcategory_id'
>;

const restaurantImageBucket = 'restaurant-images';
const menuImageBucket = 'menu-images';
const partnerProductImageBucket = 'partner-products';

export class AdminBookingNotFoundError extends Error {
  constructor(bookingId: string) {
    super(`Booking ${bookingId} was not found.`);
    this.name = 'AdminBookingNotFoundError';
  }
}

export const bookingStatuses: BookingStatus[] = [
  'pending',
  'accepted',
  'runner_arriving',
  'in_progress',
  'completed',
  'cancelled',
];

export const foodOrderStatuses: FoodOrderStatus[] = [
  'pending',
  'accepted',
  'preparing',
  'picked_up',
  'on_the_way',
  'delivered',
  'cancelled',
];

export const partnerOrderStatuses: PartnerOrderStatus[] = [
  'pending',
  'accepted',
  'preparing',
  'picked_up',
  'on_the_way',
  'completed',
  'cancelled',
];

export async function getAllBookings() {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return addLatestRiderLocationTimestamps(data ?? []);
}

async function addLatestRiderLocationTimestamps(bookings: Tables<'bookings'>[]) {
  if (bookings.length === 0) {
    return [];
  }

  const activeBookingIds = bookings
    .filter((booking) => booking.status !== 'completed' && booking.status !== 'cancelled')
    .map((booking) => booking.id);

  if (activeBookingIds.length === 0) {
    return bookings.map((booking) => ({
      ...booking,
      latest_rider_location_eta: null,
      latest_rider_location_updated_at: null,
    }));
  }

  const { data: riderLocations, error } = await supabase
    .from('rider_locations')
    .select('*')
    .in('booking_id', activeBookingIds)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Unable to load latest rider locations for admin dashboard', error);
    return bookings.map((booking) => ({
      ...booking,
      latest_rider_location_eta: null,
      latest_rider_location_updated_at: null,
    }));
  }

  const latestByBookingId = new Map<string, AdminRiderLocation>();

  for (const riderLocation of riderLocations ?? []) {
    if (riderLocation.booking_id && !latestByBookingId.has(riderLocation.booking_id)) {
      latestByBookingId.set(riderLocation.booking_id, riderLocation);
    }
  }

  return bookings.map((booking) => ({
    ...booking,
    latest_rider_location_eta: getAdminBookingEta(
      booking,
      latestByBookingId.get(booking.id) ?? null
    ),
    latest_rider_location_updated_at:
      latestByBookingId.get(booking.id)?.updated_at ?? null,
  }));
}

function getAdminBookingEta(
  booking: Tables<'bookings'>,
  riderLocation: AdminRiderLocation | null
) {
  if (!riderLocation || booking.status === 'completed' || booking.status === 'cancelled') {
    return null;
  }

  const target =
    booking.status === 'in_progress'
      ? {
          label: 'Rider to destination',
          latitude: booking.destination_lat,
          longitude: booking.destination_lng,
        }
      : {
          label: 'Rider to pickup',
          latitude: booking.pickup_lat,
          longitude: booking.pickup_lng,
        };
  const distanceKm = calculateDistanceKm(
    riderLocation.latitude,
    riderLocation.longitude,
    target.latitude,
    target.longitude
  );
  const etaMinutes = estimateEtaMinutes(distanceKm);

  if (distanceKm === null || etaMinutes === null) {
    return null;
  }

  return `${target.label}: ${formatDistance(distanceKm)} / ${formatEta(etaMinutes)}`;
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

export async function getRestaurants() {
  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getMenuItems() {
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .order('restaurant_id', { ascending: true })
    .order('display_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getMenuCategories() {
  const { data, error } = await supabase
    .from('menu_categories')
    .select('*')
    .order('restaurant_id', { ascending: true })
    .order('display_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getServiceCategories() {
  const { data, error } = await supabase
    .from('service_categories')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getServiceSubcategories() {
  const { data, error } = await supabase
    .from('service_subcategories')
    .select('*')
    .order('category_id', { ascending: true })
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getBusinessPartners() {
  const { data, error } = await supabase
    .from('business_partners')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getBusinessPartnerById(partnerId: string) {
  const { data, error } = await supabase
    .from('business_partners')
    .select('*')
    .eq('id', partnerId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(`Partner shop ${partnerId} was not found.`);
  }

  return data;
}

export async function createBusinessPartner(input: BusinessPartnerInput) {
  const { data, error } = await supabase
    .from('business_partners')
    .insert(input)
    .select('*')
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error('Supabase did not return the created partner shop.');
  }

  return data;
}

export async function updateBusinessPartner(
  partnerId: string,
  input: TablesUpdate<'business_partners'>
) {
  const { data, error } = await supabase
    .from('business_partners')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', partnerId)
    .select('*')
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(`Partner shop ${partnerId} was not found.`);
  }

  return data;
}

export async function getPartnerUsers(partnerId?: string) {
  let query = supabase
    .from('partner_users')
    .select('*')
    .order('created_at', { ascending: false });

  if (partnerId) {
    query = query.eq('partner_id', partnerId);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function assignPartnerUserFoundation(input: PartnerUserInput) {
  const payload = {
    ...input,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from('partner_users')
    .upsert(payload, { onConflict: 'user_id,partner_id' })
    .select('*')
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error('Supabase did not return the partner user assignment.');
  }

  return data;
}

export async function getPartnerOrderNotifications() {
  const { data, error } = await supabase
    .from('partner_order_notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getPartnerNotificationsByPartner(partnerId: string) {
  const { data, error } = await supabase
    .from('partner_order_notifications')
    .select('*')
    .eq('partner_id', partnerId)
    .order('created_at', { ascending: false })
    .limit(25);

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function markPartnerNotificationRead(notificationId: string) {
  const { data, error } = await supabase
    .from('partner_order_notifications')
    .update({
      read_at: new Date().toISOString(),
      status: 'read',
    })
    .eq('id', notificationId)
    .select('*')
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(`Partner notification ${notificationId} was not found.`);
  }

  return data;
}

export async function getUnreadPartnerNotificationCount(partnerId?: string) {
  let query = supabase
    .from('partner_order_notifications')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'unread');

  if (partnerId) {
    query = query.eq('partner_id', partnerId);
  }

  const { count, error } = await query;

  if (error) {
    throw error;
  }

  return count ?? 0;
}

export async function getPartnerProducts(partnerId: string) {
  const { data, error } = await supabase
    .from('partner_products')
    .select('*')
    .eq('partner_id', partnerId)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getPartnerOrders(status?: PartnerOrderStatus | 'all') {
  let query = supabase
    .from('partner_orders')
    .select('*')
    .order('created_at', { ascending: false });

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getPartnerOrdersByPartner(partnerId: string) {
  const { data, error } = await supabase
    .from('partner_orders')
    .select('*')
    .eq('partner_id', partnerId)
    .order('created_at', { ascending: false })
    .limit(25);

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getPartnerOrderItems(orderIds: string[]) {
  if (orderIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('partner_order_items')
    .select('*')
    .in('partner_order_id', orderIds)
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function updatePartnerOrderStatus(
  orderId: string,
  status: PartnerOrderStatus
) {
  const timestampUpdates: TablesUpdate<'partner_orders'> = {};
  const now = new Date().toISOString();

  if (status === 'accepted') {
    timestampUpdates.accepted_at = now;
    timestampUpdates.partner_status = 'accepted';
  }

  if (status === 'completed') {
    timestampUpdates.completed_at = now;
    timestampUpdates.rider_status = 'completed';
  }

  if (status === 'cancelled') {
    timestampUpdates.cancelled_at = now;
  }

  const { data, error } = await supabase
    .from('partner_orders')
    .update({
      ...timestampUpdates,
      status,
      updated_at: now,
    })
    .eq('id', orderId)
    .select('*')
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(`Partner order ${orderId} was not found.`);
  }

  return data;
}

export async function assignPartnerOrderRider(orderId: string, riderId: string | null) {
  const { data, error } = await supabase
    .from('partner_orders')
    .update({
      assigned_at: riderId ? new Date().toISOString() : null,
      assigned_rider_id: riderId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)
    .select('*')
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(`Partner order ${orderId} was not found.`);
  }

  return data;
}

export async function createPartnerProduct(input: PartnerProductInput) {
  const { data, error } = await supabase
    .from('partner_products')
    .insert(input)
    .select('*')
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error('Supabase did not return the created partner product.');
  }

  return data;
}

export async function updatePartnerProduct(
  productId: string,
  input: TablesUpdate<'partner_products'>
) {
  const { data, error } = await supabase
    .from('partner_products')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', productId)
    .select('*')
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(`Partner product ${productId} was not found.`);
  }

  return data;
}

export async function deactivatePartnerProduct(productId: string) {
  return updatePartnerProduct(productId, { is_active: false });
}

export async function togglePartnerProductAvailability(
  productId: string,
  isAvailable: boolean
) {
  return updatePartnerProduct(productId, { is_available: isAvailable });
}

export async function uploadPartnerProductImage(partnerId: string, file: File) {
  return uploadImageFile(partnerProductImageBucket, partnerId, file);
}

export async function getPartnerDeliveryRateProfiles() {
  const { data, error } = await supabase
    .from('partner_delivery_rate_profiles')
    .select('*')
    .order('service_type', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function updatePartnerDeliveryRateProfile(
  profileId: string,
  input: TablesUpdate<'partner_delivery_rate_profiles'>
) {
  const { data, error } = await supabase
    .from('partner_delivery_rate_profiles')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', profileId)
    .select('*')
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(`Partner delivery rate profile ${profileId} was not found.`);
  }

  return data;
}

export async function createPartnerDeliveryRateProfile(input: PartnerDeliveryRateProfileInput) {
  const { data, error } = await supabase
    .from('partner_delivery_rate_profiles')
    .insert(input)
    .select('*')
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error('Supabase did not return the created partner delivery rate profile.');
  }

  return data;
}

export async function deactivatePartnerDeliveryRateProfile(profileId: string) {
  return updatePartnerDeliveryRateProfile(profileId, { is_active: false });
}

export async function createRestaurant(input: RestaurantInput) {
  const { data, error } = await supabase
    .from('restaurants')
    .insert(input)
    .select('*')
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error('Supabase did not return the created restaurant.');
  }

  await ensureDefaultMenuCategory(data.id);

  return data;
}

export async function updateRestaurant(
  restaurantId: string,
  input: TablesUpdate<'restaurants'>
) {
  const { data, error } = await supabase
    .from('restaurants')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', restaurantId)
    .select('*')
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(`Restaurant ${restaurantId} was not found.`);
  }

  return data;
}

export async function updateRestaurantOpenStatus(restaurantId: string, isOpen: boolean) {
  return updateRestaurant(restaurantId, { is_active: isOpen });
}

export async function deleteRestaurant(restaurantId: string) {
  const { error } = await supabase
    .from('restaurants')
    .delete()
    .eq('id', restaurantId);

  if (error) {
    throw error;
  }
}

export async function updateRestaurantImageUrl(restaurantId: string, imageUrl: string | null) {
  const { data, error } = await supabase
    .from('restaurants')
    .update({ image_url: imageUrl, updated_at: new Date().toISOString() })
    .eq('id', restaurantId)
    .select('*')
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(`Restaurant ${restaurantId} was not found.`);
  }

  return data;
}

export async function uploadRestaurantImageFile(restaurantId: string, file: File) {
  return uploadImageFile(restaurantImageBucket, restaurantId, file);
}

export async function updateMenuItemImageUrl(menuItemId: string, imageUrl: string | null) {
  const { data, error } = await supabase
    .from('menu_items')
    .update({ image_url: imageUrl, updated_at: new Date().toISOString() })
    .eq('id', menuItemId)
    .select('*')
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(`Menu item ${menuItemId} was not found.`);
  }

  return data;
}

export async function uploadMenuItemImageFile(menuItemId: string, file: File) {
  return uploadImageFile(menuImageBucket, menuItemId, file);
}

export async function createMenuItem(input: MenuItemInput) {
  const { data, error } = await supabase
    .from('menu_items')
    .insert(input)
    .select('*')
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error('Supabase did not return the created menu item.');
  }

  return data;
}

export async function updateMenuItem(menuItemId: string, input: TablesUpdate<'menu_items'>) {
  const { data, error } = await supabase
    .from('menu_items')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', menuItemId)
    .select('*')
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(`Menu item ${menuItemId} was not found.`);
  }

  return data;
}

export async function updateMenuItemAvailability(menuItemId: string, isAvailable: boolean) {
  return updateMenuItem(menuItemId, { is_available: isAvailable });
}

export async function deleteMenuItem(menuItemId: string) {
  const { error } = await supabase
    .from('menu_items')
    .delete()
    .eq('id', menuItemId);

  if (error) {
    throw error;
  }
}

export async function getAllFoodOrders() {
  const { data, error } = await supabase
    .from('food_orders')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return addLatestFoodRiderLocationTimestamps(data ?? []);
}

async function addLatestFoodRiderLocationTimestamps(foodOrders: AdminFoodOrder[]) {
  if (foodOrders.length === 0) {
    return [];
  }

  const activeFoodOrderIds = foodOrders
    .filter((foodOrder) => foodOrder.status !== 'delivered' && foodOrder.status !== 'cancelled')
    .map((foodOrder) => foodOrder.id);

  if (activeFoodOrderIds.length === 0) {
    return foodOrders.map((foodOrder) => ({
      ...foodOrder,
      latest_rider_location_updated_at: null,
    }));
  }

  const { data: riderLocations, error } = await supabase
    .from('rider_locations')
    .select('*')
    .in('food_order_id', activeFoodOrderIds)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Unable to load latest food rider locations for admin dashboard', error);
    return foodOrders.map((foodOrder) => ({
      ...foodOrder,
      latest_rider_location_updated_at: null,
    }));
  }

  const latestByFoodOrderId = new Map<string, AdminRiderLocation>();

  for (const riderLocation of riderLocations ?? []) {
    if (riderLocation.food_order_id && !latestByFoodOrderId.has(riderLocation.food_order_id)) {
      latestByFoodOrderId.set(riderLocation.food_order_id, riderLocation);
    }
  }

  return foodOrders.map((foodOrder) => ({
    ...foodOrder,
    latest_rider_location_updated_at:
      latestByFoodOrderId.get(foodOrder.id)?.updated_at ?? null,
  }));
}

async function uploadImageFile(bucketName: string, entityId: string, file: File) {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file.');
  }

  const filePath = `${sanitizePathPart(entityId)}/${sanitizePathPart(entityId)}-${Date.now()}${getSafeFileExtension(file)}`;
  const { error } = await supabase.storage.from(bucketName).upload(filePath, file, {
    cacheControl: '3600',
    upsert: false,
  });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath);

  if (!data.publicUrl) {
    throw new Error('Supabase did not return a public image URL.');
  }

  return data.publicUrl;
}

function getSafeFileExtension(file: File) {
  const extensionFromName = file.name.split('.').pop()?.toLowerCase();
  const extensionFromType = file.type.split('/').pop()?.toLowerCase();
  const rawExtension = extensionFromName && extensionFromName !== file.name
    ? extensionFromName
    : extensionFromType;
  const safeExtension = rawExtension?.replace(/[^a-z0-9]/g, '') || 'jpg';

  return `.${safeExtension}`;
}

function sanitizePathPart(value: string) {
  return value.replace(/[^a-zA-Z0-9-]/g, '-');
}

async function ensureDefaultMenuCategory(restaurantId: string) {
  const { error } = await supabase
    .from('menu_categories')
    .insert({
      display_order: 999,
      is_active: true,
      name: 'General',
      restaurant_id: restaurantId,
    });

  if (error && error.code !== '23505') {
    throw error;
  }
}

export async function getFoodOrderItems(foodOrderIds: string[]) {
  if (foodOrderIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('food_order_items')
    .select('*')
    .in('food_order_id', foodOrderIds)
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
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
    throw new Error(`Rider ${riderId} was not found.`);
  }

  return data;
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
    const notFoundError = new AdminBookingNotFoundError(bookingId);
    throw notFoundError;
  }

  void notifyRiderForBookingAssignment(bookingId, riderId).catch((notificationError) => {
    console.error('Failed to send rider booking assignment notification', {
      bookingId,
      error: notificationError,
      riderId,
    });
  });

  return data;
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
    const notFoundError = new AdminBookingNotFoundError(bookingId);
    throw notFoundError;
  }

  const { error: statusLogError } = await supabase.from('booking_status_logs').insert({
    booking_id: bookingId,
    message: `Admin updated booking status to ${status}.`,
    status,
  });

  if (statusLogError) {
    throw statusLogError;
  }

  void notifyCustomerForBookingStatus(bookingId, data.customer_id, status).catch(
    (notificationError) => {
      console.error('Failed to send customer booking status notification', {
        bookingId,
        error: notificationError,
        status,
      });
    }
  );

  return data;
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
    throw new Error(`Food order ${foodOrderId} was not found.`);
  }

  const { error: statusLogError } = await supabase.from('food_order_status_logs').insert({
    food_order_id: foodOrderId,
    message: `Admin updated food order status to ${status}.`,
    status,
  });

  if (statusLogError) {
    console.error('Supabase failed to insert food order status log', {
      error: statusLogError,
      foodOrderId,
      status,
    });
  }

  void notifyCustomerForFoodStatus(foodOrderId, data.customer_id, status).catch(
    (notificationError) => {
      console.error('Failed to send customer food order status notification', {
        error: notificationError,
        foodOrderId,
        status,
      });
    }
  );

  return data;
}

export async function assignRiderToFoodOrder(foodOrderId: string, riderId: string | null) {
  const { data, error } = await supabase
    .from('food_orders')
    .update({
      assigned_rider_id: riderId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', foodOrderId)
    .select('*')
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(`Food order ${foodOrderId} was not found.`);
  }

  void notifyRiderForFoodAssignment(foodOrderId, riderId).catch((notificationError) => {
    console.error('Failed to send rider food assignment notification', {
      error: notificationError,
      foodOrderId,
      riderId,
    });
  });

  return data;
}
