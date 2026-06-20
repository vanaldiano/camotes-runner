import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const rootEnv = loadEnv(mode, '..', 'EXPO_PUBLIC_');
  const adminEnv = loadEnv(mode, '.', 'EXPO_PUBLIC_');

  return {
    build: {
      emptyOutDir: true,
      outDir: '../admin-dist',
    },
    define: {
      'import.meta.env.EXPO_PUBLIC_SUPABASE_ANON_KEY': JSON.stringify(
        adminEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY || rootEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY || ''
      ),
      'import.meta.env.EXPO_PUBLIC_SUPABASE_URL': JSON.stringify(
        adminEnv.EXPO_PUBLIC_SUPABASE_URL || rootEnv.EXPO_PUBLIC_SUPABASE_URL || ''
      ),
    },
    envPrefix: ['VITE_', 'EXPO_PUBLIC_'],
    plugins: [react()],
  };
});
