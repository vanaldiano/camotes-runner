export type AppVariant = 'customer' | 'rider';

export const appVariant: AppVariant =
  process.env.EXPO_PUBLIC_APP_VARIANT === 'rider' ? 'rider' : 'customer';

export const isCustomerAppVariant = appVariant === 'customer';
export const isRiderAppVariant = appVariant === 'rider';
