import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  Keyframe,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { BrandColors } from '@/constants/brand';

const INITIAL_SCALE_FACTOR = Dimensions.get('screen').height / 90;
const DURATION = 1200;

export function AnimatedSplashOverlay() {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  const splashKeyframe = new Keyframe({
    0: {
      transform: [{ scale: INITIAL_SCALE_FACTOR }],
      opacity: 1,
    },
    20: {
      opacity: 1,
    },
    70: {
      opacity: 0,
      easing: Easing.elastic(0.7),
    },
    100: {
      opacity: 0,
      transform: [{ scale: 1 }],
      easing: Easing.elastic(0.7),
    },
  });

  return (
    <Animated.View
      entering={splashKeyframe.duration(DURATION).withCallback((finished) => {
        'worklet';
        if (finished) {
          scheduleOnRN(setVisible, false);
        }
      })}
      style={styles.splashBackground}>
      <View style={styles.splashLogoShell}>
        <Image source={require('@/assets/images/logo.png')} style={styles.splashLogo} contentFit="contain" />
      </View>
      <View style={styles.tropicalArt}>
        <View style={styles.splashSun} />
        <View style={styles.splashIsland} />
        <View style={styles.splashPalmTrunk} />
        <View style={styles.splashPalmLeaf} />
      </View>
      <Text style={styles.splashTitle}>Camotes Runner</Text>
      <Text style={styles.splashTagline}>We Run, You Relax.</Text>
      <Text style={styles.splashSubtext}>Local rides, errands, and deliveries around Camotes.</Text>
      <LoadingIndicator />
    </Animated.View>
  );
}

function LoadingIndicator() {
  const progress = useSharedValue(0.45);

  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: 760 }), -1, true);
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scaleX: progress.value }],
  }));

  return (
    <View style={styles.loadingTrack}>
      <Animated.View style={[styles.loadingFill, animatedStyle]} />
    </View>
  );
}

const keyframe = new Keyframe({
  0: {
    transform: [{ scale: INITIAL_SCALE_FACTOR }],
  },
  100: {
    transform: [{ scale: 1 }],
    easing: Easing.elastic(0.7),
  },
});

const logoKeyframe = new Keyframe({
  0: {
    transform: [{ scale: 1.3 }],
    opacity: 0,
  },
  40: {
    transform: [{ scale: 1.3 }],
    opacity: 0,
    easing: Easing.elastic(0.7),
  },
  100: {
    opacity: 1,
    transform: [{ scale: 1 }],
    easing: Easing.elastic(0.7),
  },
});

const glowKeyframe = new Keyframe({
  0: {
    transform: [{ rotateZ: '0deg' }],
  },
  100: {
    transform: [{ rotateZ: '7200deg' }],
  },
});

export function AnimatedIcon() {
  return (
    <View style={styles.iconContainer}>
      <Animated.View entering={glowKeyframe.duration(60 * 1000 * 4)} style={styles.glow}>
        <Image style={styles.glow} source={require('@/assets/images/logo-glow.png')} />
      </Animated.View>

      <Animated.View entering={keyframe.duration(DURATION)} style={styles.background} />
      <Animated.View style={styles.imageContainer} entering={logoKeyframe.duration(DURATION)}>
        <Image style={styles.image} source={require('@/assets/images/logo.png')} contentFit="contain" />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  imageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  glow: {
    width: 201,
    height: 201,
    position: 'absolute',
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 128,
    height: 128,
    zIndex: 100,
  },
  image: {
    position: 'absolute',
    width: 76,
    height: 76,
  },
  background: {
    borderRadius: 40,
    experimental_backgroundImage: `linear-gradient(180deg, ${BrandColors.yellow}, ${BrandColors.green})`,
    width: 128,
    height: 128,
    position: 'absolute',
  },
  splashBackground: {
    ...StyleSheet.absoluteFill,
    experimental_backgroundImage: `linear-gradient(160deg, ${BrandColors.darkGreen}, ${BrandColors.green} 58%, ${BrandColors.yellow})`,
    zIndex: 1000,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  splashLogoShell: {
    width: 116,
    height: 116,
    borderRadius: 32,
    backgroundColor: BrandColors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BrandColors.darkGreen,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 8,
  },
  splashLogo: {
    width: 84,
    height: 84,
  },
  tropicalArt: {
    width: 156,
    height: 74,
    marginTop: 22,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  splashSun: {
    position: 'absolute',
    top: 0,
    right: 28,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: BrandColors.yellow,
  },
  splashIsland: {
    width: 150,
    height: 32,
    borderTopLeftRadius: 80,
    borderTopRightRadius: 80,
    backgroundColor: '#2DA653',
  },
  splashPalmTrunk: {
    position: 'absolute',
    bottom: 19,
    width: 8,
    height: 46,
    borderRadius: 5,
    backgroundColor: '#7B5E2B',
    transform: [{ rotate: '8deg' }],
  },
  splashPalmLeaf: {
    position: 'absolute',
    bottom: 55,
    width: 62,
    height: 28,
    borderRadius: 28,
    backgroundColor: BrandColors.limeGreen,
    transform: [{ rotate: '-12deg' }],
  },
  splashTitle: {
    color: BrandColors.white,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '900',
    marginTop: 12,
    textAlign: 'center',
  },
  splashTagline: {
    color: BrandColors.paleYellow,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '800',
    marginTop: 6,
    textAlign: 'center',
  },
  splashSubtext: {
    color: '#DFF3E4',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    marginTop: 10,
    textAlign: 'center',
    maxWidth: 280,
  },
  loadingTrack: {
    width: 118,
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.24)',
    marginTop: 28,
    overflow: 'hidden',
  },
  loadingFill: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    backgroundColor: BrandColors.yellow,
  },
});
