import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { AppScreen } from '@/components/app-screen';
import { PrimaryButton } from '@/components/primary-button';
import { isRiderAppVariant } from '@/constants/app-variant';
import { BrandColors } from '@/constants/brand';
import {
  getCurrentAuthState,
  getUserRole,
  signInWithEmail,
  signOut,
  signUpCustomer,
  subscribeToAuthChanges,
  type AuthState,
} from '@/services/auth-service';
import { hasSupabaseConfig } from '@/services/supabase';

const profileSections = [
  {
    title: 'Saved Places',
    subtitle: 'Home, work, ports, and favorite island stops',
    icon: { ios: 'mappin.and.ellipse', android: 'place', web: 'place' },
  },
  {
    title: 'Payment Methods',
    subtitle: 'Cash and GCash preferences',
    icon: { ios: 'creditcard.fill', android: 'payments', web: 'payments' },
  },
  {
    title: 'Notifications',
    subtitle: 'Booking alerts and promo updates',
    icon: { ios: 'bell.fill', android: 'notifications', web: 'notifications' },
  },
  {
    title: 'Ride History',
    subtitle: 'Past rides, errands, and deliveries',
    icon: { ios: 'clock.fill', android: 'history', web: 'history' },
  },
  {
    title: 'Support',
    subtitle: 'Help with bookings and app questions',
    icon: { ios: 'headphones', android: 'support_agent', web: 'support_agent' },
  },
  {
    title: 'About Camotes Runner',
    subtitle: 'Local service, island-first mission',
    icon: { ios: 'info.circle.fill', android: 'info', web: 'info' },
  },
  {
    title: 'Logout',
    subtitle: 'Sign out of this customer account',
    icon: { ios: 'rectangle.portrait.and.arrow.right', android: 'logout', web: 'logout' },
  },
];

