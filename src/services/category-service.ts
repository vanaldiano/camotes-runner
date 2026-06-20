import { supabase, hasSupabaseConfig } from '@/services/supabase';
import type { Tables } from '@/types/database';

export type ServiceCategory = Tables<'service_categories'>;
export type ServiceSubcategory = Tables<'service_subcategories'>;

export const sampleServiceCategories: ServiceCategory[] = [
  {
    created_at: new Date(0).toISOString(),
    description: 'Meals, snacks, drinks, and local food delivery.',
    icon: 'restaurant',
    id: 'sample-category-restaurants-food',
    is_active: true,
    name: 'Restaurants / Food',
    slug: 'restaurants-food',
    sort_order: 1,
    updated_at: new Date(0).toISOString(),
  },
  {
    created_at: new Date(0).toISOString(),
    description: 'Everyday store pickup and delivery.',
    icon: 'shopping_basket',
    id: 'sample-category-groceries',
    is_active: true,
    name: 'Groceries',
    slug: 'groceries',
    sort_order: 2,
    updated_at: new Date(0).toISOString(),
  },
  {
    created_at: new Date(0).toISOString(),
    description: 'Medicine, vitamins, and pharmacy assistance.',
    icon: 'medical_services',
    id: 'sample-category-medicine-pharmacy',
    is_active: true,
    name: 'Medicine / Pharmacy',
    slug: 'medicine-pharmacy',
    sort_order: 3,
    updated_at: new Date(0).toISOString(),
  },
  {
    created_at: new Date(0).toISOString(),
    description: 'Printing, paper, books, and class essentials.',
    icon: 'edit_note',
    id: 'sample-category-school-supplies',
    is_active: true,
    name: 'School Supplies',
    slug: 'school-supplies',
    sort_order: 4,
    updated_at: new Date(0).toISOString(),
  },
  {
    created_at: new Date(0).toISOString(),
    description: 'Island tours, transport, and travel help.',
    icon: 'beach_access',
    id: 'sample-category-tours',
    is_active: true,
    name: 'Tours',
    slug: 'tours',
    sort_order: 5,
    updated_at: new Date(0).toISOString(),
  },
  {
    created_at: new Date(0).toISOString(),
    description: 'Document pickup, bills payment, shopping, and delivery help.',
    icon: 'package_2',
    id: 'sample-category-errands',
    is_active: true,
    name: 'Errands',
    slug: 'errands',
    sort_order: 6,
    updated_at: new Date(0).toISOString(),
  },
  {
    created_at: new Date(0).toISOString(),
    description: 'Motorcycle rides and special trips around Camotes.',
    icon: 'two_wheeler',
    id: 'sample-category-ride',
    is_active: true,
    name: 'Ride',
    slug: 'ride',
    sort_order: 7,
    updated_at: new Date(0).toISOString(),
  },
];

