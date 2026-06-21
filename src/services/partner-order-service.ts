import type { PartnerCartItem } from '@/services/partner-cart';
import type { BusinessPartnerListItem } from '@/services/partner-service';
import { hasSupabaseConfig, supabase } from '@/services/supabase';
import type { Tables } from '@/types/database';

export type PartnerOrder = Tables<'partner_orders'>;
export type PartnerOrderItem = Tables<'partner_order_items'>;
export type PartnerOrderWithPartner = PartnerOrder & {
  partner_name: string;
};
export type CreatePartnerOrderResult = {
  order?: PartnerOrder | null;
  orderId: string;
  success: true;
};

export type CreatePartnerOrderInput = {
  customerId?: string | null;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  deliveryLat?: number | null;
  deliveryLng?: number | null;
  items: PartnerCartItem[];
  notes: string;
  partnerId: string;
  paymentMethod: string;
};

export function calculatePartnerOrderTotals(
  items: Pick<PartnerCartItem, 'price' | 'quantity'>[],
  partner: Pick<BusinessPartnerListItem, 'delivery_fee_label'> | null
) {
  const subtotal = items.reduce((total, item) => total + item.price * item.quantity, 0);
  const deliveryFee = getPartnerDeliveryFee(partner?.delivery_fee_label ?? null);
  const serviceFee = 0;

  return {
    deliveryFee,
    serviceFee,
    subtotal,
    totalAmount: subtotal + deliveryFee + serviceFee,
  };
}

export async function createPartnerOrder(
  input: CreatePartnerOrderInput
): Promise<CreatePartnerOrderResult> {
  if (!hasSupabaseConfig) {
    throw new Error('Partner checkout needs Supabase connection.');
  }

  if (input.items.length === 0) {
    throw new Error('Your partner cart is empty.');
  }

  const { data, error } = await supabase.rpc('create_partner_order_with_items', {
    p_customer_id: input.customerId ?? null,
    p_customer_name: input.customerName,
    p_customer_phone: input.customerPhone,
    p_delivery_address: input.deliveryAddress,
    p_delivery_lat: input.deliveryLat ?? null,
    p_delivery_lng: input.deliveryLng ?? null,
    p_items: input.items.map((item) => ({
      product_id: item.id,
      quantity: item.quantity,
    })),
    p_notes: input.notes,
    p_partner_id: input.partnerId,
    p_payment_method: input.paymentMethod,
  });

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error('Supabase did not return the created partner order id.');
  }

  const order = await getPartnerOrderById(data).catch((error) => {
    if (__DEV__) {
      console.warn('PARTNER_ORDER_CREATED_RELOAD_SKIPPED', {
        error,
        orderId: data,
      });
    }

    return null;
  });

  return {
    order,
    orderId: data,
    success: true,
  };
}

export async function getPartnerOrderById(orderId: string) {
  if (!hasSupabaseConfig || orderId.startsWith('sample-partner-order-')) {
    return null;
  }

  const { data, error } = await supabase
    .from('partner_orders')
    .select('*')
    .eq('id', orderId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function getPartnerOrderItems(orderId: string) {
  if (!hasSupabaseConfig || orderId.startsWith('sample-partner-order-')) {
    return [];
  }

  const { data, error } = await supabase
    .from('partner_order_items')
    .select('*')
    .eq('partner_order_id', orderId)
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getMyPartnerOrders(customerId: string) {
  if (!hasSupabaseConfig) {
    return [];
  }

  const { data, error } = await supabase
    .from('partner_orders')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

function getPartnerDeliveryFee(deliveryFeeLabel: string | null) {
  const numericMatch = deliveryFeeLabel?.match(/(\d+(?:\.\d+)?)/);

  if (numericMatch) {
    return Number(numericMatch[1]);
  }

  const baseDeliveryFee = 40;
  const minimumDeliveryFee = 50;

  return Math.max(baseDeliveryFee, minimumDeliveryFee);
}
