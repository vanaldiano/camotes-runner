import { useEffect, useState } from 'react';
import { Animated, Easing, Linking, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { PrimaryButton } from '@/components/primary-button';
import { BrandColors } from '@/constants/brand';

type DeliveryTrackingStep = {
  description: string;
  key: string;
  label: string;
};

type DeliveryTrackingMapAction = {
  label: string;
  onPress: () => void;
};

type DeliveryRouteTarget = 'delivery' | 'shop';

type DeliveryTrackingCardProps = {
  currentStepKey: string;
  distanceKm?: number | null;
  etaPrimary: string;
  etaMinutes?: number | null;
  etaSecondary?: string | null;
  icon?: {
    android: string;
    ios: string;
    web: string;
  };
  isRefreshing?: boolean;
  isWaitingForLocation?: boolean;
  isWaitingForRider?: boolean;
  lastUpdated?: string | null;
  mapActions?: DeliveryTrackingMapAction[];
  onRefresh?: () => void;
  riderName?: string | null;
  riderPhone?: string | null;
  routeTarget?: DeliveryRouteTarget;
  serviceLabel: string;
  statusLabel: string;
  statusMessage: string;
  steps: DeliveryTrackingStep[];
};

export function DeliveryTrackingCard({
  currentStepKey,
  distanceKm,
  etaPrimary,
  etaMinutes,
  etaSecondary,
  icon = { ios: 'shippingbox.fill', android: 'local_shipping', web: 'local_shipping' },
  isRefreshing = false,
  isWaitingForLocation = false,
  isWaitingForRider = false,
  lastUpdated,
  mapActions = [],
  onRefresh,
  riderName,
  riderPhone,
  routeTarget = 'delivery',
  serviceLabel,
  statusLabel,
  statusMessage,
  steps,
}: DeliveryTrackingCardProps) {
  const currentStepIndex = Math.max(
    steps.findIndex((step) => step.key === currentStepKey),
    0
  );

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <AppIcon
          backgroundColor={BrandColors.yellow}
          color={BrandColors.darkGreen}
          name={icon}
          size={34}
          style={styles.icon}
        />
        <View style={styles.headerCopy}>
          <Text style={styles.serviceLabel}>{serviceLabel}</Text>
          <Text style={styles.statusLabel}>{statusLabel}</Text>
          <Text style={styles.statusMessage}>{statusMessage}</Text>
        </View>
      </View>

      <DeliveryRouteAnimation
        distanceKm={distanceKm}
        etaMinutes={etaMinutes}
        isWaitingForLocation={isWaitingForLocation}
        isWaitingForRider={isWaitingForRider}
        routeTarget={routeTarget}
        status={currentStepKey}
      />

      <View style={styles.etaBox}>
        <Text style={styles.etaCaption}>Estimated update</Text>
        <Text style={styles.etaPrimary}>{etaPrimary}</Text>
        {etaSecondary ? <Text style={styles.etaSecondary}>{etaSecondary}</Text> : null}
      </View>

      <View style={styles.riderBox}>
        <View>
          <Text style={styles.riderLabel}>Rider</Text>
          <Text style={styles.riderValue}>{riderName || 'Waiting for rider assignment'}</Text>
          <Text style={styles.updateText}>
            Last updated: {lastUpdated || 'Waiting for rider update'}
          </Text>
        </View>
        {riderPhone ? (
          <PrimaryButton
            title="Contact Rider"
            variant="secondary"
            style={styles.contactButton}
            onPress={() => void Linking.openURL(`tel:${riderPhone}`)}
          />
        ) : null}
      </View>

      <View style={styles.autoUpdateBox}>
        <Text style={styles.autoUpdateText}>We will update this automatically.</Text>
        {onRefresh ? (
          <PrimaryButton
            disabled={isRefreshing}
            title={isRefreshing ? 'Refreshing...' : 'Refresh'}
            variant="secondary"
            style={styles.refreshButton}
            onPress={onRefresh}
          />
        ) : null}
      </View>

      <View style={styles.timeline}>
        {steps.map((step, index) => (
          <View style={styles.timelineItem} key={step.key}>
            <View style={styles.timelineRail}>
              <View
                style={[
                  styles.timelineDot,
                  index <= currentStepIndex && styles.timelineDotActive,
                ]}
              />
              {index < steps.length - 1 ? (
                <View
                  style={[
                    styles.timelineLine,
                    index < currentStepIndex && styles.timelineLineActive,
                  ]}
                />
              ) : null}
            </View>
            <View
              style={[
                styles.timelineCard,
                index === currentStepIndex && styles.timelineCardActive,
              ]}>
              <Text
                style={[
                  styles.timelineLabel,
                  index === currentStepIndex && styles.timelineLabelActive,
                ]}>
                {step.label}
              </Text>
              <Text style={styles.timelineDescription}>{step.description}</Text>
            </View>
          </View>
        ))}
      </View>

      {mapActions.length > 0 ? (
        <View style={styles.mapActions}>
          <Text style={styles.mapHint}>Map is optional for delivery orders.</Text>
          {mapActions.map((action) => (
            <PrimaryButton
              key={action.label}
              title={action.label}
              variant="secondary"
              onPress={action.onPress}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function DeliveryRouteAnimation({
  distanceKm,
  etaMinutes,
  isWaitingForLocation,
  isWaitingForRider,
  routeTarget,
  status,
}: {
  distanceKm?: number | null;
  etaMinutes?: number | null;
  isWaitingForLocation: boolean;
  isWaitingForRider: boolean;
  routeTarget: DeliveryRouteTarget;
  status: string;
}) {
  const [microProgress] = useState(() => new Animated.Value(0));
  const [routeOpacity] = useState(() => new Animated.Value(1));
  const [pulse] = useState(() => new Animated.Value(0));
  const [routeWidth, setRouteWidth] = useState(0);
  const normalizedStatus = normalizeRouteStatus(status);
  const isActive = normalizedStatus === 'active';
  const isComplete = normalizedStatus === 'complete';
  const isCancelled = normalizedStatus === 'cancelled';
  const routeFillProgress = getRouteFillProgress(status, distanceKm, {
    isWaitingForLocation,
    isWaitingForRider,
  });
  const shouldAnimateRoute =
    isActive &&
    typeof distanceKm === 'number' &&
    Number.isFinite(distanceKm) &&
    distanceKm > 0.1 &&
    !isComplete &&
    !isCancelled &&
    !isWaitingForRider &&
    !isWaitingForLocation;
  const travelDistance = Math.max(routeWidth - 76, 0);
  const routeLineWidth = Math.max(routeWidth - 56, 0);
  const routeFillWidth = routeLineWidth * routeFillProgress;
  const motorcycleBaseX = travelDistance * routeFillProgress;
  const motorcycleMicroTravel = shouldAnimateRoute
    ? Math.min(12, Math.max(travelDistance - motorcycleBaseX, 0))
    : 0;
  const animatedMicroX = microProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [motorcycleBaseX, motorcycleBaseX + motorcycleMicroTravel],
  });
  const routeCopy = getRouteCopy({
    distanceKm,
    etaMinutes,
    isWaitingForLocation,
    isWaitingForRider,
    routeTarget,
    status,
  });

  useEffect(() => {
    microProgress.stopAnimation();
    routeOpacity.stopAnimation();

    if (!shouldAnimateRoute) {
      microProgress.setValue(0);
      routeOpacity.setValue(1);
      return undefined;
    }

    let isMounted = true;
    let resetTimer: ReturnType<typeof setTimeout> | undefined;

    function runMicroAnimation() {
      microProgress.setValue(0);
      routeOpacity.setValue(1);

      Animated.timing(microProgress, {
        duration: 1700,
        easing: Easing.out(Easing.quad),
        toValue: 1,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished || !isMounted) {
          return;
        }

        Animated.timing(routeOpacity, {
          duration: 120,
          easing: Easing.out(Easing.quad),
          toValue: 0,
          useNativeDriver: true,
        }).start(({ finished: fadeOutFinished }) => {
          if (!fadeOutFinished || !isMounted) {
            return;
          }

          microProgress.setValue(0);

          Animated.timing(routeOpacity, {
            duration: 120,
            easing: Easing.out(Easing.quad),
            toValue: 1,
            useNativeDriver: true,
          }).start(({ finished: fadeInFinished }) => {
            if (!fadeInFinished || !isMounted) {
              return;
            }

            resetTimer = setTimeout(runMicroAnimation, 700);
          });
        });
      });
    }

    runMicroAnimation();

    return () => {
      isMounted = false;
      if (resetTimer) {
        clearTimeout(resetTimer);
      }
      microProgress.stopAnimation();
      routeOpacity.stopAnimation();
    };
  }, [distanceKm, microProgress, routeOpacity, shouldAnimateRoute, status]);

  useEffect(() => {
    pulse.stopAnimation();

    if (isComplete || isCancelled) {
      pulse.setValue(isComplete ? 1 : 0);
      return undefined;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          duration: 1200,
          easing: Easing.out(Easing.quad),
          toValue: 1,
          useNativeDriver: false,
        }),
        Animated.timing(pulse, {
          duration: 1200,
          easing: Easing.in(Easing.quad),
          toValue: 0,
          useNativeDriver: false,
        }),
      ])
    );

    loop.start();

    return () => {
      loop.stop();
    };
  }, [isCancelled, isComplete, pulse]);

  return (
    <View
      style={[
        styles.routeCard,
        isCancelled && styles.routeCardCancelled,
        isComplete && styles.routeCardComplete,
      ]}>
      <View style={styles.routeTopRow}>
        <Text style={styles.routeEyebrow}>
          {routeTarget === 'shop' ? 'Pickup progress' : 'Delivery progress'}
        </Text>
        <View style={[styles.etaBadge, isCancelled && styles.etaBadgeCancelled]}>
          <Text style={[styles.etaBadgeText, isCancelled && styles.etaBadgeTextCancelled]}>
            {routeCopy.eta}
          </Text>
        </View>
      </View>

      <View
        style={styles.routeStage}
        onLayout={(event) => setRouteWidth(event.nativeEvent.layout.width)}>
        <View style={styles.routeBaseLine} />
        <Animated.View
          style={[
            styles.routeActiveLine,
            isCancelled && styles.routeActiveLineCancelled,
            { width: routeFillWidth },
          ]}
        />
        <Animated.View
          style={[
            styles.routeMotorcycle,
            { opacity: routeOpacity },
            { transform: [{ translateX: animatedMicroX }] },
          ]}>
          <AppIcon
            backgroundColor={BrandColors.yellow}
            color={isCancelled ? BrandColors.mutedInk : BrandColors.darkGreen}
            name={{ ios: 'motorcycle', android: 'two_wheeler', web: 'two_wheeler' }}
            size={22}
            style={styles.routeMotorcycleIcon}
          />
        </Animated.View>
        <View style={styles.routePinWrap}>
          <Animated.View
            style={[
              styles.routePinPulse,
              {
                opacity: pulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.15, 0.55],
                }),
                transform: [
                  {
                    scale: pulse.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1.45],
                    }),
                  },
                ],
              },
            ]}
          />
          <AppIcon
            backgroundColor={isComplete ? BrandColors.green : BrandColors.white}
            color={isComplete ? BrandColors.white : BrandColors.green}
            name={{ ios: 'mappin.circle.fill', android: 'location_on', web: 'location_on' }}
            size={24}
            style={styles.routePinIcon}
          />
        </View>
      </View>

      <Text style={styles.routeDistance}>{routeCopy.distance}</Text>
    </View>
  );
}

