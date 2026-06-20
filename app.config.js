const baseConfig = require('./app.json');

const variant = process.env.APP_VARIANT === 'rider' ? 'rider' : 'customer';

const variantConfig = {
  customer: {
    appName: 'Camotes Runner',
    packageId: 'com.camotesrunner.customer',
  },
  rider: {
    appName: 'Camotes Runner Rider',
    packageId: 'com.camotesrunner.rider',
  },
}[variant];

const googleServicesFile =
  variant === 'rider'
    ? process.env.GOOGLE_SERVICES_JSON_RIDER ?? process.env.GOOGLE_SERVICES_JSON
    : process.env.GOOGLE_SERVICES_JSON_CUSTOMER ?? process.env.GOOGLE_SERVICES_JSON;

module.exports = {
  expo: {
    ...baseConfig.expo,
    name: variantConfig.appName,
    android: {
      ...baseConfig.expo.android,
      package: variantConfig.packageId,
      ...(googleServicesFile ? { googleServicesFile } : {}),
    },
    extra: {
      ...baseConfig.expo.extra,
      appVariant: variant,
      firebase: {
        androidPackageId: variantConfig.packageId,
        googleServicesFileConfigured: Boolean(googleServicesFile),
      },
    },
  },
};
