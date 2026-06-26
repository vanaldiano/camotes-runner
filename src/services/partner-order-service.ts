import AsyncStorage from '@react-native-async-storage/async-storage';

import type { PartnerCartItem } from '@/services/partner-cart';
import type { BusinessPartnerListItem } from '@/services/partner-service';
import { hasSupabaseConfig, supabase } from '@/services/supabase';
import type { Json, Tables } from '@/types/database';

export type PartnerOrder = Tables<'partner_orders'>;
export type PartnerOrderItem = Tables<'partner_order_items'>;
export type PartnerOrderWithPartner = PartnerOrder & {
  is_stale?: boolean;
  partner_name: string;
};
export type CreatePartnerOrderResult = {
  order?: PartnerOrderWithPartner | null;
  orderId: string;
  success: true;
  trackingToken?: string | null;
};

export type CreatePartnerOrderInput = {
  customerId?: string | null;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  deliveryFee?: number | null;
  deliveryLat?: number | null;
  deliveryLng?: number | null;
  items: PartnerCartItem[];
  notes: string;
  partnerId: string;
  partnerName?: string | null;
  paymentMethod: string;
  paymentReference?: string | null;
  serviceFee?: number | null;
  totalAmount?: number | null;
};

type LocalPartnerOrderReference = {
  createdAt: string;
  orderId: string;
  partnerId: string;
  partnerName: string | null;
  trackingToken: string;
};

type PartnerOrderCreateRpcResult = {
  orderId: string;
  trackingToken: string | null;
};

const localPartnerOrderReferencesKey = 'camotes_runner.partner_order_refs.v1';
const maxLocalPartnerOrderReferences = 50;

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
    p_delivery_fee: normalizeAmount(input.deliveryFee),
    p_delivery_lat: normalizeCoordinate(input.deliveryLat),
    p_delivery_lng: normalizeCoordinate(input.deliveryLng),
    p_items: input.items.map((item) => ({
      product_id: item.id,
      quantity: item.quantity,
    })),
    p_notes: input.notes,
    p_partner_id: input.partnerId,
    p_payment_method: input.paymentMethod,
    p_payment_reference: normalizeOptionalText(input.paymentReference),
    p_service_fee: normalizeAmount(input.serviceFee),
    p_total_amount: normalizeAmount(input.totalAmount),
  });

  if (error) {
    throw error;
  }

  const createResult = getCreatePartnerOrderRpcResult(data);

  if (!createResult.orderId) {
    throw new Error('Supabase did not return the created partner order id.');
  }

  if (createResult.trackingToken) {
    await saveLocalPartnerOrderReference({
      createdAt: new Date().toISOString(),
      orderId: createResult.orderId,
      partnerId: input.partnerId,
      partnerName: input.partnerName ?? null,
      trackingToken: createResult.trackingToken,
    });
  }

  const order = await getPartnerOrderById(createResult.orderId).catch((error) => {
    if (__DEV__) {
      console.warn('PARTNER_ORDER_CREATED_RELOAD_SKIPPED', {
        error,
        orderId: createResult.orderId,
      });
    }

    return null;
  });

  return {
    order,
    orderId: createResult.orderId,
    success: true,
    trackingToken: createResult.trackingToken,
  };
}

export async function getPartnerOrderById(orderId: string) {
  if (!hasSupabaseConfig || orderId.startsWith('sample-partner-order-')) {
    return null;
  }

  let readError: unknown = null;

  try {
    const { data, error } = await supabase
      .from('partner_orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (data) {
      return (await withPartnerNames([data]))[0] ?? null;
    }
  } catch (error) {
    readError = error;

    if (__DEV__) {
      console.warn('PARTNER_ORDER_NORMAL_READ_SKIPPED', { error, orderId });
    }
  }

  const localReference = await getLocalPartnerOrderReference(orderId);

  if (localReference) {
    const tokenOrder = await getPartnerOrderByTrackingReference(localReference).catch((error) => {
      if (__DEV__) {
        console.warn('PARTNER_ORDER_TOKEN_READ_SKIPPED', { error, orderId });
      }

      return null;
    });

    if (tokenOrder) {
      return tokenOrder;
    }
  }

  if (readError) {
    throw readError;
  }

  return null;
}

