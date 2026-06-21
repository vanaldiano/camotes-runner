import * as Location from 'expo-location';
import { Platform } from 'react-native';

import { supabase } from '@/services/supabase';
import type { Tables, TablesInsert } from '@/types/database';

export type RiderLocation = Tables<'rider_locations'>;
export type UpsertRiderLocationInput = Pick<
  TablesInsert<'rider_locations'>,
  | 'booking_id'
  | 'food_order_id'
  | 'heading'
  | 'latitude'
  | 'longitude'
  | 'partner_order_id'
  | 'rider_id'
  | 'speed'
>;

const RIDER_LOCATION_TIMEOUT_MS = 15000;

type CurrentLocationOptions = Location.LocationOptions & {
  maximumAge?: number;
  timeout?: number;
};

export async function requestRiderLocationPermission() {
  if (Platform.OS === 'web') {
    throw new Error('Live rider location is available in native app builds.');
  }

  const permission = await Location.requestForegroundPermissionsAsync();

  if (permission.status !== 'granted') {
    throw new Error('Location permission was not granted.');
  }
}

export async function getRiderCurrentLocationPoint() {
  if (Platform.OS === 'web') {
    throw new Error('Live rider location is available in native app builds.');
  }

  const locationOptions: CurrentLocationOptions = {
    accuracy: Location.Accuracy.Balanced,
    maximumAge: 10000,
    timeout: RIDER_LOCATION_TIMEOUT_MS,
  };
  const position = await Location.getCurrentPositionAsync(locationOptions);

  return {
    heading: position.coords.heading,
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    speed: position.coords.speed,
  };
}

export async function upsertRiderLocation(input: UpsertRiderLocationInput) {
  const payload: TablesInsert<'rider_locations'> = {
    ...input,
    booking_id: input.booking_id ?? null,
    food_order_id: input.food_order_id ?? null,
    heading: input.heading ?? null,
    partner_order_id: input.partner_order_id ?? null,
    speed: input.speed ?? null,
    updated_at: new Date().toISOString(),
  };
  const onConflict = payload.partner_order_id
    ? 'rider_id,partner_order_id'
    : payload.food_order_id
      ? 'rider_id,food_order_id'
      : 'rider_id,booking_id';

  const { data, error } = await supabase
    .from('rider_locations')
    .upsert(payload, { onConflict })
    .select('*')
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error('Supabase did not return the saved rider location.');
  }

  return data;
}

export async function publishCurrentRiderLocation(riderId: string, bookingId: string) {
  const point = await getRiderCurrentLocationPoint();

  return upsertRiderLocation({
    booking_id: bookingId,
    food_order_id: null,
    heading: point.heading,
    latitude: point.latitude,
    longitude: point.longitude,
    partner_order_id: null,
    rider_id: riderId,
    speed: point.speed,
  });
}

export async function publishCurrentRiderFoodOrderLocation(riderId: string, foodOrderId: string) {
  const point = await getRiderCurrentLocationPoint();

  return upsertRiderLocation({
    booking_id: null,
    food_order_id: foodOrderId,
    heading: point.heading,
    latitude: point.latitude,
    longitude: point.longitude,
    partner_order_id: null,
    rider_id: riderId,
    speed: point.speed,
  });
}

export async function publishCurrentRiderPartnerOrderLocation(
  riderId: string,
  partnerOrderId: string
) {
  const point = await getRiderCurrentLocationPoint();

  return upsertRiderLocation({
    booking_id: null,
    food_order_id: null,
    heading: point.heading,
    latitude: point.latitude,
    longitude: point.longitude,
    partner_order_id: partnerOrderId,
    rider_id: riderId,
    speed: point.speed,
  });
}

export async function getLatestRiderLocationForBooking(bookingId: string) {
  const { data, error } = await supabase
    .from('rider_locations')
    .select('*')
    .eq('booking_id', bookingId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function getLatestRiderLocationForFoodOrder(foodOrderId: string) {
  const { data, error } = await supabase
    .from('rider_locations')
    .select('*')
    .eq('food_order_id', foodOrderId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function getLatestRiderLocationForPartnerOrder(partnerOrderId: string) {
  const { data, error } = await supabase
    .from('rider_locations')
    .select('*')
    .eq('partner_order_id', partnerOrderId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}
