import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppScreen } from '@/components/app-screen';
import { PrimaryButton } from '@/components/primary-button';
import { ScreenHeader } from '@/components/screen-header';
import { BrandColors } from '@/constants/brand';
import { getCurrentAuthState } from '@/services/auth-service';
import {
  calculatePartnerDeliveryFee,
  type PartnerDeliveryFeeCalculation,
} from '@/services/partner-delivery-fee-service';
import {
  formatLocationPoint,
  getCurrentLocationPoint,
  type LocationPoint,
} from '@/services/location-service';
import { usePartnerCart } from '@/services/partner-cart';
import { createPartnerOrder } from '@/services/partner-order-service';
import { getBusinessPartnerById, type BusinessPartnerListItem } from '@/services/partner-service';
import { hasSupabaseConfig } from '@/services/supabase';

type PartnerCheckoutScreenProps = {
  partnerId: string;
};

type DeliveryLocationPreset = {
  address: string;
  point: LocationPoint;
};

const deliveryLocationPresets: DeliveryLocationPreset[] = [
  {
    address: 'Consuelo Port',
    point: { latitude: 10.6629, longitude: 124.3396 },
  },
  {
    address: 'San Francisco Town Center',
    point: { latitude: 10.6469, longitude: 124.3506 },
  },
  {
    address: 'Santiago Bay',
    point: { latitude: 10.5931, longitude: 124.3044 },
  },
  {
    address: 'Poro Town Center',
    point: { latitude: 10.6296, longitude: 124.4071 },
  },
  {
    address: 'Tudela Town Center',
    point: { latitude: 10.6381, longitude: 124.4726 },
  },
];
const LOCATION_UNAVAILABLE_MESSAGE =
  'We couldn’t get your location. Please choose a delivery location or enter it manually.';

