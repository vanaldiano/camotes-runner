import { useEffect, useMemo, useState } from 'react';
import { router, type Href } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { AppScreen } from '@/components/app-screen';
import { FoodImage } from '@/components/food-image';
import { ScreenHeader } from '@/components/screen-header';
import { BrandColors } from '@/constants/brand';
import {
  getServiceCategories,
  getSubcategoriesByCategory,
  type ServiceCategory,
  type ServiceSubcategory,
} from '@/services/category-service';
import {
  getBusinessPartnersByCategory,
  getBusinessPartnersBySubcategory,
  searchBusinessPartners,
  type BusinessPartnerListItem,
} from '@/services/partner-service';

type CategoryMarketplaceScreenProps = {
  categoryId: string;
};

const filterLabels = ['Sort', 'Offers', 'Rating', 'Open Now'];

export function CategoryMarketplaceScreen({ categoryId }: CategoryMarketplaceScreenProps) {
  const [category, setCategory] = useState<ServiceCategory | null>(null);
  const [subcategories, setSubcategories] = useState<ServiceSubcategory[]>([]);
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState('');
  const [partners, setPartners] = useState<BusinessPartnerListItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadCategory() {
      setIsLoading(true);
      setMessage('');

      try {
        const categories = await getServiceCategories();
        const nextCategory = categories.find((item) => item.id === categoryId) ?? null;

        if (!isMounted) {
          return;
        }

        setCategory(nextCategory);

        if (!nextCategory) {
          setSubcategories([]);
          setPartners([]);
          setMessage('No partner shops available yet.');
          return;
        }

        console.log('CATEGORY_SELECTED', {
          categoryId: nextCategory.id,
          categoryName: nextCategory.name,
          categorySlug: nextCategory.slug,
        });

        const [nextSubcategories, nextPartners] = await Promise.all([
          getSubcategoriesByCategory(nextCategory.id),
          getBusinessPartnersByCategory(nextCategory.id),
        ]);

        if (!isMounted) {
          return;
        }

        setSubcategories(nextSubcategories);
        setPartners(nextPartners);

        if (nextSubcategories.length === 0 || nextPartners.length === 0) {
          console.log('CATEGORY_EMPTY_STATE_SHOWN', {
            categoryId: nextCategory.id,
            hasPartners: nextPartners.length > 0,
            hasSubcategories: nextSubcategories.length > 0,
          });
        }
      } catch (error) {
        if (isMounted) {
          console.error('PARTNER_SHOP_FETCH_FAILED', { categoryId, error });
          setPartners([]);
          setMessage('Unable to load partners right now. Please try again.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadCategory();

    return () => {
      isMounted = false;
    };
  }, [categoryId]);

  useEffect(() => {
    let isMounted = true;

    async function loadFilteredPartners() {
      if (!category || !selectedSubcategoryId) {
        return;
      }

      const selectedSubcategory = subcategories.find((item) => item.id === selectedSubcategoryId);

      if (isRideBookingSubcategory(category, selectedSubcategory)) {
        console.log('SUBCATEGORY_SELECTED', {
          categoryId: category.id,
          subcategoryId: selectedSubcategoryId,
          subcategoryName: selectedSubcategory?.name,
        });
        router.push('/book');
        return;
      }

      console.log('SUBCATEGORY_SELECTED', {
        categoryId: category.id,
        subcategoryId: selectedSubcategoryId,
        subcategoryName: selectedSubcategory?.name,
      });

      try {
        const nextPartners = await getBusinessPartnersBySubcategory(selectedSubcategoryId);

        if (isMounted) {
          setPartners(nextPartners);

          if (nextPartners.length === 0) {
            console.log('CATEGORY_EMPTY_STATE_SHOWN', {
              categoryId: category.id,
              subcategoryId: selectedSubcategoryId,
            });
          }
        }
      } catch (error) {
        if (isMounted) {
          console.error('PARTNER_SHOP_FETCH_FAILED', {
            categoryId: category.id,
            error,
            subcategoryId: selectedSubcategoryId,
          });
          setPartners([]);
          setMessage('Unable to load partners right now. Please try again.');
        }
      }
    }

    loadFilteredPartners();

    return () => {
      isMounted = false;
    };
  }, [category, selectedSubcategoryId, subcategories]);

  useEffect(() => {
    let isMounted = true;
    const trimmedQuery = searchQuery.trim();

    async function loadSearchResults() {
      if (!category || !trimmedQuery) {
        return;
      }

      try {
        const searchResults = await searchBusinessPartners(trimmedQuery);
        const categoryResults = searchResults.filter((partner) => partner.category_id === category.id);

        if (isMounted) {
          setPartners(categoryResults);
        }
      } catch (error) {
        if (isMounted) {
          console.error('PARTNER_SHOP_FETCH_FAILED', {
            categoryId: category.id,
            error,
            query: trimmedQuery,
          });
          setMessage('Unable to load partners right now. Please try again.');
        }
      }
    }

    const timeoutId = setTimeout(loadSearchResults, 250);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [category, searchQuery]);

  const visiblePartners = useMemo(() => {
    const trimmedQuery = searchQuery.trim().toLowerCase();

    if (!trimmedQuery) {
      return partners;
    }

    return partners.filter((partner) => partner.name.toLowerCase().includes(trimmedQuery));
  }, [partners, searchQuery]);
  const isRideCategory = category?.slug === 'ride';

  return (
    <AppScreen>
      <ScreenHeader showHomeButton title={category?.name ?? 'Marketplace'} />

      {!isRideCategory ? (
        <View style={styles.searchCard}>
          <AppIcon
            backgroundColor={BrandColors.softGreen}
            name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
            size={20}
            style={styles.searchIcon}
          />
          <TextInput
            placeholder="Search partner shops"
            placeholderTextColor={BrandColors.mutedInk}
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      ) : null}

      <View style={styles.banner}>
        <View style={styles.bannerCopy}>
          <Text style={styles.bannerKicker}>Camotes Runner Marketplace</Text>
          <Text style={styles.bannerTitle}>{category?.name ?? 'Local partner shops'}</Text>
          <Text style={styles.bannerText}>Browse trusted local help around the island.</Text>
        </View>
        <View style={styles.bannerBadge}>
          <AppIcon
            backgroundColor={BrandColors.yellow}
            color={BrandColors.darkGreen}
            name={getCategoryIcon(category?.slug)}
            size={32}
            style={styles.bannerIcon}
          />
        </View>
      </View>

      {isRideCategory ? (
        <RideOptionsSection category={category} />
      ) : (
        <>
          <View style={styles.quickButtons}>
            {['Offers', 'Top Rated', 'Open Now'].map((label) => (
              <Pressable key={label} accessibilityRole="button" style={styles.quickButton}>
                <Text style={styles.quickButtonText}>{label}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sub-categories</Text>
            {subcategories.length === 0 ? (
              <Text style={styles.emptyText}>Sub-categories coming soon.</Text>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.subcategoryScroller}>
                <SubcategoryPill
                  icon="📌"
                  isSelected={!selectedSubcategoryId}
                  label="All"
                  onPress={async () => {
                    setSelectedSubcategoryId('');

                    if (category) {
                      setPartners(await getBusinessPartnersByCategory(category.id));
                    }
                  }}
                />
                {subcategories.map((subcategory) => (
                  <SubcategoryPill
                    icon={getSubcategoryIcon(subcategory.slug)}
                    key={subcategory.id}
                    isSelected={selectedSubcategoryId === subcategory.id}
                    label={subcategory.name}
                    onPress={() => setSelectedSubcategoryId(subcategory.id)}
                  />
                ))}
              </ScrollView>
            )}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroller}>
            {filterLabels.map((label) => (
              <View key={label} style={styles.filterChip}>
                <Text style={styles.filterChipText}>{label}</Text>
              </View>
            ))}
          </ScrollView>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Partner shops</Text>
            {message ? <Text style={styles.message}>{message}</Text> : null}
            {isLoading ? (
              <Text style={styles.emptyText}>Loading partner shops...</Text>
            ) : visiblePartners.length === 0 ? (
              <Text style={styles.emptyText}>No partner shops available yet.</Text>
            ) : (
              <View style={styles.partnerList}>
                {visiblePartners.map((partner) => (
                  <PartnerCard key={partner.id} partner={partner} />
                ))}
              </View>
            )}
          </View>
        </>
      )}
    </AppScreen>
  );
}

function RideOptionsSection({ category }: { category: ServiceCategory | null }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Choose your ride</Text>
      <View style={styles.rideOptionList}>
        <RideOptionCard
          description="Fast motorcycle ride for everyday trips around Camotes."
          icon="🛵"
          rideType="motorcycle_ride"
          title="Motorcycle Ride"
          category={category}
        />
        <RideOptionCard
          description="Roomier island transport for groups, bags, or family errands."
          icon="🚐"
          rideType="multicab_van"
          title="Multicab / Van"
          category={category}
        />
        <RideOptionCard
          description="Plan a custom route, special pickup, or longer island trip."
          icon="⭐"
          rideType="special_trip"
          title="Special Trip"
          category={category}
        />
      </View>
    </View>
  );
}

function RideOptionCard({
  category,
  description,
  icon,
  rideType,
  title,
}: {
  category: ServiceCategory | null;
  description: string;
  icon: string;
  rideType: 'motorcycle_ride' | 'multicab_van' | 'special_trip';
  title: string;
}) {
  function openBooking() {
    console.log('SUBCATEGORY_SELECTED', {
      categoryId: category?.id,
      rideType,
      subcategoryName: title,
    });
    router.push(`/book?rideType=${rideType}` as Href);
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Book ${title}`}
      style={({ pressed }) => [styles.rideOptionCard, pressed && styles.pressed]}
      onPress={openBooking}>
      <View style={styles.rideIconShell}>
        <Text style={styles.rideIcon}>{icon}</Text>
      </View>
      <View style={styles.rideOptionCopy}>
        <Text style={styles.rideOptionTitle}>{title}</Text>
        <Text style={styles.rideOptionDescription}>{description}</Text>
        <Text style={styles.rideOptionAction}>Book now &gt;</Text>
      </View>
    </Pressable>
  );
}

function SubcategoryPill({
  icon,
  isSelected,
  label,
  onPress,
}: {
  icon: string;
  isSelected: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.subcategoryPill,
        isSelected && styles.selectedSubcategoryPill,
        pressed && styles.pressed,
      ]}
      onPress={onPress}>
      <View style={[styles.subcategoryIconShell, isSelected && styles.selectedSubcategoryIconShell]}>
        <Text style={styles.subcategoryIcon}>{icon}</Text>
      </View>
      <Text style={[styles.subcategoryText, isSelected && styles.selectedSubcategoryText]}>{label}</Text>
    </Pressable>
  );
}

function PartnerCard({ partner }: { partner: BusinessPartnerListItem }) {
  const statusColor = partner.is_open ? BrandColors.green : BrandColors.danger;

  function openPartner() {
    console.log('PARTNER_SHOP_CARD_OPENED', {
      partnerId: partner.id,
      partnerName: partner.name,
      restaurantId: partner.restaurant_id,
    });

    if (partner.restaurant_id) {
      router.push({
        pathname: '/restaurant/[id]',
        params: { id: partner.restaurant_id },
      });
      return;
    }

    if (partner.categorySlug === 'ride' || partner.subcategorySlug === 'motorcycle-ride') {
      router.push('/book');
      return;
    }

    router.push(`/partner/${partner.id}` as Href);
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${partner.name}`}
      style={({ pressed }) => [styles.partnerCard, pressed && styles.pressed]}
      onPress={openPartner}>
      <View style={styles.partnerImageWrap}>
        <FoodImage imageUrl={partner.image_url} label={partner.name} variant="restaurant" />
      </View>

      <View style={styles.partnerCopy}>
        <View style={styles.partnerTitleRow}>
          <Text numberOfLines={1} style={styles.partnerName}>
            {partner.name}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}1F` }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {partner.is_open ? 'Open' : 'Closed'}
            </Text>
          </View>
        </View>
        <Text style={styles.partnerCategory}>
          {partner.categoryName} / {partner.subcategoryName}
        </Text>
        <View style={styles.partnerMetaRow}>
          <Text style={styles.partnerMetaPill}>{formatRating(partner.rating)}</Text>
          <Text style={styles.partnerMetaPill}>{partner.estimated_time ?? 'Time varies'}</Text>
        </View>
        <View style={styles.partnerBottomRow}>
          <Text style={styles.partnerFee}>{partner.delivery_fee_label ?? 'Delivery fee varies'}</Text>
          <Text style={styles.partnerAction}>View &gt;</Text>
        </View>
      </View>
    </Pressable>
  );
}

function getCategoryIcon(slug?: string | null) {
  switch (slug) {
    case 'restaurants-food':
      return { ios: 'fork.knife', android: 'restaurant', web: 'restaurant' };
    case 'groceries':
      return { ios: 'basket', android: 'shopping_basket', web: 'shopping_basket' };
    case 'medicine-pharmacy':
      return { ios: 'cross.case', android: 'medical_services', web: 'medical_services' };
    case 'school-supplies':
      return { ios: 'pencil.and.list.clipboard', android: 'edit_note', web: 'edit_note' };
    case 'tours':
      return { ios: 'beach.umbrella', android: 'beach_access', web: 'beach_access' };
    case 'errands':
      return { ios: 'shippingbox', android: 'package_2', web: 'package_2' };
    case 'ride':
      return { ios: 'motorcycle', android: 'two_wheeler', web: 'two_wheeler' };
    default:
      return { ios: 'square.grid.2x2', android: 'apps', web: 'apps' };
  }
}

function isRideBookingSubcategory(
  category: ServiceCategory | null,
  subcategory?: ServiceSubcategory
) {
  return (
    category?.slug === 'ride' &&
    Boolean(
      subcategory &&
        ['motorcycle-ride', 'multicab-van', 'special-trip'].includes(subcategory.slug)
    )
  );
}

function getSubcategoryIcon(slug: string) {
  const icons: Record<string, string> = {
    'accommodation': '🏠',
    'art-materials': '🎨',
    'baby-care': '👶',
    'bakery': '🥖',
    'bbq-grill': '🍖',
    'bills-payment': '💳',
    'boat-tour': '⛵',
    'books': '📚',
    'carinderia': '🍲',
    'coffee': '☕',
    'delivery-assistance': '📦',
    'document-pickup': '📄',
    'drinks': '🥤',
    'electronics-accessories': '🔌',
    'fast-food': '🍔',
    'first-aid': '🩹',
    'fresh-produce': '🥬',
    'frozen-goods': '🧊',
    'household-items': '🧽',
    'island-tour': '🌴',
    'milk-tea': '🧋',
    'mini-mart': '🛒',
    'motor-rental': '🛵',
    'motorcycle-ride': '🛵',
    'multicab-van': '🚐',
    'paper-supplies': '📒',
    'personal-care': '🧼',
    'personal-shopping': '🛍️',
    'pharmacy': '💊',
    'printing': '🖨️',
    'sari-sari-store': '🏪',
    'seafood': '🐟',
    'snacks': '🍟',
    'special-trip': '⭐',
    'tour-guide': '📍',
    'uniforms': '👕',
    'vitamins': '🧴',
  };

  return icons[slug] ?? '📌';
}

function formatRating(value: number | null) {
  if (typeof value !== 'number') {
    return 'New';
  }

  return `${value.toFixed(1)} rating`;
}

const styles = StyleSheet.create({
  banner: {
    minHeight: 150,
    borderRadius: 26,
    backgroundColor: BrandColors.darkGreen,
    flexDirection: 'row',
    gap: 14,
    overflow: 'hidden',
    padding: 20,
  },
  bannerBadge: {
    justifyContent: 'center',
  },
  bannerCopy: {
    flex: 1,
    gap: 6,
  },
  bannerIcon: {
    width: 68,
    height: 68,
    borderRadius: 26,
  },
  bannerKicker: {
    color: BrandColors.yellow,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  bannerText: {
    color: '#DFF3E4',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
  bannerTitle: {
    color: BrandColors.white,
    fontSize: 25,
    fontWeight: '900',
    lineHeight: 31,
  },
  emptyText: {
    color: BrandColors.mutedInk,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  filterChip: {
    minHeight: 38,
    borderRadius: 999,
    backgroundColor: BrandColors.white,
    borderWidth: 1,
    borderColor: BrandColors.border,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  filterChipText: {
    color: BrandColors.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  filterScroller: {
    gap: 10,
    paddingRight: 20,
  },
  message: {
    color: BrandColors.danger,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 19,
  },
  partnerCard: {
    borderRadius: 26,
    backgroundColor: BrandColors.white,
    borderWidth: 1,
    borderColor: BrandColors.border,
    flexDirection: 'row',
    gap: 14,
    padding: 15,
    shadowColor: BrandColors.cardShadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 3,
  },
  partnerAction: {
    color: BrandColors.green,
    fontSize: 13,
    fontWeight: '900',
  },
  partnerBottomRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  partnerCategory: {
    color: BrandColors.mutedInk,
    fontSize: 12,
    fontWeight: '800',
  },
  partnerCopy: {
    flex: 1,
    gap: 5,
  },
  partnerFee: {
    color: BrandColors.green,
    fontSize: 13,
    fontWeight: '900',
    flex: 1,
  },
  partnerImageWrap: {
    borderRadius: 22,
    backgroundColor: BrandColors.softGreen,
  },
  partnerList: {
    gap: 12,
  },
  partnerMetaPill: {
    borderRadius: 999,
    backgroundColor: BrandColors.background,
    color: BrandColors.ink,
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  partnerMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  partnerName: {
    color: BrandColors.ink,
    flex: 1,
    fontSize: 17,
    fontWeight: '900',
  },
  partnerTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  pressed: {
    opacity: 0.84,
    transform: [{ scale: 0.99 }],
  },
  quickButton: {
    minHeight: 42,
    borderRadius: 16,
    backgroundColor: BrandColors.white,
    borderWidth: 1,
    borderColor: BrandColors.border,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  quickButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  quickButtonText: {
    color: BrandColors.green,
    fontSize: 13,
    fontWeight: '900',
  },
  rideIcon: {
    fontSize: 30,
    lineHeight: 36,
  },
  rideIconShell: {
    width: 62,
    height: 62,
    borderRadius: 24,
    backgroundColor: BrandColors.paleYellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rideOptionAction: {
    color: BrandColors.green,
    fontSize: 14,
    fontWeight: '900',
  },
  rideOptionCard: {
    minHeight: 118,
    borderRadius: 24,
    backgroundColor: BrandColors.white,
    borderWidth: 1,
    borderColor: BrandColors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    shadowColor: BrandColors.cardShadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 2,
  },
  rideOptionCopy: {
    flex: 1,
    gap: 5,
  },
  rideOptionDescription: {
    color: BrandColors.mutedInk,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
  rideOptionList: {
    gap: 12,
  },
  rideOptionTitle: {
    color: BrandColors.ink,
    fontSize: 18,
    fontWeight: '900',
  },
  searchCard: {
    minHeight: 58,
    borderRadius: 22,
    backgroundColor: BrandColors.white,
    borderWidth: 1,
    borderColor: BrandColors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
  },
  searchIcon: {
    width: 40,
    height: 40,
    borderRadius: 15,
  },
  searchInput: {
    color: BrandColors.ink,
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    minHeight: 52,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    color: BrandColors.ink,
    fontSize: 18,
    fontWeight: '900',
  },
  selectedSubcategoryPill: {
    backgroundColor: BrandColors.green,
    borderColor: BrandColors.green,
    shadowColor: BrandColors.cardShadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 3,
  },
  selectedSubcategoryIconShell: {
    backgroundColor: BrandColors.yellow,
  },
  selectedSubcategoryText: {
    color: BrandColors.white,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '900',
  },
  subcategoryPill: {
    minHeight: 58,
    borderRadius: 18,
    backgroundColor: BrandColors.white,
    borderWidth: 1,
    borderColor: BrandColors.border,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 9,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  subcategoryIcon: {
    fontSize: 18,
    lineHeight: 22,
  },
  subcategoryIconShell: {
    width: 34,
    height: 34,
    borderRadius: 13,
    backgroundColor: BrandColors.softGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subcategoryScroller: {
    gap: 10,
    paddingRight: 20,
  },
  subcategoryText: {
    color: BrandColors.ink,
    fontSize: 13,
    fontWeight: '900',
  },
});
