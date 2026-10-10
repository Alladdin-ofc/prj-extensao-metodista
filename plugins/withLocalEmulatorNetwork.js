const { AndroidConfig, withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('node:fs/promises');
const path = require('node:path');

const networkSecurityXml = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="false" />
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="false">localhost</domain>
        <domain includeSubdomains="false">127.0.0.1</domain>
    </domain-config>
</network-security-config>
`;

module.exports = function withLocalEmulatorNetwork(config) {
  if (process.env.EXPO_PUBLIC_FIREBASE_EMULATORS !== '1') return config;

  config = withAndroidManifest(config, (mod) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(mod.modResults);
    application.$['android:usesCleartextTraffic'] = 'false';
    application.$['android:networkSecurityConfig'] = '@xml/local_emulator_network_security_config';
    return mod;
  });

  return withDangerousMod(config, ['android', async (mod) => {
    const xmlDirectory = path.join(mod.modRequest.platformProjectRoot, 'app/src/main/res/xml');
    await fs.mkdir(xmlDirectory, { recursive: true });
    await fs.writeFile(path.join(xmlDirectory, 'local_emulator_network_security_config.xml'), networkSecurityXml, 'utf8');
    return mod;
  }]);
};
