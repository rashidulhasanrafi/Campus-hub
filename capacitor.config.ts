import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.campushub.app',
  appName: 'Campus Hub',
  webDir: 'out',
  server: {
    androidScheme: 'https',
    cleartext: true
  }
};

export default config;
