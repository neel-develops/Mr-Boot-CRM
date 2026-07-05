import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mrboot.crm',
  appName: 'Mr. Boot',
  webDir: 'capacitor-dist',
  server: {
    url: 'https://mr-boot-crm.vercel.app',
    cleartext: true
  }
};

export default config;
