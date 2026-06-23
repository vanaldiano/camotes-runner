import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppScreen } from '@/components/app-screen';
import { PrimaryButton } from '@/components/primary-button';
import { ScreenHeader } from '@/components/screen-header';
import { BrandColors } from '@/constants/brand';
import { getCurrentAuthState } from '@/services/auth-service';
import { useFoodCart, type FoodCartItem } from '@/services/food-cart';
import { createFoodOrder, type CreateFoodOrderInput } from '@/services/food-order-service';
import { useFoodOrderStatus } from '@/services/food-order-status';
import {
  calculateFoodDeliveryDistanceKm,
  calculateFoodDeliveryFee,
  formatDeliveryFee,
  formatFoodDistance,
} from '@/services/fare-service';
import {
  formatLocationPoint,
  getCurrentLocationPoint,
  type LocationPoint,
} from '@/services/location-service';
import { hasSupabaseConfig } from '@/services/supabase';
import type { PaymentMethod } from '@/types/database';

const paymentMethods: PaymentMethod[] = ['Cash', 'GCash'];
const LOCATION_UNAVAILABLE_MESSAGE =
  'We couldn’t get your location. Please choose a delivery location or enter it manually.';

export function FoodCheckoutScreen() {
  const {
    cartSubtotal,
    clearCart,
    items,
    restaurantId,
    restaurantLatitude,
    restaurantLongitude,
    restaurantName,
  } = useFoodCart();
  const [customerName, setCustomerName] = useState('Juan Customer');
  const [customerPhone, setCustomerPhone] = useState('09123456789');
  const [deliveryAddress, setDeliveryAddress] = useState('Consuelo, Camotes');
  const [deliveryCoordinates, setDeliveryCoordinates] = useState<LocationPoint | null>(null);
  const [notes, setNotes] = useState('Please call when you arrive.');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [isSaving, setIsSaving] = useState(false);
  const [isLocatingDelivery, setIsLocatingDelivery] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const { setCurrentFoodOrder } = useFoodOrderStatus();
  const deliveryDistanceKm = useMemo(
    () =>
      calculateFoodDeliveryDistanceKm(
        restaurantLatitude,
        restaurantLongitude,
        deliveryCoordinates?.latitude,
        deliveryCoordinates?.longitude
      ),
    [
      deliveryCoordinates?.latitude,
      deliveryCoordinates?.longitude,
      restaurantLatitude,
      restaurantLongitude,
    ]
  );
  const dynamicDeliveryFee = useMemo(
    () => calculateFoodDeliveryFee(deliveryDistanceKm),
    [deliveryDistanceKm]
  );
  const serviceFee = 0;
  const orderTotal =
    dynamicDeliveryFee === null ? null : cartSubtotal + dynamicDeliveryFee + serviceFee;

  async function handlePlaceOrder() {
    if (isSaving) {
      return;
    }

    if (!hasSupabaseConfig) {
      setErrorMessage('Food checkout needs Supabase connection. Your cart is still saved locally.');
      return;
    }

    if (!restaurantId || items.length === 0) {
      setErrorMessage('Your cart is empty. Please add food before checkout.');
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
      const foodOrderPayload: CreateFoodOrderInput = {
        customerId: authState?.user?.id ?? null,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        deliveryAddress: deliveryAddress.trim(),
        deliveryDistanceKm,
        deliveryFee: dynamicDeliveryFee ?? 0,
        deliveryLat: deliveryCoordinates?.latitude ?? null,
        deliveryLng: deliveryCoordinates?.longitude ?? null,
        items,
        notes: notes.trim(),
        orderSubtotal: cartSubtotal,
        orderTotal,
        paymentMethod,
        restaurantId,
        serviceFee,
        subtotal: cartSubtotal,
        total: orderTotal ?? cartSubtotal,
      };

      const foodOrderResult = await createFoodOrder(foodOrderPayload);

      setCurrentFoodOrder(foodOrderResult.order);
      clearCart();
      Alert.alert('Food order sent', 'Your order was saved and is pending confirmation.', [
        {
          text: 'OK',
          onPress: () => router.replace('/restaurants'),
        },
      ]);
    } catch (error) {
      setErrorMessage(
        `We could not save your food order yet. Please try again in a moment. ${getErrorMessage(error)}`
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUseCurrentDeliveryLocation() {
    setIsLocatingDelivery(true);
    setErrorMessage('');

    try {
      const currentLocation = await getCurrentLocationPoint();
      setDeliveryCoordinates(currentLocation);
      setDeliveryAddress(currentLocation.label ?? 'Selected location');
    } catch (error) {
      if (__DEV__) {
        console.log('FOOD_CHECKOUT_LOCATION_UNAVAILABLE', getErrorMessage(error));
      }

      setErrorMessage(LOCATION_UNAVAILABLE_MESSAGE);
    } finally {
      setIsLocatingDelivery(false);
    }
  }

  return (
    <AppScreen>
      <ScreenHeader showHomeButton title="Delivery details" />

      <CheckoutCard title="Customer">
        <CheckoutInput
          placeholder="Customer name"
          value={customerName}
          onChangeText={setCustomerName}
        />
        <CheckoutInput
          keyboardType="phone-pad"
          placeholder="Phone number"
          value={customerPhone}
          onChangeText={setCustomerPhone}
        />
      </CheckoutCard>

      <CheckoutCard title="Delivery">
        <CheckoutInput
          placeholder="Delivery address"
          value={deliveryAddress}
          onChangeText={setDeliveryAddress}
        />
        <View style={styles.locationPicker}>
          <View style={styles.locationCopy}>
            <Text style={styles.locationLabel}>Delivery coordinates</Text>
            <Text style={styles.locationValue}>{formatLocationPoint(deliveryCoordinates)}</Text>
          </View>
          <View style={styles.locationActions}>
            <Pressable
              accessibilityRole="button"
              disabled={isLocatingDelivery}
              style={({ pressed }) => [styles.locationButton, pressed && styles.pressed]}
              onPress={() => void handleUseCurrentDeliveryLocation()}>
              <Text style={styles.locationButtonText}>
                {isLocatingDelivery ? 'Locating...' : 'Use Current Location'}
              </Text>
            </Pressable>
            {deliveryCoordinates ? (
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [styles.clearLocationButton, pressed && styles.pressed]}
                onPress={() => setDeliveryCoordinates(null)}>
                <Text style={styles.clearLocationText}>Clear</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
        <CheckoutInput
          multiline
          placeholder="Notes for the restaurant or runner"
          value={notes}
          onChangeText={setNotes}
        />
      </CheckoutCard>

      <CheckoutCard title="Payment Method">
        <View style={styles.paymentRow}>
          {paymentMethods.map((method) => {
            const isSelected = paymentMethod === method;

            return (
              <Pressable
                key={method}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.paymentOption,
                  isSelected && styles.selectedPayment,
                  pressed && styles.pressed,
                ]}
                onPress={() => setPaymentMethod(method)}>
                <Text style={[styles.paymentText, isSelected && styles.selectedPaymentText]}>
                  {method}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </CheckoutCard>

      <CheckoutCard title="Order Summary">
        <Text style={styles.restaurantName}>{restaurantName || 'No restaurant selected'}</Text>
        <View style={styles.summaryItems}>
          {items.map((item) => (
            <SummaryItem key={item.id} item={item} />
          ))}
        </View>
        <View style={styles.summaryDivider} />
        <SummaryRow label="Subtotal" value={formatPeso(cartSubtotal)} />
        <SummaryRow label="Delivery distance" value={formatFoodDistance(deliveryDistanceKm)} />
        <SummaryRow label="Delivery fee" value={formatDeliveryFee(dynamicDeliveryFee)} />
        <SummaryRow
          highlighted
          label="Total"
          value={orderTotal === null ? 'To be confirmed' : formatPeso(orderTotal)}
        />
      </CheckoutCard>

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      <PrimaryButton
        disabled={isSaving || items.length === 0}
        title={isSaving ? 'Saving Order...' : 'Place Food Order'}
        onPress={handlePlaceOrder}
      />
    </AppScreen>
  );
}

function CheckoutCard({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

type CheckoutInputProps = {
  keyboardType?: 'default' | 'phone-pad';
  multiline?: boolean;
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
};

function CheckoutInput({
  keyboardType = 'default',
  multiline = false,
  onChangeText,
  placeholder,
  value,
}: CheckoutInputProps) {
  return (
    <TextInput
      keyboardType={keyboardType}
      multiline={multiline}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={BrandColors.mutedInk}
      style={[styles.input, multiline && styles.notesInput]}
      value={value}
    />
  );
}

function SummaryItem({ item }: { item: FoodCartItem }) {
  return (
    <View style={styles.summaryItem}>
      <Text style={styles.summaryItemName}>{`${item.quantity}x ${item.name}`}</Text>
      <Text style={styles.summaryItemPrice}>{formatPeso(item.unitPrice * item.quantity)}</Text>
    </View>
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
      <Text style={[styles.summaryLabel, highlighted && styles.highlightedSummaryText]}>{label}</Text>
      <Text style={[styles.summaryValue, highlighted && styles.highlightedSummaryText]}>{value}</Text>
    </View>
  );
}

function formatPeso(value: number) {
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

  return 'Unknown Supabase error';
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    backgroundColor: BrandColors.white,
    borderWidth: 1,
    borderColor: BrandColors.border,
    padding: 16,
    gap: 12,
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
  input: {
    minHeight: 58,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BrandColors.border,
    backgroundColor: BrandColors.background,
    paddingHorizontal: 16,
    color: BrandColors.ink,
    fontSize: 15,
    fontWeight: '700',
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
  notesInput: {
    minHeight: 104,
    paddingTop: 16,
    textAlignVertical: 'top',
  },
  paymentRow: {
    flexDirection: 'row',
    gap: 12,
  },
  paymentOption: {
    flex: 1,
    minHeight: 58,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BrandColors.border,
    backgroundColor: BrandColors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedPayment: {
    backgroundColor: BrandColors.paleYellow,
    borderColor: BrandColors.yellow,
  },
  paymentText: {
    color: BrandColors.mutedInk,
    fontSize: 15,
    fontWeight: '900',
  },
  selectedPaymentText: {
    color: BrandColors.darkGreen,
  },
  restaurantName: {
    color: BrandColors.green,
    fontSize: 15,
    fontWeight: '900',
  },
  summaryItems: {
    gap: 8,
  },
  summaryItem: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  summaryItemName: {
    flex: 1,
    color: BrandColors.ink,
    fontSize: 14,
    fontWeight: '800',
  },
  summaryItemPrice: {
    color: BrandColors.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: BrandColors.border,
  },
  summaryRow: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  summaryLabel: {
    color: BrandColors.mutedInk,
    fontSize: 14,
    fontWeight: '800',
  },
  summaryValue: {
    color: BrandColors.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  highlightedSummaryText: {
    color: BrandColors.green,
    fontSize: 17,
  },
  errorText: {
    color: BrandColors.danger,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.84,
    transform: [{ scale: 0.99 }],
  },
});
