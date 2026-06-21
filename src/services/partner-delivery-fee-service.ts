import { calculateDistanceKm } from '@/services/eta-service';
import type { BusinessPartnerListItem } from '@/services/partner-service';
import { hasSupabaseConfig, supabase } from '@/services/supabase';
import type { Tables } from '@/types/database';

export type PartnerDeliveryRateProfile = Tables<'partner_delivery_rate_profiles'>;

export type PartnerDeliveryFeeCalculation = {
  deliveryFee: number;
  distanceKm: number | null;
  isManualQuote: boolean;
  rateProfile: PartnerDeliveryRateProfile | null;
  serviceFee: number;
  subtotal: number;
  totalAmount: number;
};

type CalculatePartnerDeliveryFeeInput = {
  categoryId?: string | null;
  deliveryLat?: number | null;
  deliveryLng?: number | null;
  partner: BusinessPartnerListItem | null;
  partnerId: string;
  subtotal: number;
  subcategoryId?: string | null;
};

const defaultDeliveryFee = 50;

const localRateProfilesByCategorySlug: Record<
  string,
  Omit<PartnerDeliveryRateProfile, 'category_id' | 'created_at' | 'id' | 'partner_id' | 'subcategory_id' | 'updated_at'>
> = {
  errands: {
    base_fee: 80,
    base_km: 2,
    is_active: true,
    is_manual_quote: false,
    minimum_fee: 80,
    name: 'Errands / Personal Shopping',
    per_km_fee: 10,
    service_fee: 30,
    service_type: 'errands',
  },
  groceries: {
    base_fee: 60,
    base_km: 2,
    is_active: true,
    is_manual_quote: false,
    minimum_fee: 70,
    name: 'Grocery / Mini Mart Delivery',
    per_km_fee: 10,
    service_fee: 0,
    service_type: 'grocery',
  },
  'medicine-pharmacy': {
    base_fee: 60,
    base_km: 2,
    is_active: true,
    is_manual_quote: false,
    minimum_fee: 60,
    name: 'Medicine / Pharmacy Delivery',
    per_km_fee: 10,
    service_fee: 0,
    service_type: 'medicine',
  },
  'restaurants-food': {
    base_fee: 50,
    base_km: 2,
    is_active: true,
    is_manual_quote: false,
    minimum_fee: 50,
    name: 'Food / Restaurant Delivery',
    per_km_fee: 8,
    service_fee: 0,
    service_type: 'food',
  },
  'school-supplies': {
    base_fee: 60,
    base_km: 2,
    is_active: true,
    is_manual_quote: false,
    minimum_fee: 60,
    name: 'School Supplies Delivery',
    per_km_fee: 8,
    service_fee: 0,
    service_type: 'school_supplies',
  },
  tours: {
    base_fee: 0,
    base_km: 0,
    is_active: true,
    is_manual_quote: true,
    minimum_fee: 0,
    name: 'Tours / Special Trip Quote',
    per_km_fee: 0,
    service_fee: 0,
    service_type: 'manual_quote',
  },
};

const heavyBulkySubcategorySlugs = new Set(['delivery-assistance', 'household-items']);

export async function getPartnerDeliveryRate(
  partnerId: string,
  categoryId?: string | null,
  subcategoryId?: string | null
) {
  if (!hasSupabaseConfig) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('partner_delivery_rate_profiles')
      .select('*')
      .eq('is_active', true)
      .or(
        [
          `partner_id.eq.${partnerId}`,
          subcategoryId ? `subcategory_id.eq.${subcategoryId}` : '',
          categoryId ? `category_id.eq.${categoryId}` : '',
        ]
          .filter(Boolean)
          .join(',')
      );

    if (error) {
      throw error;
    }

    return pickBestRateProfile(data ?? [], partnerId, categoryId, subcategoryId);
  } catch (error) {
    if (__DEV__) {
      console.warn('PARTNER_DELIVERY_RATE_FETCH_FAILED', {
        categoryId,
        error,
        partnerId,
        subcategoryId,
      });
    }

    return null;
  }
}

