import { bootstrapApplication } from '@angular/platform-browser';
import { Capacitor } from '@capacitor/core';
import { CapacitorUpdater } from '@capgo/capacitor-updater';

import { appConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, appConfig)
  .then(async (appRef) => {
    // Confirm that the app started successfully on native platforms.
    if (Capacitor.isNativePlatform()) {
      try {
        await CapacitorUpdater.notifyAppReady();
        console.info('[OTA] App startup confirmed.');
      } catch (error) {
        // Do not prevent Angular from running if the updater fails.
        console.error('[OTA] Could not confirm app readiness:', error);
      }
    }

    return appRef;
  })
  .catch((error) => {
    console.error('Angular bootstrap failed:', error);
  });
