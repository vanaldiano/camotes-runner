import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

import type { Database } from '@/types/database';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

const serverMemoryStorage = {
  isServer: true,
  getItem: (_key: string) => null,
  removeItem: (_key: string) => undefined,
  setItem: (_key: string, _value: string) => undefined,
};

const authStorage =
  Platform.OS === 'web' && typeof window === 'undefined' ? serverMemoryStorage : AsyncStorage;

export const supabase = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      storage: authStorage,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      persistSession: true,
    },
  }
);
