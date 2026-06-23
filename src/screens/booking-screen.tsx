import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { AppScreen } from '@/components/app-screen';
import { InfoCard } from '@/components/info-card';
import { PrimaryButton } from '@/components/primary-button';
import { SectionHeader } from '@/components/section-header';
import { BrandColors } from '@/constants/brand';
import { customerServices } from '@/constants/services';
import { getCurrentAuthState } from '@/services/auth-service';
import {
  addBookingStatusLog,
  createBooking as createSupabaseBooking,
  type CreateBookingInput,
} from '@/services/booking-service';
import { useBookingSimulation } from '@/services/booking-simulation';
import {
  calculateRideDistanceKm,
  calculateRideFare,
  formatDistance as formatFareDistance,
  formatFare,
} from '@/services/fare-service';
import {
  formatLocationPoint,
  getCurrentLocationPoint,
  type LocationPoint,
} from '@/services/location-service';
import { hasSupabaseConfig } from '@/services/supabase';

const paymentMethods = ['Cash', 'GCash'] as const;
const locationPresets = [
  {
    latitude: 10.6629,
    longitude: 124.3396,
    name: 'Consuelo Port',
  },
  {
    latitude: 10.6469,
    longitude: 124.3506,
    name: 'San Francisco Town Center',
  },
  {
    latitude: 10.5931,
    longitude: 124.3044,
    name: 'Santiago Bay',
  },
  {
    latitude: 10.6296,
    longitude: 124.4071,
    name: 'Poro Town Center',
  },
  {
    latitude: 10.6381,
    longitude: 124.4726,
    name: 'Tudela Town Center',
  },
] as const;
const SAME_LOCATION_WARNING =
  'Pickup and destination look the same. Please choose a different destination.';
const COORDINATE_REQUIRED_MESSAGE =
  'Please choose a pickup and destination with location details.';
const LOCATION_UNAVAILABLE_MESSAGE =
  'We couldn’t get your location. Please choose a pickup location or enter it manually.';
const VERY_CLOSE_COORDINATE_THRESHOLD_KM = 0.05;
const defaultPickupPreset = locationPresets[0];
const defaultDestinationPreset = locationPresets[2];