export async function getPartnerOrderItems(orderId: string) {
  if (!hasSupabaseConfig || orderId.startsWith('sample-partner-order-')) {
    return [];
  }

  let readError: unknown = null;

  try {
    const { data, error } = await supabase
      .from('partner_order_items')
      .select('*')
      .eq('partner_order_id', orderId)
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    const directItems = data ?? [];

    if (directItems.length > 0) {
      return directItems;
    }
  } catch (error) {
    readError = error;

    if (__DEV__) {
      console.warn('PARTNER_ORDER_ITEMS_NORMAL_READ_SKIPPED', { error, orderId });
    }
  }

  const localReference = await getLocalPartnerOrderReference(orderId);

  if (localReference) {
    const tokenItems = await getPartnerOrderItemsByTrackingReference(localReference).catch((error) => {
      if (__DEV__) {
        console.warn('PARTNER_ORDER_ITEMS_TOKEN_READ_SKIPPED', { error, orderId });
      }

      return [];
    });

    if (tokenItems.length > 0) {
      return tokenItems;
    }
  }

  if (readError) {
    throw readError;
  }

  return [];
}

export async function getMyPartnerOrders(customerId?: string | null) {
  if (!hasSupabaseConfig) {
    return [];
  }

  let customerOrders: PartnerOrderWithPartner[] = [];

  if (customerId) {
    try {
      const { data, error } = await supabase
        .from('partner_orders')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      customerOrders = await withPartnerNames(data ?? []);
    } catch (error) {
      if (__DEV__) {
        console.warn('PARTNER_ACTIVITY_CUSTOMER_READ_SKIPPED', error);
      }
    }
  }

  const localOrders = await getLocalTrackedPartnerOrders();
  const byId = new Map<string, PartnerOrderWithPartner>();

  for (const order of [...customerOrders, ...localOrders]) {
    byId.set(order.id, order);
  }

  return [...byId.values()].sort((a, b) => (
    getPartnerOrderSortTime(b) - getPartnerOrderSortTime(a)
  ));
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

function normalizeCoordinate(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function normalizeAmount(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

function normalizeOptionalText(value: string | null | undefined) {
  const trimmedValue = value?.trim() ?? '';

  return trimmedValue || null;
}

async function withPartnerNames(orders: PartnerOrder[]): Promise<PartnerOrderWithPartner[]> {
  if (orders.length === 0) {
    return [];
  }

  const partnerIds = [...new Set(orders.map((order) => order.partner_id))];
  const { data: partners, error } = await supabase
    .from('business_partners')
    .select('id, name')
    .in('id', partnerIds);

  if (error) {
    throw error;
  }

  return orders.map((order) => ({
    ...order,
    partner_name:
      partners?.find((partner) => partner.id === order.partner_id)?.name ?? 'Partner shop',
  }));
}

function getCreatePartnerOrderRpcResult(data: Json | null): PartnerOrderCreateRpcResult {
  if (typeof data === 'string') {
    return {
      orderId: data,
      trackingToken: null,
    };
  }

  if (Array.isArray(data)) {
    return getCreatePartnerOrderRpcResult(data[0] ?? null);
  }

  if (!data || typeof data !== 'object') {
    return {
      orderId: '',
      trackingToken: null,
    };
  }

  const result = data as Record<string, Json | undefined>;
  const orderId = getStringValue(result.order_id) || getStringValue(result.orderId);
  const trackingToken =
    getStringValue(result.customer_tracking_token) || getStringValue(result.trackingToken);

  return {
    orderId,
    trackingToken: trackingToken || null,
  };
}

async function saveLocalPartnerOrderReference(reference: LocalPartnerOrderReference) {
  const references = await getLocalPartnerOrderReferences();
  const nextReferences = [
    reference,
    ...references.filter((item) => item.orderId !== reference.orderId),
  ].slice(0, maxLocalPartnerOrderReferences);

  await AsyncStorage.setItem(localPartnerOrderReferencesKey, JSON.stringify(nextReferences));
}

async function getLocalPartnerOrderReference(orderId: string) {
  const references = await getLocalPartnerOrderReferences();

  return references.find((reference) => reference.orderId === orderId) ?? null;
}

async function getLocalPartnerOrderReferences() {
  const rawReferences = await AsyncStorage.getItem(localPartnerOrderReferencesKey).catch(() => null);

  if (!rawReferences) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawReferences);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isLocalPartnerOrderReference);
  } catch {
    return [];
  }
}

