import { supabase } from '@/services/supabase';
import type { Booking } from '@/services/booking-service';
import type { FoodOrder } from '@/services/food-order-service';
import type { RiderLocation } from '@/services/rider-location-service';

type RealtimeFallback = () => void;

const realtimeFailureStatuses = ['CHANNEL_ERROR', 'TIMED_OUT'];

export function subscribeToBookingChanges(
  bookingId: string,
  onBookingChange: (booking: Booking) => void,
  onFallbackNeeded?: RealtimeFallback
) {
  // Supabase Realtime is best-effort, so screens still keep polling as a backup.
  const channel = supabase
    .channel(`booking-tracking-${bookingId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        filter: `id=eq.${bookingId}`,
        schema: 'public',
        table: 'bookings',
      },
      (payload) => {
        if (payload.new && 'id' in payload.new) {
          onBookingChange(payload.new as Booking);
        }
      }
    )
    .subscribe((status) => {
      if (realtimeFailureStatuses.includes(status)) {
        onFallbackNeeded?.();
      }
    });

  return () => {
    void supabase.removeChannel(channel);
  };
}

export function subscribeToFoodOrderChanges(
  foodOrderId: string,
  onFoodOrderChange: (foodOrder: FoodOrder) => void,
  onFallbackNeeded?: RealtimeFallback
) {
  // This listener prepares the customer app for live food-order status screens later.
  const channel = supabase
    .channel(`food-order-${foodOrderId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        filter: `id=eq.${foodOrderId}`,
        schema: 'public',
        table: 'food_orders',
      },
      (payload) => {
        if (payload.new && 'id' in payload.new) {
          onFoodOrderChange(payload.new as FoodOrder);
        }
      }
    )
    .subscribe((status) => {
      if (realtimeFailureStatuses.includes(status)) {
        onFallbackNeeded?.();
      }
    });

  return () => {
    void supabase.removeChannel(channel);
  };
}

export function subscribeToAssignedFoodOrdersForRider(
  riderId: string,
  onFoodOrdersChange: () => void,
  onFallbackNeeded?: RealtimeFallback
) {
  const channel = supabase
    .channel(`rider-food-orders-${riderId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        filter: `assigned_rider_id=eq.${riderId}`,
        schema: 'public',
        table: 'food_orders',
      },
      onFoodOrdersChange
    )
    .subscribe((status) => {
      if (realtimeFailureStatuses.includes(status)) {
        onFallbackNeeded?.();
      }
    });

  return () => {
    void supabase.removeChannel(channel);
  };
}

export function subscribeToRiderLocationForBooking(
  bookingId: string,
  onRiderLocationChange: (location: RiderLocation) => void,
  onFallbackNeeded?: RealtimeFallback
) {
  const channel = supabase
    .channel(`rider-location-${bookingId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        filter: `booking_id=eq.${bookingId}`,
        schema: 'public',
        table: 'rider_locations',
      },
      (payload) => {
        if (payload.new && 'id' in payload.new) {
          onRiderLocationChange(payload.new as RiderLocation);
        }
      }
    )
    .subscribe((status) => {
      if (realtimeFailureStatuses.includes(status)) {
        onFallbackNeeded?.();
      }
    });

  return () => {
    void supabase.removeChannel(channel);
  };
}

export function subscribeToRiderLocationForFoodOrder(
  foodOrderId: string,
  onRiderLocationChange: (location: RiderLocation) => void,
  onFallbackNeeded?: RealtimeFallback
) {
  const channel = supabase
    .channel(`food-rider-location-${foodOrderId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        filter: `food_order_id=eq.${foodOrderId}`,
        schema: 'public',
        table: 'rider_locations',
      },
      (payload) => {
        if (payload.new && 'id' in payload.new) {
          onRiderLocationChange(payload.new as RiderLocation);
        }
      }
    )
    .subscribe((status) => {
      if (realtimeFailureStatuses.includes(status)) {
        onFallbackNeeded?.();
      }
    });

  return () => {
    void supabase.removeChannel(channel);
  };
}

export function subscribeToCustomerActivityChanges(
  onActivityChange: () => void,
  onFallbackNeeded?: RealtimeFallback
) {
  const channel = supabase
    .channel('customer-activity')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'bookings' },
      onActivityChange
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'food_orders' },
      onActivityChange
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'partner_orders' },
      onActivityChange
    )
    .subscribe((status) => {
      if (realtimeFailureStatuses.includes(status)) {
        onFallbackNeeded?.();
      }
    });

  return () => {
    void supabase.removeChannel(channel);
  };
}