export const sampleServiceSubcategories: ServiceSubcategory[] = [
  createSampleSubcategory('restaurants-food', 'Fast Food', 'fast-food', 1),
  createSampleSubcategory('restaurants-food', 'Milk Tea', 'milk-tea', 2),
  createSampleSubcategory('restaurants-food', 'Coffee', 'coffee', 3),
  createSampleSubcategory('restaurants-food', 'BBQ / Grill', 'bbq-grill', 4),
  createSampleSubcategory('restaurants-food', 'Carinderia', 'carinderia', 5),
  createSampleSubcategory('restaurants-food', 'Bakery', 'bakery', 6),
  createSampleSubcategory('restaurants-food', 'Snacks', 'snacks', 7),
  createSampleSubcategory('restaurants-food', 'Seafood', 'seafood', 8),
  createSampleSubcategory('groceries', 'Mini Mart', 'mini-mart', 1),
  createSampleSubcategory('groceries', 'Sari-sari Store', 'sari-sari-store', 2),
  createSampleSubcategory('groceries', 'Drinks', 'drinks', 3),
  createSampleSubcategory('groceries', 'Frozen Goods', 'frozen-goods', 4),
  createSampleSubcategory('groceries', 'Fresh Produce', 'fresh-produce', 5),
  createSampleSubcategory('groceries', 'Household Items', 'household-items', 6),
  createSampleSubcategory('medicine-pharmacy', 'Pharmacy', 'pharmacy', 1),
  createSampleSubcategory('medicine-pharmacy', 'Vitamins', 'vitamins', 2),
  createSampleSubcategory('medicine-pharmacy', 'First Aid', 'first-aid', 3),
  createSampleSubcategory('medicine-pharmacy', 'Personal Care', 'personal-care', 4),
  createSampleSubcategory('medicine-pharmacy', 'Baby Care', 'baby-care', 5),
  createSampleSubcategory('school-supplies', 'Printing', 'printing', 1),
  createSampleSubcategory('school-supplies', 'Books', 'books', 2),
  createSampleSubcategory('school-supplies', 'Paper Supplies', 'paper-supplies', 3),
  createSampleSubcategory('school-supplies', 'Art Materials', 'art-materials', 4),
  createSampleSubcategory('school-supplies', 'Uniforms', 'uniforms', 5),
  createSampleSubcategory('school-supplies', 'Electronics Accessories', 'electronics-accessories', 6),
  createSampleSubcategory('tours', 'Island Tour', 'island-tour', 1),
  createSampleSubcategory('tours', 'Motor Rental', 'motor-rental', 2),
  createSampleSubcategory('tours', 'Boat Tour', 'boat-tour', 3),
  createSampleSubcategory('tours', 'Accommodation', 'accommodation', 4),
  createSampleSubcategory('tours', 'Tour Guide', 'tour-guide', 5),
  createSampleSubcategory('errands', 'Document Pickup', 'document-pickup', 1),
  createSampleSubcategory('errands', 'Bills Payment', 'bills-payment', 2),
  createSampleSubcategory('errands', 'Personal Shopping', 'personal-shopping', 3),
  createSampleSubcategory('errands', 'Delivery Assistance', 'delivery-assistance', 4),
  createSampleSubcategory('ride', 'Motorcycle Ride', 'motorcycle-ride', 1),
  createSampleSubcategory('ride', 'Multicab / Van', 'multicab-van', 2),
  createSampleSubcategory('ride', 'Special Trip', 'special-trip', 3),
];

export async function getServiceCategories() {
  if (!hasSupabaseConfig) {
    return sampleServiceCategories;
  }

  try {
    const { data, error } = await supabase
      .from('service_categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      throw error;
    }

    return data && data.length > 0 ? data : sampleServiceCategories;
  } catch (error) {
    console.error('SERVICE_CATEGORIES_FETCH_FAILED', error);
    return sampleServiceCategories;
  }
}

export async function getSubcategoriesByCategory(categoryId: string) {
  if (!hasSupabaseConfig || categoryId.startsWith('sample-category-')) {
    return getSampleSubcategoriesByCategory(categoryId);
  }

  try {
    const { data, error } = await supabase
      .from('service_subcategories')
      .select('*')
      .eq('category_id', categoryId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      throw error;
    }

    return data ?? [];
  } catch (error) {
    console.error('SERVICE_SUBCATEGORIES_FETCH_FAILED', { categoryId, error });
    return getSampleSubcategoriesByCategory(categoryId);
  }
}

export function getSampleCategoryById(categoryId: string) {
  return sampleServiceCategories.find((category) => category.id === categoryId) ?? null;
}

export function getSampleSubcategoryById(subcategoryId: string) {
  return sampleServiceSubcategories.find((subcategory) => subcategory.id === subcategoryId) ?? null;
}

function getSampleSubcategoriesByCategory(categoryId: string) {
  return sampleServiceSubcategories.filter((subcategory) => subcategory.category_id === categoryId);
}

function createSampleSubcategory(
  categorySlug: string,
  name: string,
  slug: string,
  sortOrder: number
): ServiceSubcategory {
  const category = sampleServiceCategories.find((item) => item.slug === categorySlug);
  const now = new Date(0).toISOString();

  return {
    category_id: category?.id ?? null,
    created_at: now,
    description: null,
    icon: null,
    id: `sample-subcategory-${categorySlug}-${slug}`,
    is_active: true,
    name,
    slug,
    sort_order: sortOrder,
    updated_at: now,
  };
}
