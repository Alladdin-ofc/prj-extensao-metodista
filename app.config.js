const base = require('./app.json').expo;

module.exports = () => {
  if (process.env.EXPO_PUBLIC_FIREBASE_EMULATORS !== '1') return base;

  const defaultIdentifier = 'com.arrudonimous.Metodista';
  return {
    ...base,
    name: 'Metodista QA',
    android: {
      ...base.android,
      package: `${base.android?.package || defaultIdentifier}.qa`
    },
    ios: {
      ...base.ios,
      bundleIdentifier: `${base.ios?.bundleIdentifier || defaultIdentifier}.qa`
    },
    plugins: [...(base.plugins || []), './plugins/withLocalEmulatorNetwork']
  };
};
