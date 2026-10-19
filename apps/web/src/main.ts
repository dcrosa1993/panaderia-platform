import { bootstrapApplication } from '@angular/platform-browser';
import { Capacitor } from '@capacitor/core';
import { CapacitorUpdater } from '@capgo/capacitor-updater';

import { appConfig } from './app/app.config';
import { App } from './app/app';

if (Capacitor.isNativePlatform()) {
  // Confirm the new bundle before Angular starts making application requests.
  void CapacitorUpdater.notifyAppReady()
    .then(() => console.info('[OTA] App startup confirmed.'))
    .catch((error: unknown) => {
      console.error('[OTA] Could not confirm app readiness:', error);
    });
}

bootstrapApplication(App, appConfig).catch((error) => {
  console.error('Angular bootstrap failed:', error);
});
