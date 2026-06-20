import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { AppScreen } from '@/components/app-screen';
import { PrimaryButton } from '@/components/primary-button';
import { SectionHeader } from '@/components/section-header';
import { ServiceCard } from '@/components/service-card';
import { BrandColors } from '@/constants/brand';
import { promotions, quickActions, type CustomerService } from '@/constants/services';
import {
  getServiceCategories,
  sampleServiceCategories,
  type ServiceCategory,
} from '@/services/category-service';

export function HomeScreen() {
  const [marketplaceCategories, setMarketplaceCategories] = useState<ServiceCategory[]>(
    sampleServiceCategories
  );

  useEffect(() => {
    let isMounted = true;

    async function loadCategories() {
      const categories = await getServiceCategories();

      if (isMounted && categories.length > 0) {
        setMarketplaceCategories(categories);
      }
    }

    loadCategories();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <AppScreen>
      <View style={styles.locationRow}>
        <AppIcon
          backgroundColor={BrandColors.white}
          color={BrandColors.green}
          name={{ ios: 'location.fill', android: 'location_on', web: 'location_on' }}
          size={20}
          style={styles.locationIcon}
        />
        <View style={styles.locationCopy}>
          <Text style={styles.locationLabel}>Current Location</Text>
          <Text style={styles.locationValue}>Consuelo, Camotes</Text>
        </View>
        <View style={styles.logoShell}>
          <Image source={require('@/assets/images/logo.png')} style={styles.logo} contentFit="contain" />
        </View>
      </View>

      <View style={styles.headingBlock}>
        <Text style={styles.greeting}>Good Morning</Text>
        <Text style={styles.mainHeading}>Where do you need help today?</Text>
      </View>

      <View style={styles.searchCard}>
        <SearchRow
          icon={{ ios: 'smallcircle.filled.circle', android: 'my_location', web: 'my_location' }}
          label="Pickup location"
          value="Consuelo Port, San Francisco"
        />
        <View style={styles.searchDivider} />
        <SearchRow
          icon={{ ios: 'mappin.circle.fill', android: 'location_on', web: 'location_on' }}
          label="Destination"
          value="Where to?"
        />
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroCopy}>
          <Text style={styles.heroKicker}>Camotes Runner</Text>
          <Text style={styles.heroTitle}>Ride, Deliver, Explore.</Text>
          <Text style={styles.heroText}>Trusted local riders ready to help around Camotes.</Text>
          <PrimaryButton title="Book Now" style={styles.heroButton} onPress={() => router.push('/book')} />
        </View>
        <View style={styles.heroArt}>
          <View style={styles.sun} />
          <View style={styles.island}>
            <View style={styles.palmTrunk} />
            <View style={styles.palmLeaf} />
          </View>
          <AppIcon
            backgroundColor={BrandColors.yellow}
            color={BrandColors.darkGreen}
            name={{ ios: 'motorcycle', android: 'two_wheeler', web: 'two_wheeler' }}
            size={36}
            style={styles.motorIcon}
          />
        </View>
      </View>

      <View style={styles.sectionBlock}>
        <SectionHeader eyebrow="Services" title="Choose a service" />
        <View style={styles.serviceGrid}>
          {marketplaceCategories.map((category) => (
            <ServiceCard
              key={category.id}
              compact
              service={mapCategoryToService(category)}
              onPress={() => {
                console.log('CATEGORY_SELECTED', {
                  categoryId: category.id,
                  categoryName: category.name,
                  categorySlug: category.slug,
                });
                router.push(`/category/${category.id}` as Href);
              }}
            />
          ))}
        </View>
      </View>

      <View style={styles.sectionBlock}>
        <SectionHeader eyebrow="Quick actions" title="Get moving faster" />
        <View style={styles.quickGrid}>
          {quickActions.map((action) => (
            <Pressable
              key={action.title}
              accessibilityRole="button"
              style={({ pressed }) => [styles.quickCard, pressed && styles.pressed]}
              onPress={() => router.push(action.title === 'Track Runner' ? '/activity' : '/book')}>
              <AppIcon backgroundColor={BrandColors.softGreen} name={action.icon} size={22} />
              <Text style={styles.quickText}>{action.title}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.sectionBlock}>
        <SectionHeader eyebrow="Promos" title="Camotes deals" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.promoScroller}>
          {promotions.map((promo) => (
            <View key={promo.title} style={styles.promoCard}>
              <Text style={styles.promoTitle}>{promo.title}</Text>
              <Text style={styles.promoText}>{promo.description}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </AppScreen>
  );
}

function mapCategoryToService(category: ServiceCategory): CustomerService {
  return {
    accentColor: getCategoryAccent(category.slug),
    description: category.description ?? 'Local Camotes Runner service',
    icon: getCategoryIcon(category.slug),
    title: category.name,
  };
}

function getCategoryAccent(slug: string) {
  switch (slug) {
    case 'restaurants-food':
      return BrandColors.yellow;
    case 'groceries':
      return BrandColors.limeGreen;
    case 'medicine-pharmacy':
      return BrandColors.darkGreen;
    case 'school-supplies':
      return '#E7A900';
    case 'tours':
      return '#2E7D32';
    case 'errands':
      return '#6FBA2C';
    case 'ride':
      return BrandColors.green;
    default:
      return BrandColors.green;
  }
}

function getCategoryIcon(slug: string) {
  switch (slug) {
    case 'restaurants-food':
      return { ios: 'fork.knife', android: 'restaurant', web: 'restaurant' };
    case 'groceries':
      return { ios: 'basket', android: 'shopping_basket', web: 'shopping_basket' };
    case 'medicine-pharmacy':
      return { ios: 'cross.case', android: 'medical_services', web: 'medical_services' };
    case 'school-supplies':
      return { ios: 'doc.text', android: 'edit_note', web: 'edit_note' };
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

type SearchRowProps = {
  icon: { ios: string; android: string; web: string };
  label: string;
  value: string;
};

function SearchRow({ icon, label, value }: SearchRowProps) {
  return (
    <Pressable accessibilityRole="button" style={({ pressed }) => [styles.searchRow, pressed && styles.pressed]}>
      <AppIcon backgroundColor={BrandColors.softGreen} name={icon} size={19} style={styles.searchIcon} />
      <View style={styles.searchCopy}>
        <Text style={styles.searchLabel}>{label}</Text>
        <Text style={styles.searchValue}>{value}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  locationIcon: {
    width: 44,
    height: 44,
    borderRadius: 18,
  },
  locationCopy: {
    flex: 1,
    gap: 2,
  },
  locationLabel: {
    color: BrandColors.mutedInk,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  locationValue: {
    color: BrandColors.ink,
    fontSize: 16,
    fontWeight: '900',
  },
  logoShell: {
    width: 50,
    height: 50,
    borderRadius: 20,
    backgroundColor: BrandColors.white,
    borderWidth: 1,
    borderColor: BrandColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 36,
    height: 36,
  },
  headingBlock: {
    gap: 6,
  },
  greeting: {
    color: BrandColors.green,
    fontSize: 16,
    fontWeight: '900',
  },
  mainHeading: {
    color: BrandColors.ink,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '900',
  },
  searchCard: {
    borderRadius: 26,
    backgroundColor: BrandColors.white,
    borderWidth: 1,
    borderColor: BrandColors.border,
    padding: 8,
    shadowColor: BrandColors.cardShadow,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
  },
  searchRow: {
    minHeight: 66,
    borderRadius: 20,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
  },
  searchCopy: {
    flex: 1,
    gap: 2,
  },
  searchLabel: {
    color: BrandColors.mutedInk,
    fontSize: 12,
    fontWeight: '800',
  },
  searchValue: {
    color: BrandColors.ink,
    fontSize: 16,
    fontWeight: '900',
  },
  searchDivider: {
    height: 1,
    backgroundColor: BrandColors.border,
    marginLeft: 66,
  },
  heroCard: {
    minHeight: 220,
    borderRadius: 28,
    padding: 22,
    backgroundColor: BrandColors.darkGreen,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  heroCopy: {
    flex: 1,
    gap: 8,
    zIndex: 2,
  },
  heroKicker: {
    color: BrandColors.yellow,
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: BrandColors.white,
    fontSize: 29,
    lineHeight: 35,
    fontWeight: '900',
  },
  heroText: {
    color: '#DFF3E4',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  heroButton: {
    alignSelf: 'flex-start',
    minHeight: 48,
    paddingHorizontal: 18,
    marginTop: 8,
  },
  heroArt: {
    width: 108,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sun: {
    position: 'absolute',
    top: 4,
    right: -26,
    width: 98,
    height: 98,
    borderRadius: 49,
    backgroundColor: '#FFE27A',
    opacity: 0.92,
  },
  island: {
    position: 'absolute',
    bottom: -24,
    right: -22,
    width: 126,
    height: 78,
    borderTopLeftRadius: 70,
    borderTopRightRadius: 70,
    backgroundColor: '#2DA653',
  },
  palmTrunk: {
    position: 'absolute',
    right: 48,
    top: -34,
    width: 9,
    height: 58,
    borderRadius: 6,
    backgroundColor: '#7B5E2B',
    transform: [{ rotate: '10deg' }],
  },
  palmLeaf: {
    position: 'absolute',
    right: 22,
    top: -48,
    width: 58,
    height: 28,
    borderRadius: 28,
    backgroundColor: BrandColors.limeGreen,
    transform: [{ rotate: '-12deg' }],
  },
  motorIcon: {
    width: 76,
    height: 76,
    borderRadius: 28,
  },
  sectionBlock: {
    gap: 14,
  },
  serviceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  quickCard: {
    width: '48%',
    minHeight: 96,
    borderRadius: 24,
    backgroundColor: BrandColors.white,
    borderWidth: 1,
    borderColor: BrandColors.border,
    padding: 14,
    justifyContent: 'space-between',
  },
  quickText: {
    color: BrandColors.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  promoScroller: {
    gap: 12,
    paddingRight: 20,
  },
  promoCard: {
    width: 224,
    minHeight: 124,
    borderRadius: 24,
    padding: 16,
    backgroundColor: BrandColors.paleYellow,
    borderWidth: 1,
    borderColor: '#F3DC83',
    justifyContent: 'space-between',
  },
  promoTitle: {
    color: BrandColors.ink,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '900',
  },
  promoText: {
    color: BrandColors.mutedInk,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.84,
    transform: [{ scale: 0.99 }],
  },
});