export function ProfileScreen() {
  const [authState, setAuthState] = useState<AuthState>({
    profile: null,
    session: null,
    user: null,
  });
  const [authMode, setAuthMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [authMessage, setAuthMessage] = useState(
    hasSupabaseConfig ? '' : 'Guest mode is active because Supabase is not configured.'
  );
  const [isAuthLoading, setIsAuthLoading] = useState(hasSupabaseConfig);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!hasSupabaseConfig) {
      return undefined;
    }

    void getCurrentAuthState()
      .then((currentAuthState) => {
        setAuthState(currentAuthState);
      })
      .catch(() => {
        setAuthMessage('We could not load your login state. Guest mode still works.');
      })
      .finally(() => {
        setIsAuthLoading(false);
      });

    return subscribeToAuthChanges((nextAuthState) => {
      setAuthState(nextAuthState);
      setIsAuthLoading(false);
    });
  }, []);

  const isAuthenticated = Boolean(authState.user);
  const role = getUserRole(authState.user, authState.profile);
  const displayName = isAuthLoading
    ? 'Loading account...'
    : authState.profile?.full_name ??
      authState.user?.user_metadata.full_name ??
      authState.user?.email ??
      'Guest customer';
  const displayEmail = isAuthLoading
    ? 'Checking saved session'
    : authState.profile?.email ?? authState.user?.email ?? 'Guest mode';
  const displayPhone = isAuthLoading ? 'Please wait' : authState.profile?.phone ?? 'No phone added';

  async function handleAuthSubmit() {
    if (!hasSupabaseConfig) {
      setAuthMessage('Supabase is not configured yet. Guest booking and food ordering still work.');
      return;
    }

    setIsSubmitting(true);
    setAuthMessage('');

    try {
      if (authMode === 'sign-up') {
        await signUpCustomer({ email, fullName, password, phone });
        setAuthMessage('Account created. You can keep using the app while your session loads.');
      } else {
        await signInWithEmail({ email, password });
        setAuthMessage('Signed in.');
      }

      setAuthState(await getCurrentAuthState());
      setPassword('');
    } catch (error) {
      setAuthMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSignOut() {
    setIsSubmitting(true);
    setAuthMessage('');

    try {
      await signOut();
      setAuthState({ profile: null, session: null, user: null });
      setAuthMessage('Signed out. Guest mode is available anytime.');
    } catch (error) {
      setAuthMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AppScreen>
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Image source={require('@/assets/images/logo.png')} style={styles.avatarLogo} contentFit="contain" />
        </View>

        <View style={styles.profileCopy}>
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.detail}>{displayPhone}</Text>
          <Text style={styles.detail}>{displayEmail}</Text>
          <Text style={styles.since}>
            {isAuthLoading
              ? 'Checking session'
              : isAuthenticated
                ? `${toTitleCase(role)} account`
                : 'Guest mode'}
          </Text>
        </View>
      </View>

      <View style={styles.authCard}>
        <View style={styles.authHeader}>
          <View>
            <Text style={styles.authTitle}>
              {isAuthLoading ? 'Account' : isAuthenticated ? 'Account' : 'Customer login'}
            </Text>
            <Text style={styles.authSubtitle}>
              {isAuthLoading
                ? 'Checking for a saved login on this device.'
                : isAuthenticated
                ? 'You are signed in. Guest checkout remains available for testing.'
                : 'Sign in or create an account. Guest booking still works.'}
            </Text>
          </View>
          <Text style={styles.authBadge}>
            {isAuthLoading ? 'Checking' : isAuthenticated ? 'Signed in' : 'Guest'}
          </Text>
        </View>

        {isAuthLoading ? (
          <Text style={styles.authMessage}>Loading your saved session...</Text>
        ) : isAuthenticated ? (
          <PrimaryButton
            disabled={isSubmitting}
            title={isSubmitting ? 'Signing out...' : 'Sign Out'}
            variant="danger"
            onPress={handleSignOut}
          />
        ) : (
          <View style={styles.authForm}>
            <View style={styles.authModeRow}>
              <Pressable
                accessibilityRole="button"
                style={[styles.authModeButton, authMode === 'sign-in' && styles.selectedAuthMode]}
                onPress={() => setAuthMode('sign-in')}>
                <Text
                  style={[
                    styles.authModeText,
                    authMode === 'sign-in' && styles.selectedAuthModeText,
                  ]}>
                  Sign In
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                style={[styles.authModeButton, authMode === 'sign-up' && styles.selectedAuthMode]}
                onPress={() => setAuthMode('sign-up')}>
                <Text
                  style={[
                    styles.authModeText,
                    authMode === 'sign-up' && styles.selectedAuthModeText,
                  ]}>
                  Sign Up
                </Text>
              </Pressable>
            </View>

            {authMode === 'sign-up' ? (
              <>
                <TextInput
                  autoCapitalize="words"
                  placeholder="Full name"
                  placeholderTextColor={BrandColors.mutedInk}
                  style={styles.input}
                  value={fullName}
                  onChangeText={setFullName}
                />
                <TextInput
                  keyboardType="phone-pad"
                  placeholder="Phone"
                  placeholderTextColor={BrandColors.mutedInk}
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                />
              </>
            ) : null}

            <TextInput
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="Email"
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
              disabled={isSubmitting}
              title={isSubmitting ? 'Please wait...' : authMode === 'sign-up' ? 'Create Account' : 'Sign In'}
              onPress={handleAuthSubmit}
            />
          </View>
        )}

        {authMessage ? <Text style={styles.authMessage}>{authMessage}</Text> : null}
      </View>

      {isRiderAppVariant ? (
        <PrimaryButton title="Open Rider Mode" onPress={() => router.push('/rider')} />
      ) : null}

      <PrimaryButton
        title="Notification Diagnostics"
        variant="secondary"
        onPress={() => router.push('/notification-debug' as Href)}
      />

      <View style={styles.menuList}>
        {profileSections.map((section) => {
          const isLogout = section.title === 'Logout';

          return (
            <Pressable
              key={section.title}
              accessibilityRole="button"
              style={({ pressed }) => [styles.menuItem, pressed && styles.pressed]}
              onPress={isLogout ? handleSignOut : undefined}>
              <AppIcon
                backgroundColor={isLogout ? '#FFF0EE' : BrandColors.softGreen}
                color={isLogout ? BrandColors.danger : BrandColors.green}
                name={section.icon}
                size={22}
                style={styles.menuIcon}
              />
              <View style={styles.menuCopy}>
                <Text style={[styles.menuTitle, isLogout && styles.logoutText]}>{section.title}</Text>
                <Text style={styles.menuSubtitle}>{section.subtitle}</Text>
              </View>
              <Text style={[styles.chevron, isLogout && styles.logoutText]}>›</Text>
            </Pressable>
          );
        })}
      </View>
    </AppScreen>
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

  return 'Authentication is temporarily unavailable.';
}

const styles = StyleSheet.create({
  profileHeader: {
    borderRadius: 28,
    padding: 20,
    backgroundColor: BrandColors.darkGreen,
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatar: {
    width: 86,
    height: 86,
    borderRadius: 30,
    backgroundColor: BrandColors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLogo: {
    width: 56,
    height: 56,
  },
  profileCopy: {
    flex: 1,
    gap: 4,
  },
  name: {
    color: BrandColors.white,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '900',
  },
  detail: {
    color: '#DFF3E4',
    fontSize: 13,
    fontWeight: '700',
  },
  since: {
    alignSelf: 'flex-start',
    color: BrandColors.darkGreen,
    backgroundColor: BrandColors.yellow,
    borderRadius: 999,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 12,
    fontWeight: '900',
    marginTop: 4,
  },
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
    marginTop: 4,
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
  authModeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  authModeButton: {
    minHeight: 42,
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BrandColors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BrandColors.white,
  },
  selectedAuthMode: {
    borderColor: BrandColors.green,
    backgroundColor: BrandColors.softGreen,
  },
  authModeText: {
    color: BrandColors.mutedInk,
    fontSize: 13,
    fontWeight: '900',
  },
  selectedAuthModeText: {
    color: BrandColors.green,
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
  authMessage: {
    color: BrandColors.mutedInk,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },
  menuList: {
    gap: 10,
  },
  menuItem: {
    minHeight: 76,
    borderRadius: 24,
    backgroundColor: BrandColors.white,
    borderWidth: 1,
    borderColor: BrandColors.border,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuIcon: {
    width: 48,
    height: 48,
    borderRadius: 18,
  },
  menuCopy: {
    flex: 1,
    gap: 3,
  },
  menuTitle: {
    color: BrandColors.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  menuSubtitle: {
    color: BrandColors.mutedInk,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
  },
  chevron: {
    color: BrandColors.mutedInk,
    fontSize: 28,
    fontWeight: '400',
  },
  logoutText: {
    color: BrandColors.danger,
  },
  pressed: {
    opacity: 0.84,
    transform: [{ scale: 0.99 }],
  },
});