async function getLocalTrackedPartnerOrders() {
  const references = await getLocalPartnerOrderReferences();
  const orders = await Promise.all(
    references.map(async (reference) => {
      const order = await getPartnerOrderByTrackingReference(reference).catch((error) => {
        if (__DEV__) {
          console.warn('LOCAL_PARTNER_ORDER_TOKEN_READ_SKIPPED', {
            error,
            orderId: reference.orderId,
          });
        }

        return getStalePartnerOrderFromReference(reference);
      });

      return order ?? getStalePartnerOrderFromReference(reference);
    })
  );

  return orders.filter((order): order is PartnerOrderWithPartner => Boolean(order));
}

async function getPartnerOrderByTrackingReference(reference: LocalPartnerOrderReference) {
  const { data, error } = await supabase.rpc('get_partner_order_by_tracking_token', {
    p_order_id: reference.orderId,
    p_tracking_token: reference.trackingToken,
  });

  if (error) {
    throw error;
  }

  const order = normalizePartnerOrderWithPartner(data);

  if (order) {
    return order;
  }

  return null;
}

async function getPartnerOrderItemsByTrackingReference(reference: LocalPartnerOrderReference) {
  const { data, error } = await supabase.rpc('get_partner_order_items_by_tracking_token', {
    p_order_id: reference.orderId,
    p_tracking_token: reference.trackingToken,
  });

  if (error) {
    throw error;
  }

  if (!Array.isArray(data)) {
    return [];
  }

  return data.filter(isPartnerOrderItem);
}

function normalizePartnerOrderWithPartner(data: Json | null): PartnerOrderWithPartner | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return null;
  }

  const order = data as Partial<PartnerOrderWithPartner>;

  if (!order.id || !order.partner_id || !order.created_at || !order.status) {
    return null;
  }

  return {
    ...order,
    partner_name: order.partner_name ?? 'Partner shop',
  } as PartnerOrderWithPartner;
}

function getStalePartnerOrderFromReference(
  reference: LocalPartnerOrderReference
): PartnerOrderWithPartner {
  return {
    accepted_at: null,
    assigned_at: null,
    assigned_rider_id: null,
    cancelled_at: null,
    completed_at: null,
    created_at: reference.createdAt,
    customer_id: null,
    customer_name: null,
    customer_phone: null,
    customer_tracking_token: reference.trackingToken,
    customer_tracking_token_created_at: reference.createdAt,
    delivery_address: null,
    delivery_fee: 0,
    delivery_lat: null,
    delivery_lng: null,
    id: reference.orderId,
    is_stale: true,
    notes: null,
    partner_id: reference.partnerId,
    partner_name: reference.partnerName ?? 'Partner shop',
    partner_status: 'new',
    payment_confirmed_at: null,
    payment_confirmed_by: null,
    payment_method: 'GCash',
    payment_notes: null,
    payment_proof_path: null,
    payment_proof_url: null,
    payment_reference: null,
    payment_status: 'pending_payment',
    payment_submitted_at: null,
    rider_status: null,
    service_fee: 0,
    status: 'pending',
    subtotal: 0,
    total_amount: 0,
    updated_at: reference.createdAt,
  };
}

function getPartnerOrderSortTime(order: PartnerOrderWithPartner) {
  const updatedTime = new Date(order.updated_at ?? order.created_at).getTime();

  if (Number.isFinite(updatedTime)) {
    return updatedTime;
  }

  return new Date(order.created_at).getTime();
}

function isPartnerOrderItem(value: Json): value is PartnerOrderItem {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const item = value as Partial<PartnerOrderItem>;

  return (
    typeof item.id === 'string' &&
    typeof item.partner_order_id === 'string' &&
    typeof item.product_name === 'string'
  );
}

function isLocalPartnerOrderReference(value: unknown): value is LocalPartnerOrderReference {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const reference = value as Partial<LocalPartnerOrderReference>;

  return (
    typeof reference.createdAt === 'string' &&
    typeof reference.orderId === 'string' &&
    typeof reference.partnerId === 'string' &&
    typeof reference.trackingToken === 'string'
  );
}

function getStringValue(value: Json | undefined) {
  return typeof value === 'string' ? value : '';
}