function normalizeRouteStatus(status: string) {
  if (status === 'delivered' || status === 'completed') {
    return 'complete';
  }

  if (status === 'cancelled') {
    return 'cancelled';
  }

  if (status === 'picked_up' || status === 'on_the_way') {
    return 'active';
  }

  if (status === 'accepted' || status === 'preparing') {
    return 'preparing';
  }

  return 'pending';
}

function getRouteFillProgress(
  status: string,
  distanceKm: number | null | undefined,
  options: {
    isWaitingForLocation: boolean;
    isWaitingForRider: boolean;
  }
) {
  const normalizedStatus = normalizeRouteStatus(status);

  if (normalizedStatus === 'complete') {
    return 1;
  }

  if (normalizedStatus === 'cancelled') {
    return 0;
  }

  if (options.isWaitingForRider || options.isWaitingForLocation) {
    return 0.05;
  }

  if (normalizedStatus === 'pending') {
    return 0.05;
  }

  if (normalizedStatus === 'preparing') {
    return 0.18;
  }

  if (
    normalizedStatus === 'active' &&
    typeof distanceKm === 'number' &&
    Number.isFinite(distanceKm)
  ) {
    if (distanceKm === 0) {
      return 1;
    }

    if (distanceKm <= 0.1) {
      return 0.95;
    }

    if (distanceKm > 5) {
      return 0.35;
    }

    if (distanceKm > 2) {
      return 0.55;
    }

    if (distanceKm > 1) {
      return 0.7;
    }

    return 0.85;
  }

  if (normalizedStatus === 'active') {
    return 0.35;
  }

  return 0.05;
}

