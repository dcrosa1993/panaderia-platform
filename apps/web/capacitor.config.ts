import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'cu.may.panaderia',
  appName: 'Panadería Gestión',
  webDir: 'dist/web/browser',
  plugins: {
    CapacitorUpdater: {
      autoUpdate: 'off',
    },
  },
};

export default config;
