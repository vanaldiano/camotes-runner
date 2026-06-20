import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { AppScreen } from '@/components/app-screen';
import { InfoCard } from '@/components/info-card';
import { PrimaryButton } from '@/components/primary-button';
import { ScreenHeader } from '@/components/screen-header';
import { SectionHeader } from '@/components/section-header';
import { BrandColors } from '@/constants/brand';
import {
  getCurrentAuthState,
  getUserRole,
  signInWithEmail,
  signOut,
  subscribeToAuthChanges,
  type AuthState,
} from '@/services/auth-service';
import { getStatusColor, toStatusLabel } from '@/services/booking-status';
import {
  getGoogleMapsDirectionsUrl,
  getSafeGoogleMapsSearchUrl,
  openGoogleMapsUrlDirect,
  type LocationPoint,
} from '@/services/location-service';
import { subscribeToAssignedFoodOrdersForRider } from '@/services/realtime-service';
import {
  publishCurrentRiderFoodOrderLocation,
  publishCurrentRiderLocation,
  requestRiderLocationPermission,
} from '@/services/rider-location-service';
import { hasSupabaseConfig } from '@/services/supabase';
import {
  fallbackRiderFoodOrders,
  fallbackRider,
  fallbackRiderJobs,
  getAuthenticatedRiderJobs,
  getMvpRiderJobs,
  getRiderByName,
  linkRiderAccountToRider,
  MVP_RIDER_NAME,
  RiderNotFoundError,
  updateRiderAvailability,
  updateRiderFoodOrderStatus,
  updateRiderJobStatus,
  type Rider,
} from '@/services/rider-service';
import type { Booking } from '@/services/booking-service';
import type { FoodOrderWithRestaurant } from '@/services/food-order-service';
import type { BookingStatus, FoodOrderStatus } from '@/types/database';

const riderStatuses: BookingStatus[] = [
  'accepted',
  'runner_arriving',
  'in_progress',
  'completed',
];

const foodOrderStatuses: FoodOrderStatus[] = [
  'accepted',
  'preparing',
  'picked_up',
  'on_the_way',
  'delivered',
];

const liveLocationStatuses: BookingStatus[] = ['accepted', 'runner_arriving', 'in_progress'];
const foodLiveLocationStatuses: FoodOrderStatus[] = [
  'accepted',
  'preparing',
  'picked_up',
  'on_the_way',
];

type RiderJobFilter =
  | 'all'
  | 'active'
  | 'ride'
  | 'food'
  | 'accepted'
  | 'moving'
  | 'completed';

const riderJobFilters: { label: string; value: RiderJobFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Ride', value: 'ride' },
  { label: 'Food', value: 'food' },
  { label: 'Accepted', value: 'accepted' },
  { label: 'On the Way / In Progress', value: 'moving' },
  { label: 'Completed', value: 'completed' },
];

type ActiveLiveLocationTarget =
  | { id: string; kind: 'booking' }
  | { id: string; kind: 'food_order' }
  | null;

type UnifiedRiderJob =
  | {
      id: string;
      kind: 'ride';
      priority: number;
      ride: Booking;
      updatedAt: string;
    }
  | {
      foodOrder: FoodOrderWithRestaurant;
      id: string;
      kind: 'food';
      priority: number;
      updatedAt: string;
    };

type LoadJobsOptions = {
  showLoading?: boolean;
};