function getRouteCopy({
  distanceKm,
  etaMinutes,
  isWaitingForLocation,
  isWaitingForRider,
  routeTarget,
  status,
}: {
  distanceKm?: number | null;
  etaMinutes?: number | null;
  isWaitingForLocation: boolean;
  isWaitingForRider: boolean;
  routeTarget: DeliveryRouteTarget;
  status: string;
}) {
  const normalizedStatus = normalizeRouteStatus(status);

  if (normalizedStatus === 'complete') {
    return {
      distance: 'Delivered successfully',
      eta: 'Arrived',
    };
  }

  if (normalizedStatus === 'cancelled') {
    return {
      distance: 'Delivery cancelled',
      eta: 'Cancelled',
    };
  }

  if (isWaitingForRider) {
    return {
      distance: 'Waiting for rider assignment',
      eta: 'Will update soon',
    };
  }

  if (isWaitingForLocation) {
    return {
      distance: 'Waiting for rider location',
      eta: 'ETA will update soon',
    };
  }

  if (normalizedStatus === 'pending') {
    return {
      distance: 'Waiting for order confirmation',
      eta: 'Will update soon',
    };
  }

  if (normalizedStatus === 'preparing') {
    return {
      distance:
        routeTarget === 'shop'
          ? 'Rider is heading to the shop'
          : 'Delivery ETA will update after pickup',
      eta: formatRouteEta(etaMinutes, routeTarget === 'shop' ? 'Pickup ETA' : 'Estimated arrival'),
    };
  }

  return {
    distance: formatRouteDistance(distanceKm),
    eta: formatRouteEta(etaMinutes, 'Estimated arrival'),
  };
}

