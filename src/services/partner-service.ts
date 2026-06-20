import {
  sampleServiceCategories,
  sampleServiceSubcategories,
} from '@/services/category-service';
import { supabase, hasSupabaseConfig } from '@/services/supabase';
import type { Tables } from '@/types/database';

export type BusinessPartner = Tables<'business_partners'>;

export type BusinessPartnerListItem = BusinessPartner & {
  categoryName: string;
  categorySlug: string | null;
  subcategoryName: string;
  subcategorySlug: string | null;
};

export const sampleBusinessPartners: BusinessPartnerListItem[] = [
  createSamplePartner({
    categorySlug: 'restaurants-food',
    deliveryFeeLabel: 'PHP 50 delivery',
    description: 'Local cafe meals, coffee, rice meals, burgers, and cold drinks.',
    estimatedTime: '35-45 min',
    id: 'sample-partner-m-cafe',
    name: 'M Cafe',
    rating: 4.8,
    restaurantId: 'sample-m-cafe',
    subcategorySlug: 'coffee',
  }),
  createSamplePartner({
    categorySlug: 'restaurants-food',
    deliveryFeeLabel: 'PHP 60 delivery',
    description: 'Grilled favorites and local BBQ meals.',
    estimatedTime: '40-50 min',
    id: 'sample-partner-local-bbq-house',
    name: 'Local BBQ House',
    rating: 4.6,
    subcategorySlug: 'bbq-grill',
  }),
  createSamplePartner({
    categorySlug: 'groceries',
    deliveryFeeLabel: 'PHP 55 delivery',
    description: 'Daily essentials, snacks, drinks, and household items.',
    estimatedTime: '30-45 min',
    id: 'sample-partner-camotes-mini-mart',
    name: 'Camotes Mini Mart',
    rating: 4.7,
    subcategorySlug: 'mini-mart',
  }),
  createSamplePartner({
    categorySlug: 'medicine-pharmacy',
    deliveryFeeLabel: 'PHP 60 delivery',
    description: 'Medicine pickup, vitamins, first aid, and personal care.',
    estimatedTime: '35-50 min',
    id: 'sample-partner-island-pharmacy',
    name: 'Island Pharmacy',
    rating: 4.9,
    subcategorySlug: 'pharmacy',
  }),
  createSamplePartner({
    categorySlug: 'school-supplies',
    deliveryFeeLabel: 'PHP 45 delivery',
    description: 'Paper supplies, notebooks, printing materials, and school essentials.',
    estimatedTime: '30-40 min',
    id: 'sample-partner-school-supply-center',
    name: 'School Supply Center',
    rating: 4.5,
    subcategorySlug: 'paper-supplies',
  }),
  createSamplePartner({
    categorySlug: 'tours',
    deliveryFeeLabel: 'Custom trip rate',
    description: 'Island tour transport and local trip assistance.',
    estimatedTime: 'Schedule ahead',
    id: 'sample-partner-camotes-island-tour',
    name: 'Camotes Island Tour',
    rating: 4.9,
    subcategorySlug: 'island-tour',
  }),
];

export async function getBusinessPartnersByCategory(categoryId: string) {
  if (!hasSupabaseConfig || categoryId.startsWith('sample-category-')) {
    return sampleBusinessPartners.filter((partner) => partner.category_id === categoryId);
  }

  return fetchBusinessPartners({
    categoryId,
    column: 'category_id',
    fallback: sampleBusinessPartners.filter((partner) => partner.category_id === categoryId),
    value: categoryId,
  });
}

export async function getBusinessPartnersBySubcategory(subcategoryId: string) {
  if (!hasSupabaseConfig || subcategoryId.startsWith('sample-subcategory-')) {
    return sampleBusinessPartners.filter((partner) => partner.subcategory_id === subcategoryId);
  }

  return fetchBusinessPartners({
    column: 'subcategory_id',
    fallback: sampleBusinessPartners.filter((partner) => partner.subcategory_id === subcategoryId),
    subcategoryId,
    value: subcategoryId,
  });
}

export async function searchBusinessPartners(query: string) {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return [];
  }

  if (!hasSupabaseConfig) {
    return searchSamplePartners(normalizedQuery);
  }

  return fetchBusinessPartners({
    fallback: searchSamplePartners(normalizedQuery),
    searchQuery: normalizedQuery,
  });
}

