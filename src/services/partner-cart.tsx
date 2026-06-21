import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { Alert } from 'react-native';

import type { PartnerProduct } from '@/services/partner-product-service';
import type { BusinessPartnerListItem } from '@/services/partner-service';

export type PartnerCartItem = {
  description: string | null;
  id: string;
  imageUrl: string | null;
  name: string;
  partnerDeliveryFeeLabel: string | null;
  partnerId: string;
  partnerName: string;
  price: number;
  quantity: number;
  unitLabel: string | null;
};

type AddPartnerCartItemInput = {
  partner: BusinessPartnerListItem;
  product: PartnerProduct;
};

type PartnerCartContextValue = {
  addItem: (input: AddPartnerCartItemInput) => void;
  cartSubtotal: number;
  clearCart: () => void;
  decreaseQuantity: (itemId: string) => void;
  increaseQuantity: (itemId: string) => void;
  itemCount: number;
  items: PartnerCartItem[];
  partnerDeliveryFeeLabel: string | null;
  partnerId: string | null;
  partnerName: string;
  removeItem: (itemId: string) => void;
};

const PartnerCartContext = createContext<PartnerCartContextValue | undefined>(undefined);

export function PartnerCartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<PartnerCartItem[]>([]);

  const addItem = useCallback((input: AddPartnerCartItemInput) => {
    const currentPartnerId = items[0]?.partnerId;

    if (currentPartnerId && currentPartnerId !== input.partner.id) {
      Alert.alert('Clear cart and start a new partner order?', '', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Cart',
          style: 'destructive',
          onPress: () => setItems([createCartItem(input)]),
        },
      ]);
      return;
    }

    setItems((currentItems) => {
      const existingItem = currentItems.find((cartItem) => cartItem.id === input.product.id);

      if (existingItem) {
        return currentItems.map((cartItem) =>
          cartItem.id === input.product.id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      }

      return [...currentItems, createCartItem(input)];
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

  const value = useMemo<PartnerCartContextValue>(() => {
    const cartSubtotal = items.reduce((subtotal, item) => subtotal + item.price * item.quantity, 0);
    const itemCount = items.reduce((count, item) => count + item.quantity, 0);

    return {
      addItem,
      cartSubtotal,
      clearCart,
      decreaseQuantity,
      increaseQuantity,
      itemCount,
      items,
      partnerDeliveryFeeLabel: items[0]?.partnerDeliveryFeeLabel ?? null,
      partnerId: items[0]?.partnerId ?? null,
      partnerName: items[0]?.partnerName ?? '',
      removeItem,
    };
  }, [addItem, clearCart, decreaseQuantity, increaseQuantity, items, removeItem]);

  return <PartnerCartContext.Provider value={value}>{children}</PartnerCartContext.Provider>;
}

export function usePartnerCart() {
  const context = useContext(PartnerCartContext);

  if (!context) {
    throw new Error('usePartnerCart must be used inside PartnerCartProvider');
  }

  return context;
}

function createCartItem({ partner, product }: AddPartnerCartItemInput): PartnerCartItem {
  return {
    description: product.description,
    id: product.id,
    imageUrl: product.image_url,
    name: product.name,
    partnerDeliveryFeeLabel: partner.delivery_fee_label,
    partnerId: partner.id,
    partnerName: partner.name,
    price: Number(product.price ?? 0),
    quantity: 1,
    unitLabel: product.unit_label,
  };
}
