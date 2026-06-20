import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { getFoodOrderById, type FoodOrder } from '@/services/food-order-service';
import { subscribeToFoodOrderChanges } from '@/services/realtime-service';
import { hasSupabaseConfig } from '@/services/supabase';

type FoodOrderStatusContextValue = {
  currentFoodOrder: FoodOrder | null;
  currentFoodOrderId: string | null;
  setCurrentFoodOrder: (foodOrder: FoodOrder) => void;
  syncMessage: string;
};

const FoodOrderStatusContext = createContext<FoodOrderStatusContextValue | undefined>(undefined);

export function FoodOrderStatusProvider({ children }: { children: ReactNode }) {
  const [currentFoodOrder, setCurrentFoodOrderState] = useState<FoodOrder | null>(null);
  const [syncMessage, setSyncMessage] = useState('');

  const setCurrentFoodOrder = useCallback((foodOrder: FoodOrder) => {
    setCurrentFoodOrderState(foodOrder);
    setSyncMessage('');
  }, []);

  useEffect(() => {
    if (!currentFoodOrder?.id || !hasSupabaseConfig) {
      return;
    }

    let isMounted = true;

    async function syncFoodOrder() {
      if (!currentFoodOrder?.id) {
        return;
      }

      try {
        const latestFoodOrder = await getFoodOrderById(currentFoodOrder.id);

        if (isMounted) {
          setCurrentFoodOrderState(latestFoodOrder);
          setSyncMessage('');
        }
      } catch {
        if (isMounted) {
          setSyncMessage('Food order live status is temporarily unavailable.');
        }
      }
    }

    // Realtime gives fast updates, while polling below keeps the MVP resilient.
    const unsubscribe = subscribeToFoodOrderChanges(
      currentFoodOrder.id,
      (foodOrder) => {
        if (isMounted) {
          setCurrentFoodOrderState(foodOrder);
          setSyncMessage('');
        }
      },
      () => {
        if (isMounted) {
          setSyncMessage('Food order live status is temporarily unavailable.');
        }
      }
    );

    const interval = setInterval(syncFoodOrder, 5000);

    return () => {
      isMounted = false;
      unsubscribe();
      clearInterval(interval);
    };
  }, [currentFoodOrder?.id]);

  const value = useMemo<FoodOrderStatusContextValue>(
    () => ({
      currentFoodOrder,
      currentFoodOrderId: currentFoodOrder?.id ?? null,
      setCurrentFoodOrder,
      syncMessage,
    }),
    [currentFoodOrder, setCurrentFoodOrder, syncMessage]
  );

  return (
    <FoodOrderStatusContext.Provider value={value}>
      {children}
    </FoodOrderStatusContext.Provider>
  );
}

export function useFoodOrderStatus() {
  const context = useContext(FoodOrderStatusContext);

  if (!context) {
    throw new Error('useFoodOrderStatus must be used inside FoodOrderStatusProvider');
  }

  return context;
}
