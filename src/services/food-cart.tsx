import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { Alert } from 'react-native';

export type FoodCartItem = {
  description: string;
  id: string;
  name: string;
  price: string;
  quantity: number;
  restaurantId: string;
  restaurantLatitude: number | null;
  restaurantLongitude: number | null;
  restaurantName: string;
  unitPrice: number;
};

type AddFoodCartItemInput = Omit<FoodCartItem, 'quantity'>;

type FoodCartContextValue = {
  addItem: (item: AddFoodCartItemInput) => void;
  cartSubtotal: number;
  clearCart: () => void;
  decreaseQuantity: (itemId: string) => void;
  deliveryFee: number;
  increaseQuantity: (itemId: string) => void;
  itemCount: number;
  items: FoodCartItem[];
  removeItem: (itemId: string) => void;
  restaurantId: string | null;
  restaurantLatitude: number | null;
  restaurantLongitude: number | null;
  restaurantName: string;
  total: number;
};

const FoodCartContext = createContext<FoodCartContextValue | undefined>(undefined);

export function FoodCartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<FoodCartItem[]>([]);

  const addItem = useCallback((item: AddFoodCartItemInput) => {
    const currentRestaurantId = items[0]?.restaurantId;

    if (currentRestaurantId && currentRestaurantId !== item.restaurantId) {
      Alert.alert('Clear cart and start a new order?', '', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Cart',
          style: 'destructive',
          onPress: () => setItems([{ ...item, quantity: 1 }]),
        },
      ]);
      return;
    }

    setItems((currentItems) => {
      const existingItem = currentItems.find((cartItem) => cartItem.id === item.id);

      if (existingItem) {
        return currentItems.map((cartItem) =>
          cartItem.id === item.id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      }

      return [...currentItems, { ...item, quantity: 1 }];
    });
  }, [items]);

  const removeItem = useCallback((itemId: string) => {
    setItems((currentItems) => currentItems.filter((item) => item.id !== itemId));
  }, []);

  const increaseQuantity = useCallback((itemId: string) => {
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === itemId ? { ...item, quantity: item.quantity + 1 } : item
      )
    );
  }, []);

  const decreaseQuantity = useCallback((itemId: string) => {
    setItems((currentItems) =>
      currentItems
        .map((item) =>
          item.id === itemId ? { ...item, quantity: Math.max(item.quantity - 1, 0) } : item
        )
        .filter((item) => item.quantity > 0)
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const value = useMemo<FoodCartContextValue>(() => {
    const cartSubtotal = items.reduce(
      (subtotal, item) => subtotal + item.unitPrice * item.quantity,
      0
    );
    const itemCount = items.reduce((count, item) => count + item.quantity, 0);
    const deliveryFee = 0;

    return {
      addItem,
      cartSubtotal,
      clearCart,
      decreaseQuantity,
      deliveryFee,
      increaseQuantity,
      itemCount,
      items,
      removeItem,
      restaurantId: items[0]?.restaurantId ?? null,
      restaurantLatitude: items[0]?.restaurantLatitude ?? null,
      restaurantLongitude: items[0]?.restaurantLongitude ?? null,
      restaurantName: items[0]?.restaurantName ?? '',
      total: cartSubtotal + deliveryFee,
    };
  }, [addItem, clearCart, decreaseQuantity, increaseQuantity, items, removeItem]);

  return <FoodCartContext.Provider value={value}>{children}</FoodCartContext.Provider>;
}

export function useFoodCart() {
  const context = useContext(FoodCartContext);

  if (!context) {
    throw new Error('useFoodCart must be used inside FoodCartProvider');
  }

  return context;
}
