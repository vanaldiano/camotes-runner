import type { Session, User } from '@supabase/supabase-js';

import { supabase } from '../lib/supabase';

import type { Tables, UserRole } from '../../../src/types/database';

export type AdminProfile = Tables<'profiles'>;

export type AdminAuthState = {
  isAdmin: boolean;
  profile: AdminProfile | null;
  session: Session | null;
  user: User | null;
};

export async function getAdminAuthState(): Promise<AdminAuthState> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  return buildAdminAuthState(session);
}

export function subscribeToAdminAuthChanges(onChange: (state: AdminAuthState) => void) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    void buildAdminAuthState(session).then(onChange);
  });

  return () => {
    data.subscription.unsubscribe();
  };
}

export async function signInAdmin(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) {
    throw error;
  }

  return getAdminAuthState();
}

export async function signOutAdmin() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}

async function buildAdminAuthState(session: Session | null): Promise<AdminAuthState> {
  const user = session?.user ?? null;
  const profile = user ? await getProfile(user.id) : null;
  const role = getUserRole(user, profile);

  return {
    isAdmin: role === 'admin',
    profile,
    session,
    user,
  };
}

async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

function getUserRole(user: User | null, profile?: AdminProfile | null): UserRole {
  const rawRole =
    profile?.role ??
    getRoleFromMetadata(user?.app_metadata) ??
    getRoleFromMetadata(user?.user_metadata);

  return isUserRole(rawRole) ? rawRole : 'customer';
}

function getRoleFromMetadata(metadata: User['app_metadata'] | User['user_metadata'] | undefined) {
  const role = metadata?.role;

  return typeof role === 'string' ? role : undefined;
}

function isUserRole(value: unknown): value is UserRole {
  return value === 'customer' || value === 'rider' || value === 'admin';
}