export function BookingScreen() {
  const [selectedService, setSelectedService] = useState(customerServices[0].title);
  const [paymentMethod, setPaymentMethod] = useState<(typeof paymentMethods)[number]>(
    paymentMethods[0]
  );
  const [pickupLocation, setPickupLocation] = useState<string>(defaultPickupPreset.name);
  const [pickupCoordinates, setPickupCoordinates] = useState<LocationPoint | null>(
    getLocationPointFromPreset(defaultPickupPreset)
  );
  const [destination, setDestination] = useState<string>(defaultDestinationPreset.name);
  const [destinationCoordinates, setDestinationCoordinates] = useState<LocationPoint | null>(
    getLocationPointFromPreset(defaultDestinationPreset)
  );
  const [notes, setNotes] = useState('Please call when you arrive at pickup.');
  const [isSaving, setIsSaving] = useState(false);
  const [locatingField, setLocatingField] = useState<'pickup' | 'destination' | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [locationMessage, setLocationMessage] = useState('');
  const { createBooking: createMockBooking } = useBookingSimulation();
  const rideDistanceKm = useMemo(
    () =>
      calculateRideDistanceKm(
        pickupCoordinates?.latitude,
        pickupCoordinates?.longitude,
        destinationCoordinates?.latitude,
        destinationCoordinates?.longitude
      ),
    [
      destinationCoordinates?.latitude,
      destinationCoordinates?.longitude,
      pickupCoordinates?.latitude,
      pickupCoordinates?.longitude,
    ]
  );
  const rideFareEstimate = useMemo(() => calculateRideFare(rideDistanceKm), [rideDistanceKm]);
  const coordinateValidationWarning = getPickupDestinationCoordinateWarning(
    pickupCoordinates,
    destinationCoordinates
  );

  async function handleFindRunner() {
    if (isSaving) {
      return;
    }

    setIsSaving(true);
    setErrorMessage('');

    console.log('BOOKING_PICKUP_DESTINATION_COORDINATES', {
      destination_lat: destinationCoordinates?.latitude ?? null,
      destination_lng: destinationCoordinates?.longitude ?? null,
      pickup_lat: pickupCoordinates?.latitude ?? null,
      pickup_lng: pickupCoordinates?.longitude ?? null,
    });

    if (coordinateValidationWarning) {
      console.log('BOOKING_COORDINATE_VALIDATION_WARNING', {
        destination_lat: destinationCoordinates?.latitude ?? null,
        destination_lng: destinationCoordinates?.longitude ?? null,
        message: coordinateValidationWarning,
        pickup_lat: pickupCoordinates?.latitude ?? null,
        pickup_lng: pickupCoordinates?.longitude ?? null,
      });
    }

    if (!pickupLocation.trim() || !destination.trim()) {
      setErrorMessage('Please enter your pickup and destination.');
      setIsSaving(false);
      return;
    }

    if (!isValidLocationPoint(pickupCoordinates) || !isValidLocationPoint(destinationCoordinates)) {
      setErrorMessage(COORDINATE_REQUIRED_MESSAGE);
      setIsSaving(false);
      return;
    }

    console.log('BOOKING_SCREEN_COORDINATES', {
      destination_lat: destinationCoordinates?.latitude ?? null,
      destination_lng: destinationCoordinates?.longitude ?? null,
      pickup_lat: pickupCoordinates?.latitude ?? null,
      pickup_lng: pickupCoordinates?.longitude ?? null,
    });

    const mockBookingInput = {
      destination,
      notes,
      paymentMethod,
      pickupLocation,
      distance: rideDistanceKm ? formatFareDistance(rideDistanceKm) : undefined,
      fareEstimate: rideFareEstimate ? formatFare(rideFareEstimate) : undefined,
      serviceType: selectedService,
    };

    try {
      let supabaseBookingId: string | undefined;

      if (hasSupabaseConfig) {
        const authState = await getCurrentAuthState().catch(() => null);
        const supabaseBookingPayload: CreateBookingInput = {
          base_fare: 50,
          customer_id: authState?.user?.id ?? null,
          destination,
          destination_lat: destinationCoordinates?.latitude ?? null,
          destination_lng: destinationCoordinates?.longitude ?? null,
          distance_km: rideDistanceKm,
          estimated_fare: rideFareEstimate ?? 0,
          fare_estimate: rideFareEstimate,
          notes,
          payment_method: paymentMethod,
          pickup_lat: pickupCoordinates?.latitude ?? null,
          pickup_lng: pickupCoordinates?.longitude ?? null,
          pickup_location: pickupLocation,
          service_type: selectedService,
          status: 'pending',
        };

        console.log('BOOKING_DISTANCE_FARE_SAVED', {
          distance_km: supabaseBookingPayload.distance_km,
          estimated_fare: supabaseBookingPayload.estimated_fare,
          fare_estimate: supabaseBookingPayload.fare_estimate,
        });

        const savedBooking = await createSupabaseBooking(supabaseBookingPayload);
        supabaseBookingId = savedBooking.id;

        await addBookingStatusLog(
          savedBooking.id,
          'pending',
          'Guest booking created from the Camotes Runner app.'
        );
      }

      createMockBooking({ ...mockBookingInput, supabaseBookingId });
      router.push('/matching');
    } catch (supabaseError) {
      const supabaseErrorMessage = getErrorMessage(supabaseError);

      try {
        // Fallback keeps the app feeling real even if Supabase is offline or not configured correctly.
        createMockBooking(mockBookingInput);
        router.push('/matching');
      } catch {
        setErrorMessage(
          `We could not start your booking right now. Please try again in a moment. ${supabaseErrorMessage}`
        );
      }
    } finally {
      setIsSaving(false);
    }
  }

  function handleSelectPickupPreset(preset: (typeof locationPresets)[number]) {
    const presetCoordinates = getLocationPointFromPreset(preset);

    console.log('PICKUP_PRESET_SELECTED', {
      pickup_lat: presetCoordinates.latitude,
      pickup_lng: presetCoordinates.longitude,
      pickup_name: preset.name,
    });

    setPickupLocation(preset.name);
    setPickupCoordinates(presetCoordinates);
    setErrorMessage('');
    setLocationMessage(`${preset.name} selected for pickup.`);
  }

  function handleSelectDestinationPreset(preset: (typeof locationPresets)[number]) {
    const presetCoordinates = getLocationPointFromPreset(preset);

    console.log('DESTINATION_PRESET_SELECTED', {
      destination_lat: presetCoordinates.latitude,
      destination_lng: presetCoordinates.longitude,
      destination_name: preset.name,
    });

    setDestination(preset.name);
    setDestinationCoordinates(presetCoordinates);
    setErrorMessage('');
    setLocationMessage(`${preset.name} selected for destination.`);
  }

  function handlePickupTextChange(value: string) {
    setPickupLocation(value);
    setPickupCoordinates(null);
    setLocationMessage('Manual pickup entered. Choose a preset if you need fare and ETA details.');
  }

  function handleDestinationTextChange(value: string) {
    setDestination(value);
    setDestinationCoordinates(null);
    setLocationMessage('Manual destination entered. Choose a preset if you need fare and ETA details.');
  }

  function handleUseManualAddress(field: 'pickup' | 'destination') {
    if (field === 'pickup') {
      setPickupCoordinates(null);
      setLocationMessage('Type your pickup address, or choose a preset to add location details.');
    } else {
      setDestinationCoordinates(null);
      setLocationMessage('Type your destination, or choose a preset to add location details.');
    }

    setErrorMessage('');
  }

  async function handleUseCurrentLocation(field: 'pickup' | 'destination') {
    setLocatingField(field);
    setErrorMessage('');

    try {
      const currentLocation = await getCurrentLocationPoint();

      if (field === 'pickup') {
        setPickupCoordinates(currentLocation);
        setPickupLocation(currentLocation.label ?? 'Selected location');
      } else {
        setDestinationCoordinates(currentLocation);
        setDestination(currentLocation.label ?? 'Selected location');
      }

      setLocationMessage('Current location selected.');
    } catch (error) {
      if (__DEV__) {
        console.log('BOOKING_LOCATION_UNAVAILABLE', getErrorMessage(error));
      }

      setLocationMessage(LOCATION_UNAVAILABLE_MESSAGE);
    } finally {
      setLocatingField(null);
    }
  }

  return (
    <AppScreen>
      <SectionHeader eyebrow="Premium booking" title="Find help in six steps" />

      <StepCard step="1" title="Select Service">
        <View style={styles.serviceGrid}>
          {customerServices.map((service) => {
            const isSelected = selectedService === service.title;

            return (
              <Pressable
                key={service.title}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.serviceOption,
                  isSelected && styles.selectedService,
                  pressed && styles.pressed,
                ]}
                onPress={() => setSelectedService(service.title)}>
                <AppIcon
                  backgroundColor={isSelected ? BrandColors.white : BrandColors.softGreen}
                  color={isSelected ? BrandColors.green : service.accentColor}
                  name={service.icon}
                  size={24}
                  style={styles.optionIcon}
                />
                <Text style={[styles.serviceText, isSelected && styles.selectedServiceText]}>
                  {service.title}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </StepCard>

      <StepCard step="2" title="Pickup Location">
        <BookingInput
          placeholder="Consuelo Port, San Francisco"
          value={pickupLocation}
          onChangeText={handlePickupTextChange}
        />
        <LocationPickerRow
          coordinates={pickupCoordinates}
          isLoading={locatingField === 'pickup'}
          onClear={() => setPickupCoordinates(null)}
          onUseManualAddress={() => handleUseManualAddress('pickup')}
          onUseCurrentLocation={() => void handleUseCurrentLocation('pickup')}
        />
        <LocationPresetPicker
          selectedCoordinates={pickupCoordinates}
          onSelect={handleSelectPickupPreset}
        />
      </StepCard>

      <StepCard step="3" title="Destination">
        <BookingInput
          placeholder="Santiago Bay, Poro Market, or saved place"
          value={destination}
          onChangeText={handleDestinationTextChange}
        />
        <LocationPresetPicker
          selectedCoordinates={destinationCoordinates}
          onSelect={handleSelectDestinationPreset}
        />
        <LocationPickerRow
          buttonTitle="Use Current Location Instead"
          coordinates={destinationCoordinates}
          isLoading={locatingField === 'destination'}
          onClear={() => setDestinationCoordinates(null)}
          onUseManualAddress={() => handleUseManualAddress('destination')}
          onUseCurrentLocation={() => void handleUseCurrentLocation('destination')}
        />
      </StepCard>

      <StepCard step="4" title="Notes">
        <BookingInput
          multiline
          placeholder="Add item list, contact person, landmarks, or special instructions"
          value={notes}
          onChangeText={setNotes}
        />
      </StepCard>

      <StepCard step="5" title="Payment Method">
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
      </StepCard>

      <InfoCard title="6. Fare Estimate" subtitle="Coordinate-based MVP estimate.">
        <View style={styles.fareRows}>
          {rideDistanceKm && rideFareEstimate ? (
            <>
              <FareRow label="Distance estimate" value={formatFareDistance(rideDistanceKm)} />
              <FareRow label="Base Fare" value="PHP 50" />
              <FareRow label="Fare estimate" value={formatFare(rideFareEstimate)} highlighted />
            </>
          ) : (
            <Text style={styles.fareUnavailableText}>
              Fare estimate will be confirmed after location is selected.
            </Text>
          )}
        </View>
      </InfoCard>

      {coordinateValidationWarning ? (
        <Text style={styles.warningText}>{coordinateValidationWarning}</Text>
      ) : null}

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
      {locationMessage ? <Text style={styles.locationMessage}>{locationMessage}</Text> : null}

      <PrimaryButton
        disabled={isSaving}
        title={isSaving ? 'Saving Booking...' : 'Find Runner'}
        onPress={handleFindRunner}
      />
    </AppScreen>
  );
}

type LocationPickerRowProps = {
  buttonTitle?: string;
  coordinates: LocationPoint | null;
  isLoading: boolean;
  onClear: () => void;
  onUseManualAddress: () => void;
  onUseCurrentLocation: () => void;
};

function LocationPickerRow({
  buttonTitle = 'Use Current Location',
  coordinates,
  isLoading,
  onClear,
  onUseManualAddress,
  onUseCurrentLocation,
}: LocationPickerRowProps) {
  return (
    <View style={styles.locationPicker}>
      <View style={styles.locationCopy}>
        <Text style={styles.locationLabel}>Coordinates</Text>
        <Text style={styles.locationValue}>{formatLocationPoint(coordinates)}</Text>
      </View>
      <View style={styles.locationActions}>
        <Pressable
          accessibilityRole="button"
          disabled={isLoading}
          style={({ pressed }) => [styles.locationButton, pressed && styles.pressed]}
          onPress={onUseCurrentLocation}>
          <Text style={styles.locationButtonText}>
            {isLoading ? 'Locating...' : buttonTitle}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [styles.manualLocationButton, pressed && styles.pressed]}
          onPress={onUseManualAddress}>
          <Text style={styles.manualLocationText}>Use Manual Address</Text>
        </Pressable>
        {coordinates ? (
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.clearLocationButton, pressed && styles.pressed]}
            onPress={onClear}>
            <Text style={styles.clearLocationText}>Clear</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

type LocationPresetPickerProps = {
  onSelect: (preset: (typeof locationPresets)[number]) => void;
  selectedCoordinates: LocationPoint | null;
};

function LocationPresetPicker({ onSelect, selectedCoordinates }: LocationPresetPickerProps) {
  return (
    <View style={styles.destinationPresetGrid}>
      {locationPresets.map((preset) => {
        const isSelected =
          selectedCoordinates?.latitude === preset.latitude &&
          selectedCoordinates.longitude === preset.longitude;

        return (
          <Pressable
            accessibilityRole="button"
            key={preset.name}
            style={({ pressed }) => [
              styles.destinationPresetButton,
              isSelected && styles.selectedDestinationPresetButton,
              pressed && styles.pressed,
            ]}
            onPress={() => onSelect(preset)}>
            <Text
              style={[
                styles.destinationPresetText,
                isSelected && styles.selectedDestinationPresetText,
              ]}>
              {preset.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function getLocationPointFromPreset(preset: (typeof locationPresets)[number]): LocationPoint {
  return {
    label: preset.name,
    latitude: preset.latitude,
    longitude: preset.longitude,
  };
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

function getPickupDestinationCoordinateWarning(
  pickupCoordinates: LocationPoint | null,
  destinationCoordinates: LocationPoint | null
) {
  if (!isValidLocationPoint(pickupCoordinates) || !isValidLocationPoint(destinationCoordinates)) {
    return '';
  }

  const distanceKm = getCoordinateDistanceKm(pickupCoordinates, destinationCoordinates);

  if (distanceKm <= VERY_CLOSE_COORDINATE_THRESHOLD_KM) {
    return SAME_LOCATION_WARNING;
  }

  return '';
}

function isValidLocationPoint(point: LocationPoint | null): point is LocationPoint {
  return (
    typeof point?.latitude === 'number' &&
    Number.isFinite(point.latitude) &&
    typeof point.longitude === 'number' &&
    Number.isFinite(point.longitude)
  );
}

function getCoordinateDistanceKm(from: LocationPoint, to: LocationPoint) {
  const earthRadiusKm = 6371;
  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const fromLatitude = toRadians(from.latitude);
  const toLatitude = toRadians(to.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(longitudeDelta / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

type StepCardProps = {
  children: React.ReactNode;
  step: string;
  title: string;
};

function StepCard({ children, step, title }: StepCardProps) {
  return (
    <InfoCard title={`${step}. ${title}`}>
      {children}
    </InfoCard>
  );
}

type BookingInputProps = {
  multiline?: boolean;
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
};

function BookingInput({ multiline = false, onChangeText, placeholder, value }: BookingInputProps) {
  return (
    <TextInput
      multiline={multiline}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={BrandColors.mutedInk}
      style={[styles.input, multiline && styles.notesInput]}
      value={value}
    />
  );
}

type FareRowProps = {
  highlighted?: boolean;
  label: string;
  value: string;
};

function FareRow({ highlighted, label, value }: FareRowProps) {
  return (
    <View style={[styles.fareRow, highlighted && styles.highlightedFare]}>
      <Text style={[styles.fareLabel, highlighted && styles.highlightedFareText]}>{label}</Text>
      <Text style={[styles.fareValue, highlighted && styles.highlightedFareText]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  serviceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
  },
  serviceOption: {
    width: '48%',
    minHeight: 112,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: BrandColors.border,
    backgroundColor: BrandColors.mint,
    padding: 14,
    justifyContent: 'space-between',
  },
  selectedService: {
    backgroundColor: BrandColors.green,
    borderColor: BrandColors.green,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 18,
  },
  serviceText: {
    color: BrandColors.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  selectedServiceText: {
    color: BrandColors.white,
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
  destinationPresetButton: {
    alignItems: 'center',
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.border,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  destinationPresetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  destinationPresetText: {
    color: BrandColors.green,
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
  },
  selectedDestinationPresetButton: {
    backgroundColor: BrandColors.green,
    borderColor: BrandColors.green,
  },
  selectedDestinationPresetText: {
    color: BrandColors.white,
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
    alignItems: 'stretch',
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
  locationMessage: {
    color: BrandColors.darkGreen,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 19,
    textAlign: 'center',
  },
  manualLocationButton: {
    alignItems: 'center',
    backgroundColor: BrandColors.paleYellow,
    borderColor: BrandColors.yellow,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: 12,
  },
  manualLocationText: {
    color: BrandColors.darkGreen,
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
    minHeight: 116,
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
  fareRows: {
    gap: 10,
  },
  fareUnavailableText: {
    color: BrandColors.mutedInk,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
    textAlign: 'center',
  },
  fareRow: {
    minHeight: 46,
    borderRadius: 16,
    backgroundColor: BrandColors.background,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  highlightedFare: {
    minHeight: 58,
    backgroundColor: BrandColors.darkGreen,
  },
  fareLabel: {
    color: BrandColors.mutedInk,
    fontSize: 14,
    fontWeight: '800',
  },
  fareValue: {
    color: BrandColors.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  highlightedFareText: {
    color: BrandColors.white,
  },
  pressed: {
    opacity: 0.84,
    transform: [{ scale: 0.99 }],
  },
  errorText: {
    color: BrandColors.danger,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
    textAlign: 'center',
  },
  warningText: {
    color: BrandColors.danger,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
    textAlign: 'center',
  },
});
