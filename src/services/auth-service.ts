import type { Session, User } from '@supabase/supabase-js';

import { supabase } from '@/services/supabase';
import type { Tables, UserRole } from '@/types/database';

export type UserProfile = Tables<'profiles'>;

export type AuthCredentials = {
  email: string;
  password: string;
};

export type CustomerSignUpInput = AuthCredentials & {
  fullName: string;
  phone: string;
};

export type AuthState = {
  profile: UserProfile | null;
  session: Session | null;
  user: User | null;
};

export async function getCurrentAuthState(): Promise<AuthState> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  const user = session?.user ?? null;
  const profile = user ? await getProfile(user.id) : null;

  return { profile, session, user };
}

export function subscribeToAuthChanges(onChange: (state: AuthState) => void) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    const user = session?.user ?? null;

    void (async () => {
      const profile = user ? await getProfile(user.id) : null;
      onChange({ profile, session, user });
    })();
  });

  return () => {
    data.subscription.unsubscribe();
  };
}

export async function signInWithEmail({ email, password }: AuthCredentials) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function signUpCustomer({ email, fullName, password, phone }: CustomerSignUpInput) {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: {
        full_name: fullName.trim(),
        phone: phone.trim(),
        role: 'customer',
      },
    },
  });

  if (error) {
    throw error;
  }

  if (data.user) {
    await upsertProfile({
      email: data.user.email ?? email.trim(),
      full_name: fullName.trim(),
      id: data.user.id,
      phone: phone.trim() || null,
      role: 'customer',
    });
  }

  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}

export async function getProfile(userId: string) {
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

export async function upsertProfile(
  input: Pick<UserProfile, 'email' | 'full_name' | 'id' | 'phone' | 'role'>
) {
  const { data, error } = await supabase
    .from('profiles')
    .upsert({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .select('*')
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export function getUserRole(user: User | null, profile?: UserProfile | null): UserRole {
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