export function PartnerCheckoutScreen({ partnerId }: PartnerCheckoutScreenProps) {
  const { clearCart, items, partnerId: cartPartnerId, partnerName } = usePartnerCart();
  const [partner, setPartner] = useState<BusinessPartnerListItem | null>(null);
  const [customerName, setCustomerName] = useState('Juan Customer');
  const [customerPhone, setCustomerPhone] = useState('09123456789');
  const [deliveryAddress, setDeliveryAddress] = useState('Consuelo, Camotes');
  const [deliveryPoint, setDeliveryPoint] = useState<LocationPoint | null>(null);
  const [deliveryPointSource, setDeliveryPointSource] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState('');
  const [notes, setNotes] = useState('Please call when you arrive.');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [feeCalculation, setFeeCalculation] = useState<PartnerDeliveryFeeCalculation | null>(null);
  const [feeMessage, setFeeMessage] = useState('');
  const isCurrentPartnerCart = cartPartnerId === partnerId;
  const visibleItems = useMemo(
    () => (isCurrentPartnerCart ? items : []),
    [isCurrentPartnerCart, items]
  );
  const subtotal = useMemo(
    () => visibleItems.reduce((total, item) => total + item.price * item.quantity, 0),
    [visibleItems]
  );
  const totals = feeCalculation ?? getFallbackFeeCalculation(subtotal);

  useEffect(() => {
    let isMounted = true;

    getBusinessPartnerById(partnerId)
      .then((nextPartner) => {
        if (isMounted) {
          setPartner(nextPartner);
        }
      })
      .catch(() => {
        if (isMounted) {
          setPartner(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [partnerId]);

  useEffect(() => {
    let isMounted = true;

    async function loadFeeCalculation() {
      const nextCalculation = await calculatePartnerDeliveryFee({
        categoryId: partner?.category_id ?? null,
        deliveryLat: deliveryPoint?.latitude ?? null,
        deliveryLng: deliveryPoint?.longitude ?? null,
        partner,
        partnerId,
        subtotal,
        subcategoryId: partner?.subcategory_id ?? null,
      });

      if (!isMounted) {
        return;
      }

      setFeeCalculation(nextCalculation);
      setFeeMessage(getFeeCalculationMessage(nextCalculation));
    }

    void loadFeeCalculation().catch((error) => {
      if (__DEV__) {
        console.warn('PARTNER_CHECKOUT_FEE_CALCULATION_FAILED', error);
      }

      if (isMounted) {
        const fallback = getFallbackFeeCalculation(subtotal);
        setFeeCalculation(fallback);
        setFeeMessage('Using the default partner delivery fee for now.');
      }
    });

    return () => {
      isMounted = false;
    };
  }, [deliveryPoint, partner, partnerId, subtotal]);

  async function handleUseCurrentLocation() {
    if (isLocating) {
      return;
    }

    setIsLocating(true);
    setLocationMessage('');

    try {
      const point = await getCurrentLocationPoint();

      setDeliveryPoint(point);
      setDeliveryPointSource('Current location');

      if (!deliveryAddress.trim()) {
        setDeliveryAddress(point.label || 'Current location');
      }

      setLocationMessage('Current location selected.');
    } catch (error) {
      if (__DEV__) {
        console.log('PARTNER_CHECKOUT_LOCATION_UNAVAILABLE', getErrorMessage(error));
      }

      setLocationMessage(LOCATION_UNAVAILABLE_MESSAGE);
    } finally {
      setIsLocating(false);
    }
  }

  function handleSelectPreset(preset: DeliveryLocationPreset) {
    setDeliveryAddress(preset.address);
    setDeliveryPoint({
      ...preset.point,
      label: preset.address,
    });
    setDeliveryPointSource(preset.address);
    setLocationMessage(`${preset.address} selected.`);
  }

  function handleDeliveryAddressChange(nextAddress: string) {
    setDeliveryAddress(nextAddress);

    if (deliveryPoint) {
      setLocationMessage('Coordinates are based on selected location.');
    }
  }

  async function handlePlaceOrder() {
    if (isSaving) {
      return;
    }

    if (!hasSupabaseConfig) {
      setErrorMessage('Partner checkout needs Supabase connection. Your cart is still saved locally.');
      return;
    }

    if (!isCurrentPartnerCart || visibleItems.length === 0) {
      setErrorMessage('Your partner cart is empty. Please add products before checkout.');
      return;
    }

    if (!customerName.trim() || !customerPhone.trim() || !deliveryAddress.trim()) {
      setErrorMessage('Please complete your name, phone number, and delivery address.');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');

    try {
      const authState = await getCurrentAuthState().catch(() => null);
      const orderResult = await createPartnerOrder({
        customerId: authState?.user?.id ?? null,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        deliveryAddress: deliveryAddress.trim(),
        deliveryFee: totals.deliveryFee,
        deliveryLat: deliveryPoint?.latitude ?? null,
        deliveryLng: deliveryPoint?.longitude ?? null,
        items: visibleItems,
        notes: notes.trim(),
        partnerId,
        partnerName: partner?.name ?? partnerName ?? 'Partner shop',
        paymentMethod: 'cash',
        serviceFee: totals.serviceFee,
        totalAmount: totals.totalAmount,
      });

      clearCart();
      router.replace({
        pathname: '/partner-order-success/[id]',
        params: { id: orderResult.orderId },
      });
    } catch (error) {
      setErrorMessage(`We could not save your partner order yet. ${getErrorMessage(error)}`);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AppScreen>
      <ScreenHeader showHomeButton title="Delivery details" />

      <CheckoutCard title="Customer">
        <CheckoutInput placeholder="Customer name" value={customerName} onChangeText={setCustomerName} />
        <CheckoutInput
          keyboardType="phone-pad"
          placeholder="Phone number"
          value={customerPhone}
          onChangeText={setCustomerPhone}
        />
      </CheckoutCard>

      <CheckoutCard title="Delivery Location">
        <CheckoutInput
          placeholder="Delivery address"
          value={deliveryAddress}
          onChangeText={handleDeliveryAddressChange}
        />
        <View style={styles.locationPicker}>
          <View style={styles.locationCopy}>
            <Text style={styles.locationLabel}>Delivery coordinates</Text>
            <Text style={styles.locationValue}>{formatLocationPoint(deliveryPoint)}</Text>
          </View>
          <View style={styles.locationActions}>
            <Pressable
              accessibilityRole="button"
              disabled={isLocating}
              style={({ pressed }) => [
                styles.locationButton,
                pressed && styles.pressed,
                isLocating && styles.disabledButton,
              ]}
              onPress={() => void handleUseCurrentLocation()}>
              <Text style={styles.locationButtonText}>
                {isLocating ? 'Locating...' : 'Use Current Location'}
              </Text>
            </Pressable>
            {deliveryPoint ? (
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [styles.clearLocationButton, pressed && styles.pressed]}
                onPress={() => {
                  setDeliveryPoint(null);
                  setDeliveryPointSource('');
                  setLocationMessage('');
                }}>
                <Text style={styles.clearLocationText}>Clear</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
        <View style={styles.presetGrid}>
          {deliveryLocationPresets.map((preset) => {
            const isSelected = deliveryPointSource === preset.address;

            return (
              <Pressable
                accessibilityRole="button"
                key={preset.address}
                style={({ pressed }) => [
                  styles.presetButton,
                  isSelected && styles.selectedPresetButton,
                  pressed && styles.pressed,
                ]}
                onPress={() => handleSelectPreset(preset)}>
                <Text style={[styles.presetText, isSelected && styles.selectedPresetText]}>
                  {preset.address}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.locationHelp}>
          {deliveryPoint
            ? 'Coordinates are optional but help the runner find you faster.'
            : 'Coordinates are optional. A clear address is enough to place your order.'}
        </Text>
        {locationMessage ? <Text style={styles.locationMessage}>{locationMessage}</Text> : null}
        <CheckoutInput
          multiline
          placeholder="Notes for the partner shop or runner"
          value={notes}
          onChangeText={setNotes}
        />
      </CheckoutCard>

      <CheckoutCard title="Payment Method">
        <View style={styles.paymentRow}>
          <View style={[styles.paymentOption, styles.selectedPayment]}>
            <Text style={[styles.paymentText, styles.selectedPaymentText]}>Cash / Manual Payment</Text>
          </View>
        </View>
      </CheckoutCard>

      <CheckoutCard title="Order Summary">
        <Text style={styles.partnerName}>{partner?.name ?? partnerName ?? 'Partner shop'}</Text>
        <View style={styles.summaryItems}>
          {visibleItems.map((item) => (
            <View style={styles.summaryItem} key={item.id}>
              <Text style={styles.summaryItemName}>
                {item.quantity}x {item.name}
              </Text>
              <Text style={styles.summaryItemPrice}>
                {formatCurrency(item.price * item.quantity)}
              </Text>
            </View>
          ))}
        </View>
        <View style={styles.summaryDivider} />
        <SummaryRow label="Subtotal" value={formatCurrency(totals.subtotal)} />
        {typeof totals.distanceKm === 'number' ? (
          <SummaryRow label="Distance" value={`${totals.distanceKm.toFixed(1)} km`} />
        ) : null}
        <SummaryRow label="Delivery fee" value={formatCurrency(totals.deliveryFee)} />
        {totals.serviceFee > 0 ? (
          <SummaryRow label="Service fee" value={formatCurrency(totals.serviceFee)} />
        ) : null}
        <SummaryRow highlighted label="Total" value={formatCurrency(totals.totalAmount)} />
        {feeMessage ? <Text style={styles.feeMessage}>{feeMessage}</Text> : null}
      </CheckoutCard>

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      <PrimaryButton
        disabled={isSaving || visibleItems.length === 0}
        title={isSaving ? 'Saving Order...' : 'Place Partner Order'}
        onPress={() => void handlePlaceOrder()}
      />
    </AppScreen>
  );
}

function getFallbackFeeCalculation(subtotal: number): PartnerDeliveryFeeCalculation {
  const deliveryFee = 50;

  return {
    deliveryFee,
    distanceKm: null,
    isManualQuote: false,
    rateProfile: null,
    serviceFee: 0,
    subtotal,
    totalAmount: subtotal + deliveryFee,
  };
}

function getFeeCalculationMessage(calculation: PartnerDeliveryFeeCalculation) {
  if (calculation.isManualQuote) {
    return 'Delivery fee will be confirmed by admin or the partner shop.';
  }

  if (typeof calculation.distanceKm === 'number') {
    return `Delivery fee uses ${calculation.rateProfile?.name ?? 'partner'} distance rates.`;
  }

  return 'Delivery fee uses the default rate until shop and delivery coordinates are both available.';
}

function CheckoutCard({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

function CheckoutInput({
  keyboardType = 'default',
  multiline = false,
  onChangeText,
  placeholder,
  value,
}: {
  keyboardType?: 'default' | 'phone-pad';
  multiline?: boolean;
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <TextInput
      keyboardType={keyboardType}
      multiline={multiline}
      placeholder={placeholder}
      placeholderTextColor={BrandColors.mutedInk}
      style={[styles.input, multiline && styles.multilineInput]}
      value={value}
      onChangeText={onChangeText}
    />
  );
}

function SummaryRow({
  highlighted = false,
  label,
  value,
}: {
  highlighted?: boolean;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, highlighted && styles.highlightedText]}>{label}</Text>
      <Text style={[styles.summaryValue, highlighted && styles.highlightedText]}>{value}</Text>
    </View>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-PH', {
    currency: 'PHP',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(value);
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'object' && error && 'message' in error) {
    return String(error.message);
  }

  return 'Please try again in a moment.';
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    backgroundColor: BrandColors.white,
    borderWidth: 1,
    borderColor: BrandColors.border,
    gap: 12,
    padding: 16,
    shadowColor: BrandColors.cardShadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: 3,
  },
  cardTitle: {
    color: BrandColors.ink,
    fontSize: 17,
    fontWeight: '900',
  },
  errorText: {
    color: BrandColors.danger,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
    textAlign: 'center',
  },
  feeMessage: {
    color: BrandColors.mutedInk,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
  },
  highlightedText: {
    color: BrandColors.green,
    fontSize: 17,
    fontWeight: '900',
  },
  input: {
    minHeight: 58,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BrandColors.border,
    backgroundColor: BrandColors.background,
    color: BrandColors.ink,
    fontSize: 15,
    fontWeight: '700',
    paddingHorizontal: 16,
  },
  clearLocationButton: {
    alignItems: 'center',
    borderColor: '#FFD0CB',
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: 12,
  },
  clearLocationText: {
    color: BrandColors.danger,
    fontSize: 12,
    fontWeight: '900',
  },
  disabledButton: {
    opacity: 0.65,
  },
  locationActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  locationButton: {
    alignItems: 'center',
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.green,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: 12,
  },
  locationButtonText: {
    color: BrandColors.green,
    fontSize: 12,
    fontWeight: '900',
  },
  locationCopy: {
    flex: 1,
    gap: 3,
  },
  locationHelp: {
    color: BrandColors.mutedInk,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
  },
  locationMessage: {
    color: BrandColors.darkGreen,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 18,
  },
  locationLabel: {
    color: BrandColors.mutedInk,
    fontSize: 12,
    fontWeight: '800',
  },
  locationPicker: {
    alignItems: 'center',
    backgroundColor: BrandColors.softGreen,
    borderColor: BrandColors.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    padding: 12,
  },
  locationValue: {
    color: BrandColors.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  multilineInput: {
    minHeight: 104,
    paddingTop: 16,
    textAlignVertical: 'top',
  },
  partnerName: {
    color: BrandColors.green,
    fontSize: 15,
    fontWeight: '900',
  },
  paymentOption: {
    alignItems: 'center',
    backgroundColor: BrandColors.background,
    borderColor: BrandColors.border,
    borderRadius: 20,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 58,
  },
  paymentRow: {
    flexDirection: 'row',
    gap: 12,
  },
  paymentText: {
    color: BrandColors.mutedInk,
    fontSize: 15,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.84,
    transform: [{ scale: 0.99 }],
  },
  presetButton: {
    backgroundColor: BrandColors.background,
    borderColor: BrandColors.border,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetText: {
    color: BrandColors.ink,
    fontSize: 12,
    fontWeight: '900',
  },
  selectedPresetButton: {
    backgroundColor: BrandColors.paleYellow,
    borderColor: BrandColors.yellow,
  },
  selectedPresetText: {
    color: BrandColors.darkGreen,
  },
  summaryDivider: {
    backgroundColor: BrandColors.border,
    height: 1,
  },
  summaryItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    minHeight: 34,
  },
  summaryItemName: {
    color: BrandColors.ink,
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
  },
  summaryItemPrice: {
    color: BrandColors.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  summaryItems: {
    gap: 8,
  },
  summaryLabel: {
    color: BrandColors.mutedInk,
    fontSize: 14,
    fontWeight: '800',
  },
  summaryRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    minHeight: 32,
  },
  summaryValue: {
    color: BrandColors.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  selectedPayment: {
    backgroundColor: BrandColors.paleYellow,
    borderColor: BrandColors.yellow,
  },
  selectedPaymentText: {
    color: BrandColors.darkGreen,
  },
});