function formatRouteDistance(distanceKm: number | null | undefined) {
  if (typeof distanceKm !== 'number' || !Number.isFinite(distanceKm)) {
    return 'Distance unavailable';
  }

  if (distanceKm === 0) {
    return 'Rider is at the delivery area';
  }

  if (distanceKm <= 0.1) {
    return `Rider is almost there • ${formatMeters(distanceKm)} m away`;
  }

  return `Rider is ${distanceKm.toFixed(1)} km away`;
}

function formatRouteEta(etaMinutes: number | null | undefined, label: string) {
  if (typeof etaMinutes !== 'number' || !Number.isFinite(etaMinutes)) {
    return 'ETA will update soon';
  }

  if (etaMinutes <= 1) {
    return `${label}: Arriving now`;
  }

  return `${label}: ${Math.round(etaMinutes)} min`;
}

function formatMeters(distanceKm: number) {
  return Math.max(1, Math.round(distanceKm * 1000));
}

const styles = StyleSheet.create({
  autoUpdateBox: {
    alignItems: 'center',
    backgroundColor: BrandColors.background,
    borderColor: BrandColors.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    padding: 12,
  },
  autoUpdateText: {
    color: BrandColors.mutedInk,
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  card: {
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.border,
    borderRadius: 28,
    borderWidth: 1,
    elevation: 3,
    gap: 14,
    padding: 16,
    shadowColor: BrandColors.cardShadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
  },
  contactButton: {
    minHeight: 40,
    minWidth: 112,
  },
  etaBox: {
    backgroundColor: BrandColors.softGreen,
    borderColor: BrandColors.limeGreen,
    borderRadius: 22,
    borderWidth: 1,
    gap: 4,
    padding: 14,
  },
  etaCaption: {
    color: BrandColors.green,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  etaPrimary: {
    color: BrandColors.darkGreen,
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 30,
  },
  etaSecondary: {
    color: BrandColors.mutedInk,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 19,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
  },
  headerCopy: {
    flex: 1,
    gap: 3,
  },
  icon: {
    borderRadius: 26,
    height: 70,
    width: 70,
  },
  mapActions: {
    gap: 10,
  },
  mapHint: {
    color: BrandColors.mutedInk,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
    textAlign: 'center',
  },
  refreshButton: {
    minHeight: 40,
    minWidth: 104,
  },
  etaBadge: {
    backgroundColor: BrandColors.yellow,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  etaBadgeCancelled: {
    backgroundColor: BrandColors.background,
  },
  etaBadgeText: {
    color: BrandColors.darkGreen,
    fontSize: 11,
    fontWeight: '900',
  },
  etaBadgeTextCancelled: {
    color: BrandColors.mutedInk,
  },
  riderBox: {
    alignItems: 'center',
    borderColor: BrandColors.border,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    padding: 13,
  },
  riderLabel: {
    color: BrandColors.mutedInk,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  riderValue: {
    color: BrandColors.ink,
    fontSize: 15,
    fontWeight: '900',
    marginTop: 2,
  },
  routeActiveLine: {
    backgroundColor: '#22C55E',
    borderRadius: 999,
    height: 5,
    left: 28,
    position: 'absolute',
    top: 23,
  },
  routeActiveLineCancelled: {
    backgroundColor: BrandColors.mutedInk,
  },
  routeBaseLine: {
    backgroundColor: BrandColors.border,
    borderRadius: 999,
    height: 5,
    left: 28,
    position: 'absolute',
    right: 28,
    top: 23,
  },
  routeCard: {
    backgroundColor: '#F7FFF8',
    borderColor: BrandColors.border,
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
    minHeight: 108,
    padding: 12,
  },
  routeCardCancelled: {
    backgroundColor: BrandColors.background,
  },
  routeCardComplete: {
    backgroundColor: BrandColors.softGreen,
    borderColor: BrandColors.limeGreen,
  },
  routeDistance: {
    color: BrandColors.darkGreen,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 18,
  },
  routeEyebrow: {
    color: BrandColors.green,
    flex: 1,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  routeMotorcycle: {
    left: 0,
    position: 'absolute',
    top: 3,
  },
  routeMotorcycleIcon: {
    borderColor: BrandColors.white,
    borderRadius: 16,
    borderWidth: 2,
    height: 42,
    width: 42,
  },
  routePinIcon: {
    borderColor: BrandColors.softGreen,
    borderRadius: 18,
    borderWidth: 1,
    height: 42,
    width: 42,
  },
  routePinPulse: {
    backgroundColor: BrandColors.limeGreen,
    borderRadius: 24,
    height: 48,
    position: 'absolute',
    width: 48,
  },
  routePinWrap: {
    alignItems: 'center',
    height: 48,
    justifyContent: 'center',
    position: 'absolute',
    right: 0,
    top: 0,
    width: 48,
  },
  routeStage: {
    height: 50,
    overflow: 'hidden',
  },
  routeTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  serviceLabel: {
    color: BrandColors.green,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  statusLabel: {
    color: BrandColors.ink,
    fontSize: 23,
    fontWeight: '900',
    lineHeight: 29,
  },
  statusMessage: {
    color: BrandColors.mutedInk,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 19,
  },
  timeline: {
    gap: 0,
  },
  timelineCard: {
    backgroundColor: BrandColors.background,
    borderRadius: 18,
    flex: 1,
    marginBottom: 10,
    minHeight: 66,
    padding: 13,
  },
  timelineCardActive: {
    backgroundColor: BrandColors.softGreen,
    borderColor: BrandColors.limeGreen,
    borderWidth: 1,
  },
  timelineDescription: {
    color: BrandColors.mutedInk,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    marginTop: 3,
  },
  timelineDot: {
    backgroundColor: BrandColors.border,
    borderRadius: 7,
    height: 14,
    marginTop: 15,
    width: 14,
  },
  timelineDotActive: {
    backgroundColor: BrandColors.green,
  },
  timelineItem: {
    flexDirection: 'row',
    gap: 12,
  },
  timelineLabel: {
    color: BrandColors.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  timelineLabelActive: {
    color: BrandColors.green,
  },
  timelineLine: {
    backgroundColor: BrandColors.border,
    flex: 1,
    marginTop: 5,
    width: 2,
  },
  timelineLineActive: {
    backgroundColor: BrandColors.green,
  },
  timelineRail: {
    alignItems: 'center',
    width: 20,
  },
  updateText: {
    color: BrandColors.mutedInk,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    marginTop: 3,
  },
});