export function RiderScreen() {
  const [authState, setAuthState] = useState<AuthState>({
    profile: null,
    session: null,
    user: null,
  });
  const [rider, setRider] = useState<Rider>(fallbackRider);
  const [jobs, setJobs] = useState<Booking[]>(fallbackRiderJobs);
  const [foodOrders, setFoodOrders] = useState<FoodOrderWithRestaurant[]>(fallbackRiderFoodOrders);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(hasSupabaseConfig);
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);
  const [canLinkRider, setCanLinkRider] = useState(false);
  const [isUpdatingAvailability, setIsUpdatingAvailability] = useState(false);
  const [updatingJobId, setUpdatingJobId] = useState<string | null>(null);
  const [updatingFoodOrderId, setUpdatingFoodOrderId] = useState<string | null>(null);
  const [isSharingLiveLocation, setIsSharingLiveLocation] = useState(false);
  const [riderJobFilter, setRiderJobFilter] = useState<RiderJobFilter>('active');
  const [riderManuallyDisabledLocationTarget, setRiderManuallyDisabledLocationTarget] = useState<string | null>(null);
  const [liveLocationMessage, setLiveLocationMessage] = useState('');
  const [message, setMessage] = useState(
    hasSupabaseConfig
      ? ''
      : 'Live rider jobs and food orders are temporarily unavailable. Showing sample assigned work.'
  );
  const [isFallbackMode, setIsFallbackMode] = useState(!hasSupabaseConfig);

  const loadJobs = useCallback(async ({ showLoading = true }: LoadJobsOptions = {}) => {
    if (!hasSupabaseConfig) {
      if (showLoading) {
        setIsLoading(false);
      }
      setIsFallbackMode(true);
      setMessage('Live rider jobs and food orders are temporarily unavailable. Showing sample assigned work.');
      return;
    }

    if (showLoading) {
      setIsLoading(true);
    }

    try {
      const liveData = authState.user
        ? await getAuthenticatedRiderJobs(authState.user.id)
        : await getMvpRiderJobs();
      setRider(liveData.rider);
      setJobs(liveData.jobs);
      setFoodOrders(liveData.foodOrders);
      setMessage(authState.user ? 'Signed in rider profile loaded.' : '');
      setIsFallbackMode(false);
      setCanLinkRider(false);
    } catch (error) {
      setRider(fallbackRider);
      setJobs(fallbackRiderJobs);
      setFoodOrders(fallbackRiderFoodOrders);
      setIsFallbackMode(true);

      if (authState.user && error instanceof RiderNotFoundError) {
        setCanLinkRider(true);
        setMessage(
          'This login is not linked to a rider profile yet. Link it to Juan Dela Cruz for MVP testing.'
        );
      } else {
        setCanLinkRider(false);
        setMessage('Live rider jobs and food orders are temporarily unavailable. Showing sample assigned work.');
      }
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  }, [authState.user]);

  useEffect(() => {
    if (!hasSupabaseConfig) {
      return undefined;
    }

    void getCurrentAuthState()
      .then(setAuthState)
      .catch(() => {
        setMessage('We could not load rider login state. Guest rider mode still works.');
      });

    return subscribeToAuthChanges(setAuthState);
  }, []);

  async function handleRiderSignIn() {
    if (!hasSupabaseConfig) {
      setMessage('Supabase is not configured yet. Guest rider mode is still available.');
      return;
    }

    setIsAuthSubmitting(true);
    setMessage('');

    try {
      await signInWithEmail({ email, password });
      const nextAuthState = await getCurrentAuthState();
      setAuthState(nextAuthState);
      setPassword('');
      setMessage('Signed in. Loading linked rider profile...');
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setIsAuthSubmitting(false);
    }
  }

  async function handleRiderSignOut() {
    setIsAuthSubmitting(true);
    setMessage('');

    try {
      await signOut();
      setAuthState({ profile: null, session: null, user: null });
      setCanLinkRider(false);
      setRider(fallbackRider);
      setJobs(fallbackRiderJobs);
      setFoodOrders(fallbackRiderFoodOrders);
      setIsFallbackMode(!hasSupabaseConfig);
      setMessage('Signed out. Guest rider mode is available.');
    } catch {
      setMessage('We could not sign out right now. Please try again.');
    } finally {
      setIsAuthSubmitting(false);
    }
  }

  async function handleLinkJuanRider() {
    if (!authState.user) {
      return;
    }

    setIsAuthSubmitting(true);
    setMessage('');

    try {
      const mvpRider = await getRiderByName(MVP_RIDER_NAME);
      await linkRiderAccountToRider(mvpRider.id, authState.user.id);
      setCanLinkRider(false);
      setMessage('Rider account linked. Loading assigned jobs...');
      await loadJobs();
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setIsAuthSubmitting(false);
    }
  }

  useEffect(() => {
    if (!hasSupabaseConfig) {
      return undefined;
    }

    const timeout = setTimeout(() => {
      void loadJobs();
    }, 0);

    return () => {
      clearTimeout(timeout);
    };
  }, [loadJobs]);

  useEffect(() => {
    if (!hasSupabaseConfig || isFallbackMode || !rider.id) {
      return undefined;
    }

    function refreshAssignedFoodOrders() {
      void loadJobs({ showLoading: false });
    }

    const unsubscribe = subscribeToAssignedFoodOrdersForRider(
      rider.id,
      refreshAssignedFoodOrders,
      () => {
        setMessage(
          'Food delivery realtime updates are temporarily unavailable. Rider Mode will keep polling.'
        );
      }
    );
    const interval = setInterval(refreshAssignedFoodOrders, 5000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [isFallbackMode, loadJobs, rider.id]);

  const riderRole = getUserRole(authState.user, authState.profile);

  const activeJobsCount = useMemo(
    () => jobs.filter((job) => job.status !== 'completed' && job.status !== 'cancelled').length,
    [jobs]
  );
  const sortedRiderJobs = useMemo(() => {
    const nextJobs = sortRiderJobs(createUnifiedRiderJobs(jobs, foodOrders));

    console.log('RIDER_JOB_SORT_APPLIED', {
      totalJobs: nextJobs.length,
    });
    console.log('RIDER_JOB_PRIORITY_RESULT', nextJobs.map((job) => ({
      id: job.id,
      kind: job.kind,
      priority: job.priority,
      updatedAt: job.updatedAt,
    })));

    return nextJobs;
  }, [foodOrders, jobs]);
  const filteredRiderJobs = useMemo(
    () => sortedRiderJobs.filter((job) => matchesRiderJobFilter(job, riderJobFilter)),
    [riderJobFilter, sortedRiderJobs]
  );
  const activeLiveLocationTarget = useMemo<ActiveLiveLocationTarget>(() => {
    const activeJob = sortedRiderJobs.find((job) => (
      job.kind === 'ride'
        ? liveLocationStatuses.includes(job.ride.status)
        : foodLiveLocationStatuses.includes(job.foodOrder.status)
    ));

    if (!activeJob) {
      return null;
    }

    return {
      id: activeJob.id,
      kind: activeJob.kind === 'ride' ? 'booking' : 'food_order',
    };
  }, [sortedRiderJobs]);
  const isLiveLocationToggleOn = isSharingLiveLocation && Boolean(activeLiveLocationTarget);
  const completedJobsCount = useMemo(
    () => jobs.filter((job) => job.status === 'completed').length,
    [jobs]
  );
  const activeDeliveriesCount = useMemo(
    () =>
      foodOrders.filter((foodOrder) => (
        foodOrder.status !== 'delivered' && foodOrder.status !== 'cancelled'
      )).length,
    [foodOrders]
  );
  const deliveredTodayCount = useMemo(
    () =>
      foodOrders.filter((foodOrder) => (
        foodOrder.status === 'delivered' && isToday(foodOrder.updated_at)
      )).length,
    [foodOrders]
  );

  async function handleAvailabilityChange(nextValue: boolean) {
    const previousRider = rider;
    setRider({ ...rider, is_available: nextValue });

    if (isFallbackMode) {
      return;
    }

    setIsUpdatingAvailability(true);
    setMessage('');

    try {
      const updatedRider = await updateRiderAvailability(rider.id, nextValue);
      setRider(updatedRider);
    } catch {
      setRider(previousRider);
      setMessage('We could not update your online status right now. Please try again.');
    } finally {
      setIsUpdatingAvailability(false);
    }
  }

  function handleRiderJobFilterChange(nextFilter: RiderJobFilter) {
    console.log('RIDER_JOB_FILTER_CHANGED', {
      nextFilter,
      previousFilter: riderJobFilter,
    });
    setRiderJobFilter(nextFilter);
  }

  async function handleLiveLocationToggle(nextValue: boolean) {
    if (!nextValue) {
      setRiderManuallyDisabledLocationTarget(
        activeLiveLocationTarget
          ? getLiveLocationTargetKey(activeLiveLocationTarget)
          : null
      );
      setIsSharingLiveLocation(false);
      setLiveLocationMessage('Live location sharing is off.');
      return;
    }

    setRiderManuallyDisabledLocationTarget(null);

    if (!hasSupabaseConfig || isFallbackMode) {
      setLiveLocationMessage('Live location sharing needs Supabase connection.');
      return;
    }

    if (!activeLiveLocationTarget) {
      setLiveLocationMessage(
        'Live location starts when you have an accepted active ride or food delivery.'
      );
      return;
    }

    try {
      await requestRiderLocationPermission();
      setIsSharingLiveLocation(true);
      setLiveLocationMessage('Live location sharing is on.');
    } catch (error) {
      setIsSharingLiveLocation(false);
      setLiveLocationMessage(getErrorMessage(error));
    }
  }

  useEffect(() => {
    if (!activeLiveLocationTarget) {
      const timeout = setTimeout(() => {
        if (isSharingLiveLocation) {
          console.log('RIDER_AUTO_LOCATION_STOPPED_JOB_DONE', {
            reason: 'no_active_tracking_target',
          });
          setIsSharingLiveLocation(false);
          setLiveLocationMessage('Live location stopped because the active job is done.');
        }

        if (riderManuallyDisabledLocationTarget) {
          setRiderManuallyDisabledLocationTarget(null);
        }
      }, 0);

      return () => clearTimeout(timeout);
    }

    const activeTargetKey = getLiveLocationTargetKey(activeLiveLocationTarget);
    const isCurrentTargetManuallyDisabled =
      riderManuallyDisabledLocationTarget === activeTargetKey;

    if (
      isSharingLiveLocation ||
      isCurrentTargetManuallyDisabled ||
      isFallbackMode ||
      !hasSupabaseConfig
    ) {
      if (isCurrentTargetManuallyDisabled) {
        console.log('RIDER_AUTO_LOCATION_SKIPPED_MANUALLY_DISABLED', {
          targetId: activeLiveLocationTarget.id,
          targetKind: activeLiveLocationTarget.kind,
        });
      }

      return undefined;
    }

    let isMounted = true;
    const target = activeLiveLocationTarget;

    async function enableAutoLiveLocation() {
      console.log('RIDER_AUTO_LOCATION_ENABLE_REQUEST', {
        targetId: target.id,
        targetKind: target.kind,
      });

      try {
        await requestRiderLocationPermission();

        if (isMounted) {
          setIsSharingLiveLocation(true);
          setLiveLocationMessage('Live location sharing started automatically.');
          console.log('RIDER_AUTO_LOCATION_ENABLED', {
            targetId: target.id,
            targetKind: target.kind,
          });
        }
      } catch (error) {
        console.log('RIDER_AUTO_LOCATION_PERMISSION_DENIED', {
          error: getErrorMessage(error),
          targetId: target.id,
          targetKind: target.kind,
        });

        if (isMounted) {
          Alert.alert(
            'Live location is needed while delivering',
            'Live location is needed while delivering. You can enable it later from Share Live Location.'
          );
          setLiveLocationMessage(
            'Live location permission was not granted. You can enable it later.'
          );
        }
      }
    }

    void enableAutoLiveLocation();

    return () => {
      isMounted = false;
    };
  }, [
    activeLiveLocationTarget,
    isFallbackMode,
    isSharingLiveLocation,
    riderManuallyDisabledLocationTarget,
  ]);

  useEffect(() => {
    if (!isSharingLiveLocation || !activeLiveLocationTarget || isFallbackMode || !hasSupabaseConfig) {
      return undefined;
    }

    let isMounted = true;
    const activeTarget = activeLiveLocationTarget;

    async function publishLocation() {
      try {
        if (activeTarget.kind === 'booking') {
          await publishCurrentRiderLocation(rider.id, activeTarget.id);
        } else {
          await publishCurrentRiderFoodOrderLocation(rider.id, activeTarget.id);
        }

        if (isMounted) {
          setLiveLocationMessage('Live location updated.');
        }
      } catch (error) {
        if (isMounted) {
          setLiveLocationMessage(`Live location update failed. ${getErrorMessage(error)}`);
        }
      }
    }

    void publishLocation();
    const interval = setInterval(() => {
      void publishLocation();
    }, 10000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [activeLiveLocationTarget, isFallbackMode, isSharingLiveLocation, rider.id]);

  async function handleStatusChange(job: Booking, status: BookingStatus) {
    if (updatingJobId || job.status === status) {
      return;
    }

    const previousJobs = jobs;
    setJobs((currentJobs) =>
      currentJobs.map((currentJob) =>
        currentJob.id === job.id
          ? { ...currentJob, status, updated_at: new Date().toISOString() }
          : currentJob
      )
    );

    if (isFallbackMode) {
      return;
    }

    setUpdatingJobId(job.id);
    setMessage('');

    try {
      const updatedJob = await updateRiderJobStatus(job.id, status);
      setJobs((currentJobs) =>
        currentJobs.map((currentJob) => (currentJob.id === job.id ? updatedJob : currentJob))
      );
    } catch {
      setJobs(previousJobs);
      setMessage('We could not update this job status right now. Please try again.');
    } finally {
      setUpdatingJobId(null);
    }
  }

  async function handleFoodOrderStatusChange(
    foodOrder: FoodOrderWithRestaurant,
    status: FoodOrderStatus
  ) {
    if (updatingFoodOrderId || foodOrder.status === status) {
      return;
    }

    const previousFoodOrders = foodOrders;
    setFoodOrders((currentFoodOrders) =>
      currentFoodOrders.map((currentFoodOrder) =>
        currentFoodOrder.id === foodOrder.id
          ? { ...currentFoodOrder, status, updated_at: new Date().toISOString() }
          : currentFoodOrder
      )
    );

    if (isFallbackMode) {
      return;
    }

    setUpdatingFoodOrderId(foodOrder.id);
    setMessage('');

    try {
      const updatedFoodOrder = await updateRiderFoodOrderStatus(foodOrder.id, status);
      setFoodOrders((currentFoodOrders) =>
        currentFoodOrders.map((currentFoodOrder) =>
          currentFoodOrder.id === foodOrder.id
            ? {
                ...updatedFoodOrder,
                restaurant_name: currentFoodOrder.restaurant_name,
              }
            : currentFoodOrder
        )
      );
    } catch (error) {
      console.error('Failed to update rider food order status', {
        error,
        foodOrderId: foodOrder.id,
        status,
      });
      setFoodOrders(previousFoodOrders);
      setMessage('We could not update this food delivery right now. Please try again.');
    } finally {
      setUpdatingFoodOrderId(null);
    }
  }

  function handleFoodTrackingBackHome(foodOrder: FoodOrderWithRestaurant) {
    console.log('RIDER_FOOD_TRACKING_BACK_HOME_CLICKED', {
      foodOrderId: foodOrder.id,
      status: foodOrder.status,
    });
    console.log('RIDER_FOOD_TRACKING_RETURN_HOME', {
      foodOrderId: foodOrder.id,
      isSharingLiveLocation,
    });
    setMessage('Returned to Rider Dashboard. Active delivery tracking continues.');
  }

  return (
    <AppScreen>
      <ScreenHeader showHomeButton title="Rider Mode" />
      <SectionHeader eyebrow="Phase 4B" title="Rider dashboard" />

      <View style={styles.authCard}>
        <View style={styles.authHeader}>
          <View style={styles.authCopy}>
            <Text style={styles.authTitle}>
              {authState.user ? 'Rider profile' : 'Rider login'}
            </Text>
            <Text style={styles.authSubtitle}>
              {authState.user
                ? `${authState.user.email ?? 'Signed in'} | ${toTitleCase(riderRole)} role`
                : 'Sign in to load jobs linked to your rider account, or keep using guest rider mode.'}
            </Text>
          </View>
          <Text style={styles.authBadge}>{authState.user ? 'Signed in' : 'Guest'}</Text>
        </View>

        {authState.user ? (
          <View style={styles.authActions}>
            {canLinkRider ? (
              <PrimaryButton
                disabled={isAuthSubmitting}
                title={isAuthSubmitting ? 'Linking...' : 'Link Juan Rider Profile'}
                onPress={handleLinkJuanRider}
              />
            ) : null}
            <PrimaryButton
              disabled={isAuthSubmitting}
              title={isAuthSubmitting ? 'Please wait...' : 'Sign Out'}
              variant="secondary"
              onPress={handleRiderSignOut}
            />
          </View>
        ) : (
          <View style={styles.authForm}>
            <TextInput
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="Rider email"
              placeholderTextColor={BrandColors.mutedInk}
              style={styles.input}
              value={email}
              onChangeText={setEmail}
            />
            <TextInput
              autoCapitalize="none"
              placeholder="Password"
              placeholderTextColor={BrandColors.mutedInk}
              secureTextEntry
              style={styles.input}
              value={password}
              onChangeText={setPassword}
            />
            <PrimaryButton
              disabled={isAuthSubmitting}
              title={isAuthSubmitting ? 'Signing in...' : 'Rider Login'}
              onPress={handleRiderSignIn}
            />
          </View>
        )}
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <AppIcon
            backgroundColor={BrandColors.yellow}
            color={BrandColors.darkGreen}
            name={{ ios: 'motorcycle', android: 'two_wheeler', web: 'two_wheeler' }}
            size={34}
            style={styles.heroIcon}
          />
          <View style={styles.heroCopy}>
            <Text style={styles.riderLabel}>Rider name</Text>
            <Text style={styles.riderName}>{rider.full_name}</Text>
            <Text style={styles.riderMeta}>
              {rider.motorcycle_model} | {rider.plate_number}
            </Text>
          </View>
        </View>

        <View style={styles.onlineRow}>
          <View>
            <Text style={styles.onlineLabel}>{rider.is_available ? 'Online' : 'Offline'}</Text>
            <Text style={styles.onlineHint}>
              {rider.is_available ? 'Ready to receive jobs' : 'Not accepting jobs'}
            </Text>
          </View>
          <Switch
            disabled={isUpdatingAvailability}
            ios_backgroundColor={BrandColors.border}
            onValueChange={handleAvailabilityChange}
            thumbColor={BrandColors.white}
            trackColor={{ false: BrandColors.border, true: BrandColors.limeGreen }}
            value={rider.is_available}
          />
        </View>

        <View style={styles.onlineRow}>
          <View style={styles.liveLocationCopy}>
            <Text style={styles.onlineLabel}>
              {isLiveLocationToggleOn ? 'Sharing location' : 'Live location off'}
            </Text>
            <Text style={styles.onlineHint}>
              {activeLiveLocationTarget
                ? `Active ${activeLiveLocationTarget.kind === 'booking' ? 'ride' : 'food'} ${activeLiveLocationTarget.id.slice(0, 8)}`
                : 'Starts when a ride or food job is active'}
            </Text>
          </View>
          <Switch
            ios_backgroundColor={BrandColors.border}
            onValueChange={(nextValue) => void handleLiveLocationToggle(nextValue)}
            thumbColor={BrandColors.white}
            trackColor={{ false: BrandColors.border, true: BrandColors.limeGreen }}
            value={isLiveLocationToggleOn}
          />
        </View>
      </View>

      <View style={styles.statsGrid}>
        <StatCard label="Active jobs" value={activeJobsCount} />
        <StatCard label="Completed" value={completedJobsCount} />
        <StatCard label="Active deliveries" value={activeDeliveriesCount} />
        <StatCard label="Delivered today" value={deliveredTodayCount} />
      </View>

      {message ? <Text style={styles.message}>{message}</Text> : null}
      {liveLocationMessage ? <Text style={styles.message}>{liveLocationMessage}</Text> : null}

      <InfoCard
        title="Assigned Jobs"
        subtitle={isLoading ? 'Loading rider assignments...' : 'Ride bookings and food deliveries assigned to Juan.'}>
        <View style={styles.filterChips}>
          {riderJobFilters.map((filter) => {
            const isSelected = riderJobFilter === filter.value;

            return (
              <Pressable
                accessibilityRole="button"
                key={filter.value}
                style={({ pressed }) => [
                  styles.filterChip,
                  isSelected && styles.selectedFilterChip,
                  pressed && styles.pressed,
                ]}
                onPress={() => handleRiderJobFilterChange(filter.value)}>
                <Text style={[
                  styles.filterChipText,
                  isSelected && styles.selectedFilterChipText,
                ]}>
                  {filter.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.jobsList}>
          {filteredRiderJobs.length > 0 ? (
            filteredRiderJobs.map((job) => (
              job.kind === 'ride' ? (
                <RiderJobCard
                  isFallbackMode={isFallbackMode}
                  isUpdating={updatingJobId === job.ride.id}
                  job={job.ride}
                  key={`ride-${job.id}`}
                  onStatusChange={handleStatusChange}
                />
              ) : (
                <FoodOrderCard
                  foodOrder={job.foodOrder}
                  isFallbackMode={isFallbackMode}
                  isUpdating={updatingFoodOrderId === job.foodOrder.id}
                  key={`food-${job.id}`}
                  onBackHome={handleFoodTrackingBackHome}
                  onStatusChange={handleFoodOrderStatusChange}
                />
              )
            ))
          ) : (
            <Text style={styles.emptyText}>{getRiderJobEmptyText(riderJobFilter)}</Text>
          )}
        </View>
      </InfoCard>

      <PrimaryButton title="Refresh Jobs" variant="secondary" onPress={() => void loadJobs()} />
    </AppScreen>
  );
}

type StatCardProps = {
  label: string;
  value: number;
};

function StatCard({ label, value }: StatCardProps) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

type RiderJobCardProps = {
  isFallbackMode: boolean;
  isUpdating: boolean;
  job: Booking;
  onStatusChange: (job: Booking, status: BookingStatus) => void;
};

function RiderJobCard({ isFallbackMode, isUpdating, job, onStatusChange }: RiderJobCardProps) {
  const statusColor = getStatusColor(job.status);
  const pickupPoint = getLocationPoint(job.pickup_lat, job.pickup_lng);
  const destinationPoint = getLocationPoint(job.destination_lat, job.destination_lng);
  const canOpenPickupMap = canOpenMapSearch(pickupPoint, job.pickup_location);
  const canOpenDestinationMap = canOpenMapSearch(destinationPoint, job.destination);

  return (
    <View style={styles.jobCard}>
      <View style={styles.jobHeader}>
        <View style={styles.jobTitleBlock}>
          <Text style={styles.serviceType}>{job.service_type}</Text>
          <Text style={styles.jobId}>{isFallbackMode ? 'Sample job' : `Job ${job.id.slice(0, 8)}`}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${statusColor}1F` }]}>
          <Text style={[styles.statusBadgeText, { color: statusColor }]}>
            {toStatusLabel(job.status)}
          </Text>
        </View>
      </View>

      <View style={styles.details}>
        <DetailRow label="Pickup" value={job.pickup_location} />
        <DetailRow label="Destination" value={job.destination} />
        <DetailRow label="Fare" value={formatFare(job.final_fare ?? job.fare_estimate ?? job.estimated_fare)} />
        <DetailRow label="Payment" value={job.payment_method} />
        <DetailRow label="Status" value={toStatusLabel(job.status)} />
      </View>

      <View style={styles.mapActions}>
        {canOpenPickupMap ? (
          <MapButton
            title="Open Pickup in Google Maps"
            onPress={() =>
              void openRiderSearchMap({
                fallbackQuery: job.pickup_location,
                logName: 'RIDER_OPEN_PICKUP_MAP_REQUEST',
                point: pickupPoint,
              })
            }
          />
        ) : null}
        {canOpenDestinationMap ? (
          <MapButton
            title="Open Destination in Google Maps"
            onPress={() =>
              void openRiderSearchMap({
                fallbackQuery: job.destination,
                logName: 'RIDER_OPEN_DESTINATION_MAP_REQUEST',
                point: destinationPoint,
              })
            }
          />
        ) : null}
        {pickupPoint && destinationPoint ? (
          <MapButton
            title="Open Pickup to Destination Route"
            onPress={() => void openRiderRouteMap(pickupPoint, destinationPoint)}
          />
        ) : null}
      </View>

      <View style={styles.statusActions}>
        {riderStatuses.map((status) => {
          const isSelected = job.status === status;

          return (
            <Pressable
              accessibilityRole="button"
              disabled={isUpdating}
              key={status}
              style={({ pressed }) => [
                styles.statusButton,
                isSelected && styles.selectedStatusButton,
                pressed && styles.pressed,
              ]}
              onPress={() => onStatusChange(job, status)}>
              <Text style={[styles.statusButtonText, isSelected && styles.selectedStatusText]}>
                {toStatusLabel(status)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {isUpdating ? <Text style={styles.updatingText}>Updating job status...</Text> : null}
    </View>
  );
}

type FoodOrderCardProps = {
  foodOrder: FoodOrderWithRestaurant;
  isFallbackMode: boolean;
  isUpdating: boolean;
  onBackHome: (foodOrder: FoodOrderWithRestaurant) => void;
  onStatusChange: (foodOrder: FoodOrderWithRestaurant, status: FoodOrderStatus) => void;
};

function FoodOrderCard({
  foodOrder,
  isFallbackMode,
  isUpdating,
  onBackHome,
  onStatusChange,
}: FoodOrderCardProps) {
  const statusColor = getFoodOrderStatusColor(foodOrder.status);
  const deliveryPoint = getLocationPoint(foodOrder.delivery_lat, foodOrder.delivery_lng);
  const canReturnHome = foodLiveLocationStatuses.includes(foodOrder.status);

  return (
    <View style={styles.jobCard}>
      <View style={styles.jobHeader}>
        <View style={styles.jobTitleBlock}>
          <Text style={styles.serviceType}>{foodOrder.restaurant_name}</Text>
          <Text style={styles.jobId}>
            {isFallbackMode ? 'Sample delivery' : `Food order ${foodOrder.id.slice(0, 8)}`}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${statusColor}1F` }]}>
          <Text style={[styles.statusBadgeText, { color: statusColor }]}>
            {toFoodOrderStatusLabel(foodOrder.status)}
          </Text>
        </View>
      </View>

      <View style={styles.details}>
        <DetailRow label="Customer" value={foodOrder.customer_name ?? 'Customer'} />
        <DetailRow label="Delivery address" value={foodOrder.delivery_location} />
        <DetailRow label="Total" value={formatFare(foodOrder.total_amount)} />
        <DetailRow label="Payment" value={foodOrder.payment_method} />
        <DetailRow label="Status" value={toFoodOrderStatusLabel(foodOrder.status)} />
      </View>

      <View style={styles.mapActions}>
        {canOpenMapSearch(deliveryPoint, foodOrder.delivery_location) ? (
          <MapButton
            title="Open Delivery in Google Maps"
            onPress={() =>
              void openRiderSearchMap({
                fallbackQuery: foodOrder.delivery_location,
                logName: 'RIDER_OPEN_DESTINATION_MAP_REQUEST',
                point: deliveryPoint,
              })
            }
          />
        ) : null}
        {canReturnHome ? (
          <MapButton title="Back Home" onPress={() => onBackHome(foodOrder)} />
        ) : null}
      </View>

      <View style={styles.statusActions}>
        {foodOrderStatuses.map((status) => {
          const isSelected = foodOrder.status === status;

          return (
            <Pressable
              accessibilityRole="button"
              disabled={isUpdating}
              key={status}
              style={({ pressed }) => [
                styles.statusButton,
                isSelected && styles.selectedStatusButton,
                pressed && styles.pressed,
              ]}
              onPress={() => onStatusChange(foodOrder, status)}>
              <Text style={[styles.statusButtonText, isSelected && styles.selectedStatusText]}>
                {toFoodOrderStatusLabel(status)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {isUpdating ? <Text style={styles.updatingText}>Updating food delivery...</Text> : null}
    </View>
  );
}

function MapButton({ onPress, title }: { onPress: () => void; title: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [styles.mapButton, pressed && styles.pressed]}
      onPress={onPress}>
      <Text style={styles.mapButtonText}>{title}</Text>
    </Pressable>
  );
}

type DetailRowProps = {
  label: string;
  value: string;
};

function DetailRow({ label, value }: DetailRowProps) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function createUnifiedRiderJobs(
  rideJobs: Booking[],
  foodJobs: FoodOrderWithRestaurant[]
): UnifiedRiderJob[] {
  return [
    ...rideJobs.map<UnifiedRiderJob>((ride) => ({
      id: ride.id,
      kind: 'ride',
      priority: getRideJobPriority(ride.status),
      ride,
      updatedAt: ride.updated_at,
    })),
    ...foodJobs.map<UnifiedRiderJob>((foodOrder) => ({
      foodOrder,
      id: foodOrder.id,
      kind: 'food',
      priority: getFoodJobPriority(foodOrder.status),
      updatedAt: foodOrder.updated_at,
    })),
  ];
}

function sortRiderJobs(riderJobs: UnifiedRiderJob[]) {
  return [...riderJobs].sort((a, b) => {
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }

    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

function matchesRiderJobFilter(job: UnifiedRiderJob, filter: RiderJobFilter) {
  if (filter === 'all') {
    return true;
  }

  if (filter === 'ride') {
    return job.kind === 'ride';
  }

  if (filter === 'food') {
    return job.kind === 'food';
  }

  if (filter === 'active') {
    return job.kind === 'ride'
      ? job.ride.status !== 'completed' && job.ride.status !== 'cancelled'
      : job.foodOrder.status !== 'delivered' && job.foodOrder.status !== 'cancelled';
  }

  if (filter === 'accepted') {
    return job.kind === 'ride'
      ? job.ride.status === 'accepted' || job.ride.status === 'runner_arriving'
      : job.foodOrder.status === 'accepted' ||
          job.foodOrder.status === 'preparing' ||
          job.foodOrder.status === 'picked_up';
  }

  if (filter === 'moving') {
    return job.kind === 'ride'
      ? job.ride.status === 'in_progress'
      : job.foodOrder.status === 'on_the_way';
  }

  if (filter === 'completed') {
    return job.kind === 'ride'
      ? job.ride.status === 'completed'
      : job.foodOrder.status === 'delivered';
  }

  return true;
}

function getRideJobPriority(status: BookingStatus) {
  switch (status) {
    case 'in_progress':
      return 1;
    case 'runner_arriving':
      return 3;
    case 'accepted':
      return 4;
    case 'completed':
      return 9;
    case 'cancelled':
      return 10;
    case 'pending':
    default:
      return 8;
  }
}

function getFoodJobPriority(status: FoodOrderStatus) {
  switch (status) {
    case 'on_the_way':
      return 2;
    case 'picked_up':
      return 5;
    case 'preparing':
      return 6;
    case 'accepted':
      return 7;
    case 'delivered':
      return 9;
    case 'cancelled':
      return 10;
    case 'pending':
    default:
      return 8;
  }
}

function getRiderJobEmptyText(filter: RiderJobFilter) {
  switch (filter) {
    case 'active':
      return 'No active jobs yet.';
    case 'food':
      return 'No food deliveries assigned.';
    case 'ride':
      return 'No ride bookings assigned.';
    case 'accepted':
      return 'No accepted jobs right now.';
    case 'moving':
      return 'No jobs on the way or in progress.';
    case 'completed':
      return 'No completed jobs yet.';
    case 'all':
    default:
      return 'No assigned jobs yet. New jobs will appear here.';
  }
}

function getLiveLocationTargetKey(target: NonNullable<ActiveLiveLocationTarget>) {
  return `${target.kind}:${target.id}`;
}

function formatFare(value: number) {
  return `PHP ${Math.round(value)}`;
}

function getLocationPoint(
  latitude: number | null | undefined,
  longitude: number | null | undefined
): LocationPoint | null {
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return null;
  }

  return { latitude, longitude };
}

function canOpenMapSearch(point: LocationPoint | null, fallbackQuery: string | null | undefined) {
  return Boolean(point || fallbackQuery?.trim());
}

type RiderSearchMapInput = {
  fallbackQuery: string;
  logName: 'RIDER_OPEN_PICKUP_MAP_REQUEST' | 'RIDER_OPEN_DESTINATION_MAP_REQUEST';
  point: LocationPoint | null;
};

async function openRiderSearchMap({ fallbackQuery, logName, point }: RiderSearchMapInput) {
  console.log(logName, {
    fallbackQuery,
    latitude: point?.latitude ?? null,
    longitude: point?.longitude ?? null,
  });

  const url = getSafeGoogleMapsSearchUrl(point, fallbackQuery);

  if (!url) {
    showMapOpenFailure(new Error('Map URL could not be created.'));
    return;
  }

  await openRiderMapUrl(url);
}

async function openRiderRouteMap(origin: LocationPoint | null, destination: LocationPoint | null) {
  const url = getGoogleMapsDirectionsUrl(origin, destination);

  if (!url) {
    showMapOpenFailure(new Error('Route coordinates are missing.'));
    return;
  }

  await openRiderMapUrl(url);
}

async function openRiderMapUrl(url: string) {
  console.log('RIDER_MAP_URL', url);

  try {
    await openGoogleMapsUrlDirect(url);
  } catch (error) {
    showMapOpenFailure(error);
  }
}

function showMapOpenFailure(error: unknown) {
  console.error('RIDER_MAP_OPEN_FAILED', error);
  Alert.alert(
    'Unable to open Google Maps',
    'Unable to open Google Maps. Please check if Maps or a browser is installed.'
  );
}

function toFoodOrderStatusLabel(status: FoodOrderStatus) {
  return status
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getFoodOrderStatusColor(status: FoodOrderStatus) {
  switch (status) {
    case 'accepted':
      return BrandColors.limeGreen;
    case 'preparing':
      return BrandColors.yellow;
    case 'picked_up':
      return BrandColors.green;
    case 'on_the_way':
      return BrandColors.darkGreen;
    case 'delivered':
      return BrandColors.ink;
    case 'cancelled':
      return BrandColors.danger;
    case 'pending':
    default:
      return BrandColors.mutedInk;
  }
}

function isToday(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const today = new Date();

  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

function toTitleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'object' && error && 'message' in error) {
    return String(error.message);
  }

  return 'Rider authentication is temporarily unavailable.';
}

const styles = StyleSheet.create({
  authCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: BrandColors.border,
    backgroundColor: BrandColors.white,
    padding: 16,
    gap: 14,
  },
  authHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  authCopy: {
    flex: 1,
    gap: 4,
  },
  authTitle: {
    color: BrandColors.ink,
    fontSize: 18,
    fontWeight: '900',
  },
  authSubtitle: {
    color: BrandColors.mutedInk,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },
  authBadge: {
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: BrandColors.softGreen,
    color: BrandColors.green,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: '900',
  },
  authForm: {
    gap: 10,
  },
  authActions: {
    gap: 10,
  },
  input: {
    minHeight: 50,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BrandColors.border,
    backgroundColor: BrandColors.mint,
    paddingHorizontal: 14,
    color: BrandColors.ink,
    fontSize: 15,
    fontWeight: '700',
  },
  heroCard: {
    borderRadius: 28,
    padding: 20,
    backgroundColor: BrandColors.darkGreen,
    gap: 18,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  heroIcon: {
    width: 70,
    height: 70,
    borderRadius: 26,
  },
  heroCopy: {
    flex: 1,
    gap: 3,
  },
  riderLabel: {
    color: BrandColors.yellow,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  riderName: {
    color: BrandColors.white,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '900',
  },
  riderMeta: {
    color: '#DFF3E4',
    fontSize: 13,
    fontWeight: '700',
  },
  onlineRow: {
    minHeight: 70,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  liveLocationCopy: {
    flex: 1,
  },
  onlineLabel: {
    color: BrandColors.white,
    fontSize: 17,
    fontWeight: '900',
  },
  onlineHint: {
    color: '#DFF3E4',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 3,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flexBasis: '47%',
    flexGrow: 1,
    minHeight: 96,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: BrandColors.border,
    backgroundColor: BrandColors.white,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  statValue: {
    color: BrandColors.darkGreen,
    fontSize: 30,
    fontWeight: '900',
  },
  statLabel: {
    color: BrandColors.mutedInk,
    fontSize: 13,
    fontWeight: '800',
  },
  message: {
    color: BrandColors.mutedInk,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    textAlign: 'center',
  },
  jobsList: {
    gap: 14,
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    alignItems: 'center',
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.border,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 38,
    paddingHorizontal: 12,
  },
  selectedFilterChip: {
    backgroundColor: BrandColors.green,
    borderColor: BrandColors.green,
  },
  filterChipText: {
    color: BrandColors.green,
    fontSize: 12,
    fontWeight: '900',
  },
  selectedFilterChipText: {
    color: BrandColors.white,
  },
  mapActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  mapButton: {
    alignItems: 'center',
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.green,
    borderRadius: 16,
    borderWidth: 1,
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: 12,
  },
  mapButtonText: {
    color: BrandColors.green,
    fontSize: 12,
    fontWeight: '900',
  },
  jobCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: BrandColors.border,
    backgroundColor: BrandColors.mint,
    padding: 14,
    gap: 14,
  },
  jobHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  jobTitleBlock: {
    flex: 1,
    gap: 3,
  },
  serviceType: {
    color: BrandColors.ink,
    fontSize: 18,
    fontWeight: '900',
  },
  jobId: {
    color: BrandColors.mutedInk,
    fontSize: 12,
    fontWeight: '800',
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '900',
  },
  details: {
    borderRadius: 18,
    backgroundColor: BrandColors.white,
    paddingHorizontal: 13,
  },
  detailRow: {
    minHeight: 43,
    borderBottomWidth: 1,
    borderBottomColor: BrandColors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  detailLabel: {
    flex: 1,
    color: BrandColors.mutedInk,
    fontSize: 12,
    fontWeight: '800',
  },
  detailValue: {
    flex: 1.2,
    color: BrandColors.ink,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '900',
    textAlign: 'right',
  },
  statusActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusButton: {
    minHeight: 42,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BrandColors.border,
    backgroundColor: BrandColors.white,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  selectedStatusButton: {
    backgroundColor: BrandColors.green,
    borderColor: BrandColors.green,
  },
  statusButtonText: {
    color: BrandColors.green,
    fontSize: 12,
    fontWeight: '900',
  },
  selectedStatusText: {
    color: BrandColors.white,
  },
  updatingText: {
    color: BrandColors.mutedInk,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyText: {
    color: BrandColors.mutedInk,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.84,
    transform: [{ scale: 0.99 }],
  },
});
