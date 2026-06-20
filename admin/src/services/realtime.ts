import { supabase } from '../lib/supabase';

type RealtimeFallback = () => void;

const realtimeFailureStatuses = ['CHANNEL_ERROR', 'TIMED_OUT'];

export function subscribeToAdminBookings(
  onBookingsChange: () => void,
  onFallbackNeeded?: RealtimeFallback
) {
  // Admin still keeps periodic refreshes, so Realtime can fail without blocking operations.
  const channel = supabase
    .channel('admin-bookings')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'bookings' },
      onBookingsChange
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'rider_locations' },
      onBookingsChange
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

export function subscribeToAdminFoodOrders(
  onFoodOrdersChange: () => void,
  onFallbackNeeded?: RealtimeFallback
) {
  // Food orders use their own channel so a table-specific failure is easier to explain.
  const channel = supabase
    .channel('admin-food-orders')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'food_orders' },
      onFoodOrdersChange
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'rider_locations' },
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