export async function calculatePartnerDeliveryFee({
  categoryId,
  deliveryLat,
  deliveryLng,
  partner,
  partnerId,
  subtotal,
  subcategoryId,
}: CalculatePartnerDeliveryFeeInput): Promise<PartnerDeliveryFeeCalculation> {
  const databaseRate = await getPartnerDeliveryRate(partnerId, categoryId, subcategoryId);
  const rateProfile = databaseRate ?? getLocalRateProfile(partner);
  const distanceKm = getDistanceKm(
    partner?.latitude ?? null,
    partner?.longitude ?? null,
    deliveryLat,
    deliveryLng
  );
  const deliveryFee = getDeliveryFee({
    deliveryFeeLabel: partner?.delivery_fee_label ?? null,
    distanceKm,
    rateProfile,
  });
  const serviceFee = rateProfile ? Math.max(Number(rateProfile.service_fee ?? 0), 0) : 0;

  return {
    deliveryFee,
    distanceKm,
    isManualQuote: Boolean(rateProfile?.is_manual_quote),
    rateProfile,
    serviceFee,
    subtotal,
    totalAmount: subtotal + deliveryFee + serviceFee,
  };
}

export function getDistanceKm(
  partnerLat: number | null | undefined,
  partnerLng: number | null | undefined,
  deliveryLat: number | null | undefined,
  deliveryLng: number | null | undefined
) {
  return calculateDistanceKm(partnerLat, partnerLng, deliveryLat, deliveryLng);
}

export function getFallbackPartnerDeliveryFee(deliveryFeeLabel: string | null | undefined) {
  const labelFee = parseDeliveryFeeLabel(deliveryFeeLabel);

  return labelFee ?? defaultDeliveryFee;
}

function getDeliveryFee({
  deliveryFeeLabel,
  distanceKm,
  rateProfile,
}: {
  deliveryFeeLabel: string | null;
  distanceKm: number | null;
  rateProfile: PartnerDeliveryRateProfile | null;
}) {
  if (rateProfile?.is_manual_quote) {
    return 0;
  }

  if (rateProfile && typeof distanceKm === 'number' && Number.isFinite(distanceKm)) {
    const rawFee = Math.max(
      Number(rateProfile.minimum_fee),
      Number(rateProfile.base_fee) +
        Math.max(0, distanceKm - Number(rateProfile.base_km)) * Number(rateProfile.per_km_fee)
    );

    return roundToNearestFive(rawFee);
  }

  if (rateProfile) {
    return Math.max(
      getFallbackPartnerDeliveryFee(deliveryFeeLabel),
      Number(rateProfile.minimum_fee ?? defaultDeliveryFee)
    );
  }

  return getFallbackPartnerDeliveryFee(deliveryFeeLabel);
}

function getLocalRateProfile(partner: BusinessPartnerListItem | null): PartnerDeliveryRateProfile | null {
  if (!partner) {
    return null;
  }

  const localProfile = heavyBulkySubcategorySlugs.has(partner.subcategorySlug ?? '')
    ? {
        base_fee: 100,
        base_km: 2,
        is_active: true,
        is_manual_quote: false,
        minimum_fee: 100,
        name: 'Heavy / Bulky Delivery',
        per_km_fee: 15,
        service_fee: 0,
        service_type: 'heavy_bulky',
      }
    : localRateProfilesByCategorySlug[partner.categorySlug ?? ''];

  if (!localProfile) {
    return null;
  }

  const now = new Date(0).toISOString();

  return {
    ...localProfile,
    category_id: partner.category_id ?? null,
    created_at: now,
    id: `local-rate-${localProfile.service_type}`,
    partner_id: null,
    subcategory_id: partner.subcategory_id ?? null,
    updated_at: now,
  };
}

function pickBestRateProfile(
  profiles: PartnerDeliveryRateProfile[],
  partnerId: string,
  categoryId?: string | null,
  subcategoryId?: string | null
) {
  return profiles.sort((a, b) => (
    getRateProfilePriority(a, partnerId, categoryId, subcategoryId) -
    getRateProfilePriority(b, partnerId, categoryId, subcategoryId)
  ))[0] ?? null;
}

function getRateProfilePriority(
  profile: PartnerDeliveryRateProfile,
  partnerId: string,
  categoryId?: string | null,
  subcategoryId?: string | null
) {
  if (profile.partner_id === partnerId) {
    return 1;
  }

  if (profile.subcategory_id && profile.subcategory_id === subcategoryId) {
    return 2;
  }

  if (profile.category_id && profile.category_id === categoryId) {
    return 3;
  }

  return 4;
}

function parseDeliveryFeeLabel(deliveryFeeLabel: string | null | undefined) {
  const numericMatch = deliveryFeeLabel?.match(/(\d+(?:\.\d+)?)/);

  return numericMatch ? Number(numericMatch[1]) : null;
}

function roundToNearestFive(value: number) {
  return Math.round(value / 5) * 5;
}
