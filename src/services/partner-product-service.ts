import { sampleBusinessPartners } from '@/services/partner-service';
import { hasSupabaseConfig, supabase } from '@/services/supabase';
import type { Tables } from '@/types/database';

export type PartnerProduct = Tables<'partner_products'>;

export const samplePartnerProducts: PartnerProduct[] = [
  createSampleProduct('sample-partner-m-cafe', 'Iced Coffee', 95, 'Cold local cafe coffee.', 'cup', 10),
  createSampleProduct('sample-partner-m-cafe', 'Burger Meal', 180, 'Burger with side and drink.', 'meal', 20),
  createSampleProduct('sample-partner-m-cafe', 'Rice Meal', 160, 'Rice meal with local favorite viand.', 'meal', 30),
  createSampleProduct(
    'sample-partner-camotes-mini-mart',
    'Bottled Water',
    25,
    'Drinking water for delivery.',
    'bottle',
    10
  ),
  createSampleProduct(
    'sample-partner-camotes-mini-mart',
    'Soft Drinks',
    45,
    'Assorted cold soft drinks.',
    'bottle',
    20
  ),
  createSampleProduct(
    'sample-partner-camotes-mini-mart',
    'Rice 1kg',
    70,
    'Packed rice for home essentials.',
    '1kg',
    30
  ),
  createSampleProduct('sample-partner-island-pharmacy', 'Paracetamol', 8, 'Basic pain and fever relief.', 'tablet', 10),
  createSampleProduct('sample-partner-island-pharmacy', 'Vitamin C', 6, 'Daily vitamin supplement.', 'tablet', 20),
  createSampleProduct('sample-partner-school-supply-center', 'Notebook', 35, 'School notebook.', 'piece', 10),
  createSampleProduct('sample-partner-school-supply-center', 'Ballpen', 12, 'Writing pen for school and office.', 'piece', 20),
  createSampleProduct(
    'sample-partner-camotes-island-tour',
    'Island Tour Package',
    1500,
    'Local island tour arrangement.',
    'package',
    10
  ),
];

export async function getPartnerProducts(partnerId: string) {
  return fetchPartnerProducts({
    fallback: samplePartnerProducts.filter((product) => product.partner_id === partnerId),
    partnerId,
  });
}

export async function getAvailablePartnerProducts(partnerId: string) {
  return fetchPartnerProducts({
    availableOnly: true,
    fallback: samplePartnerProducts.filter(
      (product) =>
        product.partner_id === partnerId && product.is_active && product.is_available
    ),
    partnerId,
  });
}

export async function getPartnerProductById(productId: string) {
  if (!hasSupabaseConfig || productId.startsWith('sample-product-')) {
    return samplePartnerProducts.find((product) => product.id === productId) ?? null;
  }

  try {
    const { data, error } = await supabase
      .from('partner_products')
      .select('*')
      .eq('id', productId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('PARTNER_PRODUCT_FETCH_FAILED', { error, productId });
    return samplePartnerProducts.find((product) => product.id === productId) ?? null;
  }
}

export async function searchPartnerProducts(partnerId: string, query: string) {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return [];
  }

  return fetchPartnerProducts({
    availableOnly: true,
    fallback: searchSampleProducts(partnerId, normalizedQuery),
    partnerId,
    searchQuery: normalizedQuery,
  });
}

async function fetchPartnerProducts(meta: {
  availableOnly?: boolean;
  fallback: PartnerProduct[];
  partnerId: string;
  searchQuery?: string;
}) {
  if (!hasSupabaseConfig || meta.partnerId.startsWith('sample-partner-')) {
    return meta.fallback;
  }

  try {
    let query = supabase
      .from('partner_products')
      .select('*')
      .eq('partner_id', meta.partnerId);

    if (meta.availableOnly) {
      query = query.eq('is_active', true).eq('is_available', true);
    }

    if (meta.searchQuery) {
      query = query.ilike('name', `%${meta.searchQuery}%`);
    }

    const { data, error } = await query
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      throw error;
    }

    return data ?? [];
  } catch (error) {
    console.error('PARTNER_PRODUCTS_FETCH_FAILED', {
      error,
      partnerId: meta.partnerId,
      query: meta.searchQuery,
    });
    return meta.fallback;
  }
}

function searchSampleProducts(partnerId: string, query: string) {
  const normalizedQuery = query.toLowerCase();

  return samplePartnerProducts.filter((product) => {
    return (
      product.partner_id === partnerId &&
      product.is_active &&
      product.is_available &&
      (product.name.toLowerCase().includes(normalizedQuery) ||
        (product.description ?? '').toLowerCase().includes(normalizedQuery))
    );
  });
}

function createSampleProduct(
  partnerId: string,
  name: string,
  price: number,
  description: string,
  unitLabel: string,
  sortOrder: number
): PartnerProduct {
  const partner = sampleBusinessPartners.find((item) => item.id === partnerId);
  const now = new Date(0).toISOString();

  return {
    category_id: partner?.category_id ?? null,
    created_at: now,
    description,
    id: `sample-product-${partnerId}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    image_path: null,
    image_url: null,
    is_active: true,
    is_available: true,
    name,
    partner_id: partnerId,
    price,
    sku: null,
    sort_order: sortOrder,
    subcategory_id: partner?.subcategory_id ?? null,
    unit_label: unitLabel,
    updated_at: now,
  };
}
