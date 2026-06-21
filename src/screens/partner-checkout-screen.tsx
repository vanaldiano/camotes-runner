import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { AppScreen } from '@/components/app-screen';
import { PrimaryButton } from '@/components/primary-button';
import { ScreenHeader } from '@/components/screen-header';
import { BrandColors } from '@/constants/brand';
import { getCurrentAuthState } from '@/services/auth-service';
import { usePartnerCart } from '@/services/partner-cart';
import {
  calculatePartnerOrderTotals,
  createPartnerOrder,
} from '@/services/partner-order-service';
import { getBusinessPartnerById, type BusinessPartnerListItem } from '@/services/partner-service';
import { hasSupabaseConfig } from '@/services/supabase';

type PartnerCheckoutScreenProps = {
  partnerId: string;
};

export function PartnerCheckoutScreen({ partnerId }: PartnerCheckoutScreenProps) {
  const { clearCart, items, partnerId: cartPartnerId, partnerName } = usePartnerCart();
  const [partner, setPartner] = useState<BusinessPartnerListItem | null>(null);
  const [customerName, setCustomerName] = useState('Juan Customer');
  const [customerPhone, setCustomerPhone] = useState('09123456789');
  const [deliveryAddress, setDeliveryAddress] = useState('Consuelo, Camotes');
  const [notes, setNotes] = useState('Please call when you arrive.');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const isCurrentPartnerCart = cartPartnerId === partnerId;
  const visibleItems = useMemo(
    () => (isCurrentPartnerCart ? items : []),
    [isCurrentPartnerCart, items]
  );
  const totals = useMemo(
    () => calculatePartnerOrderTotals(visibleItems, partner),
    [partner, visibleItems]
  );

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
        deliveryLat: null,
        deliveryLng: null,
        items: visibleItems,
        notes: notes.trim(),
        partnerId,
        paymentMethod: 'cash',
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
      <ScreenHeader showHomeButton title="Partner checkout" />

      <CheckoutCard title="Customer">
        <CheckoutInput placeholder="Customer name" value={customerName} onChangeText={setCustomerName} />
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
        <CheckoutInput
          multiline
          placeholder="Notes for the partner shop or runner"
          value={notes}
          onChangeText={setNotes}
        />
      </CheckoutCard>

      <CheckoutCard title="Payment Method">
        <View style={styles.paymentPill}>
          <Text style={styles.paymentText}>Cash / Manual Payment</Text>
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
        <SummaryRow label="Delivery fee" value={formatCurrency(totals.deliveryFee)} />
        <SummaryRow highlighted label="Total" value={formatCurrency(totals.totalAmount)} />
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
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.border,
    borderRadius: 24,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  cardTitle: {
    color: BrandColors.ink,
    fontSize: 17,
    fontWeight: '900',
  },
  errorText: {
    color: BrandColors.danger,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 19,
    textAlign: 'center',
  },
  highlightedText: {
    color: BrandColors.darkGreen,
    fontSize: 17,
    fontWeight: '900',
  },
  input: {
    backgroundColor: BrandColors.background,
    borderColor: BrandColors.border,
    borderRadius: 18,
    borderWidth: 1,
    color: BrandColors.ink,
    fontSize: 15,
    fontWeight: '700',
    minHeight: 50,
    paddingHorizontal: 14,
  },
  multilineInput: {
    minHeight: 90,
    paddingTop: 14,
    textAlignVertical: 'top',
  },
  partnerName: {
    color: BrandColors.darkGreen,
    fontSize: 15,
    fontWeight: '900',
  },
  paymentPill: {
    alignSelf: 'flex-start',
    backgroundColor: BrandColors.paleYellow,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  paymentText: {
    color: BrandColors.darkGreen,
    fontSize: 14,
    fontWeight: '900',
  },
  summaryDivider: {
    backgroundColor: BrandColors.border,
    height: 1,
  },
  summaryItem: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryValue: {
    color: BrandColors.ink,
    fontSize: 14,
    fontWeight: '900',
  },
});