export async function getBusinessPartnerById(id: string) {
  if (!hasSupabaseConfig || id.startsWith('sample-partner-')) {
    return sampleBusinessPartners.find((partner) => partner.id === id) ?? null;
  }

  const partners = await fetchBusinessPartners({
    column: 'id',
    fallback: sampleBusinessPartners.filter((partner) => partner.id === id),
    partnerId: id,
    value: id,
  });

  return partners[0] ?? null;
}

async function fetchBusinessPartners(meta: {
  categoryId?: string;
  column?: 'category_id' | 'id' | 'subcategory_id';
  fallback: BusinessPartnerListItem[];
  partnerId?: string;
  searchQuery?: string;
  subcategoryId?: string;
  value?: string;
}) {
  try {
    let query = supabase
      .from('business_partners')
      .select('*')
      .eq('is_active', true);

    if (meta.column && meta.value) {
      query = query.eq(meta.column, meta.value);
    }

    if (meta.searchQuery) {
      query = query.ilike('name', `%${meta.searchQuery}%`);
    }

    const { data, error } = await query
      .order('is_open', { ascending: false })
      .order('name', { ascending: true });

    if (error) {
      throw error;
    }

    return enrichPartners(data ?? []);
  } catch (error) {
    console.error('PARTNER_SHOP_FETCH_FAILED', {
      categoryId: meta.categoryId,
      error,
      partnerId: meta.partnerId,
      query: meta.searchQuery,
      subcategoryId: meta.subcategoryId,
    });
    return meta.fallback;
  }
}

async function enrichPartners(partners: BusinessPartner[]) {
  if (partners.length === 0) {
    return [];
  }

  const [categoryResult, subcategoryResult] = await Promise.all([
    supabase.from('service_categories').select('*'),
    supabase.from('service_subcategories').select('*'),
  ]);

  const categories = categoryResult.data ?? [];
  const subcategories = subcategoryResult.data ?? [];

  return partners.map((partner) => {
    const category = categories.find((item) => item.id === partner.category_id);
    const subcategory = subcategories.find((item) => item.id === partner.subcategory_id);

    return {
      ...partner,
      categoryName: category?.name ?? 'Marketplace',
      categorySlug: category?.slug ?? null,
      subcategoryName: subcategory?.name ?? 'Partner shop',
      subcategorySlug: subcategory?.slug ?? null,
    };
  });
}

function searchSamplePartners(query: string) {
  const normalizedQuery = query.toLowerCase();

  return sampleBusinessPartners.filter((partner) => {
    return (
      partner.name.toLowerCase().includes(normalizedQuery) ||
      (partner.description ?? '').toLowerCase().includes(normalizedQuery) ||
      partner.categoryName.toLowerCase().includes(normalizedQuery) ||
      partner.subcategoryName.toLowerCase().includes(normalizedQuery)
    );
  });
}

function createSamplePartner(input: {
  categorySlug: string;
  deliveryFeeLabel: string;
  description: string;
  estimatedTime: string;
  id: string;
  name: string;
  rating: number;
  restaurantId?: string;
  subcategorySlug: string;
}): BusinessPartnerListItem {
  const category = sampleServiceCategories.find((item) => item.slug === input.categorySlug);
  const subcategory = sampleServiceSubcategories.find(
    (item) => item.category_id === category?.id && item.slug === input.subcategorySlug
  );
  const now = new Date(0).toISOString();

  return {
    address: 'Camotes Island',
    business_hours: null,
    categoryName: category?.name ?? 'Marketplace',
    categorySlug: category?.slug ?? null,
    category_id: category?.id ?? null,
    created_at: now,
    delivery_fee_label: input.deliveryFeeLabel,
    description: input.description,
    estimated_time: input.estimatedTime,
    id: input.id,
    image_url: null,
    is_active: true,
    is_open: true,
    latitude: null,
    longitude: null,
    name: input.name,
    owner_email: null,
    owner_name: null,
    owner_phone: null,
    partner_notes: null,
    phone: null,
    rating: input.rating,
    restaurant_id: input.restaurantId ?? null,
    status: 'active',
    subcategoryName: subcategory?.name ?? 'Partner shop',
    subcategorySlug: subcategory?.slug ?? null,
    subcategory_id: subcategory?.id ?? null,
    updated_at: now,
  };
}
