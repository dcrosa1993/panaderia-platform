import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { firstValueFrom } from 'rxjs';

import { CapacitorUpdater } from '@capgo/capacitor-updater';
import {
  AppUpdateManifest,
  AppUpdateService,
  OtaUpdateManifest,
  PANADERIA_APP_ID,
} from '../../core/updates/app-update.service';

@Component({
  selector: 'app-updates-page',
  standalone: true,
  imports: [DatePipe],
  template: `
    <main class="mx-auto w-full min-w-0 max-w-4xl space-y-5 sm:space-y-6">
      <header>
        <p class="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
          APLICACIÓN
        </p>

        <h1 class="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Acerca de y actualizaciones
        </h1>

        <p class="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Consulta la versión instalada, revisa las novedades y busca actualizaciones de Panadería
          Gestión.
        </p>
      </header>

      <!-- Información de la instalación -->
      <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div class="flex items-start gap-4">
          <div
            class="grid size-14 shrink-0 place-items-center rounded-2xl bg-blue-800 text-2xl font-extrabold text-white"
            aria-hidden="true"
          >
            P
          </div>

          <div class="min-w-0 flex-1">
            <h2 class="text-lg font-bold text-slate-900">Panadería Gestión</h2>

            <p class="mt-1 text-sm text-slate-500">
              Gestión de ingredientes, recetas, productos y costes de producción.
            </p>

            @if (isNativeApp) {
              <div class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <span class="text-slate-600">
                  Versión:
                  <strong class="text-slate-900">
                    {{ currentVersion() ?? 'Consultando…' }}
                  </strong>
                </span>

                <span class="text-slate-600">
                  Compilación:
                  <strong class="text-slate-900">
                    {{ currentBuild() ?? 'No disponible' }}
                  </strong>
                </span>
              </div>
            } @else {
              <span
                class="mt-3 inline-block rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700"
              >
                Versión web
              </span>
            }
          </div>
        </div>

        @if (nativeInfoError()) {
          <div
            class="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
          >
            {{ nativeInfoError() }}
          </div>
        }
      </section>

      <!-- Comprobación de actualizaciones -->
      <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 class="font-semibold text-slate-900">Actualizaciones disponibles</h2>

            <p class="mt-1 text-sm leading-6 text-slate-500">
              Consultamos el canal estable publicado en updates.may.cu.
            </p>
          </div>

          <button
            type="button"
            class="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            [disabled]="isChecking()"
            (click)="checkForUpdates()"
          >
            @if (isChecking()) {
              <span
                class="size-4 animate-spin rounded-full border-2 border-slate-300 border-t-blue-700"
                aria-hidden="true"
              ></span>
              Comprobando…
            } @else {
              <span aria-hidden="true">↻</span>
              Comprobar de nuevo
            }
          </button>
        </div>

        @if (errorMessage()) {
          <div
            role="alert"
            class="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800"
          >
            <p class="font-semibold">No se pudo completar la comprobación</p>
            <p class="mt-1">{{ errorMessage() }}</p>
          </div>
        }

        @if (lastChecked(); as checked) {
          <p class="mt-3 text-xs text-slate-400">
            Última comprobación: {{ checked | date: 'short' }}
          </p>
        }

        @if (latest(); as release) {
          <div class="mt-5 border-t border-slate-100 pt-5">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p class="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Última versión estable
                </p>

                <p class="mt-1 text-2xl font-bold text-slate-900">
                  {{ release.versionName }}
                </p>

                <p class="mt-1 text-xs text-slate-500">
                  Compilación {{ release.versionCode }} · Publicada
                  {{ release.publishedAt | date: 'mediumDate' }}
                </p>
              </div>

              @if (updateAvailable()) {
                <span
                  class="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800"
                >
                  Nueva versión
                </span>
              } @else if (upToDate()) {
                <span class="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-800">
                  Estás al día
                </span>
              }
            </div>

            @if (updateAvailable()) {
              <div class="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <h3 class="font-semibold text-emerald-950">Hay una actualización disponible</h3>

                <p class="mt-1 text-sm leading-6 text-emerald-900">
                  Tienes instalada la versión {{ currentVersion() }}. Puedes descargar la versión
                  {{ release.versionName }}.
                </p>
              </div>
            } @else if (upToDate()) {
              <div class="mt-4 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                <p class="text-sm leading-6 text-blue-900">
                  Tu aplicación ya tiene la última versión publicada en el canal estable.
                </p>
              </div>
            } @else if (manifestBehind()) {
              <div
                class="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900"
              >
                La versión instalada es más reciente que la publicada en el canal estable. No se
                recomienda instalar una versión anterior.
              </div>
            } @else if (isNativeApp) {
              <div
                class="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600"
              >
                No pudimos comparar las compilaciones de forma fiable. Comprueba la versión
                instalada antes de actualizar.
              </div>
            } @else {
              <div
                class="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600"
              >
                Estás usando la versión web. Puedes consultar la última versión Android, pero la
                aplicación web no tiene un código de compilación Android que comparar.
              </div>
            }

            @if (release.releaseNotes.length > 0) {
              <div class="mt-5">
                <h3 class="font-semibold text-slate-900">Novedades de esta versión</h3>

                <ul class="mt-3 space-y-2">
                  @for (note of release.releaseNotes; track $index) {
                    <li class="flex items-start gap-2 text-sm leading-6 text-slate-600">
                      <span
                        class="mt-2 size-1.5 shrink-0 rounded-full bg-emerald-600"
                        aria-hidden="true"
                      ></span>
                      <span>{{ note }}</span>
                    </li>
                  }
                </ul>
              </div>
            }

            @if (!isNativeApp || updateAvailable()) {
              <button
                type="button"
                class="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-800 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800 sm:w-auto"
                (click)="downloadLatest()"
              >
                <span aria-hidden="true">↓</span>
                Descargar versión {{ release.versionName }}
              </button>

              <p class="mt-3 text-xs leading-5 text-slate-500">
                La descarga se abrirá en el navegador. Al terminar, abre el archivo APK descargado y
                sigue las indicaciones de Android para instalarlo.
              </p>
            }
          </div>
        }
      </section>

      <!-- Actualizaciones web OTA -->
      <section
        class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
        aria-labelledby="ota-title"
      >
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 id="ota-title" class="font-semibold text-slate-900">
              Actualizaciones de la interfaz
            </h2>
            <p class="mt-1 text-sm leading-6 text-slate-500">
              Actualiza las vistas y los estilos sin descargar una APK completa.
            </p>
          </div>

          @if (isNativeApp) {
            <button
              type="button"
              class="min-h-11 w-full rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 sm:w-auto"
              [disabled]="isCheckingOta()"
              (click)="checkForOtaUpdates()"
            >
              {{ isCheckingOta() ? 'Comprobando…' : 'Comprobar OTA' }}
            </button>
          }
        </div>

        @if (!isNativeApp) {
          <div class="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p class="text-sm leading-6 text-slate-600">
              Las actualizaciones OTA están disponibles en la aplicación Android instalada, no en la
              versión abierta desde el navegador.
            </p>
          </div>
        } @else {
          <div class="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Paquete web activo
            </p>
            <p class="mt-1 break-all text-sm font-semibold text-slate-900">
              @if (currentOtaVersion() === 'builtin') {
                Integrado en la APK
              } @else {
                {{ currentOtaVersion() ?? 'Consultando…' }}
              }
            </p>
          </div>

          @if (lastOtaChecked(); as checked) {
            <p class="mt-3 text-xs text-slate-400">
              Última comprobación OTA: {{ checked | date: 'short' }}
            </p>
          }

          @if (otaError()) {
            <div
              role="alert"
              class="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800"
            >
              {{ otaError() }}
            </div>
          }

          @if (otaMessage()) {
            <div
              role="status"
              class="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900"
            >
              {{ otaMessage() }}
            </div>
          }

          @if (latestOta(); as release) {
            <div class="mt-5 border-t border-slate-100 pt-5">
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p class="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Último paquete web estable
                  </p>
                  <p class="mt-1 text-2xl font-bold text-slate-900">
                    {{ release.version }}
                  </p>
                  <p class="mt-1 text-xs text-slate-500">
                    Revisión {{ release.revision }} · Publicado
                    {{ release.publishedAt | date: 'mediumDate' }}
                  </p>
                </div>

                @if (otaNativeBuildIncompatible()) {
                  <span
                    class="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900"
                  >
                    Requiere actualizar la APK
                  </span>
                } @else if (otaUpdateAvailable()) {
                  <span
                    class="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800"
                  >
                    Actualización disponible
                  </span>
                } @else if (otaUpToDate()) {
                  <span class="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-800">
                    Interfaz actualizada
                  </span>
                }
              </div>

              @if (otaNativeBuildIncompatible()) {
                <div class="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p class="text-sm leading-6 text-amber-900">
                    Este paquete requiere la compilación nativa {{ release.minNativeBuild }}.
                    Actualiza primero la APK desde la sección de actualizaciones de la aplicación.
                  </p>
                </div>
              } @else if (otaUpdateAvailable()) {
                <div class="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <p class="text-sm leading-6 text-emerald-950">
                    Hay una nueva versión web compatible con tu APK. Puedes descargarla y decidir
                    cuándo aplicarla.
                  </p>
                </div>
              } @else if (otaUpToDate()) {
                <div class="mt-4 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                  <p class="text-sm leading-6 text-blue-900">
                    Estás utilizando la última versión web publicada para tu canal estable.
                  </p>
                </div>
              } @else if (otaManifestBehind()) {
                <div class="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p class="text-sm leading-6 text-amber-900">
                    La versión web activa es más reciente que el paquete publicado. No instalaremos
                    una versión anterior.
                  </p>
                </div>
              } @else {
                <div class="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p class="text-sm leading-6 text-slate-600">
                    No pudimos comparar la versión web activa con la publicada de forma fiable. No
                    aplicaremos ninguna actualización automáticamente.
                  </p>
                </div>
              }

              @if (release.releaseNotes.length > 0) {
                <h3 class="mt-5 font-semibold text-slate-900">Novedades</h3>
                <ul class="mt-3 space-y-2">
                  @for (note of release.releaseNotes; track $index) {
                    <li class="flex items-start gap-2 text-sm leading-6 text-slate-600">
                      <span class="mt-2 size-1.5 shrink-0 rounded-full bg-emerald-600"></span>
                      <span>{{ note }}</span>
                    </li>
                  }
                </ul>
              }

              @if (otaUpdateAvailable()) {
                <button
                  type="button"
                  class="mt-5 min-h-12 w-full rounded-xl bg-blue-800 px-5 py-3 text-sm font-bold text-white hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                  [disabled]="isDownloadingOta() || isApplyingOta()"
                  (click)="installOtaUpdate()"
                >
                  @if (isDownloadingOta()) {
                    Descargando actualización… {{ otaProgress() ?? 0 }}%
                  } @else if (isApplyingOta()) {
                    Aplicando actualización…
                  } @else {
                    Descargar e instalar actualización
                  }
                </button>

                @if (isDownloadingOta()) {
                  <div class="mt-3 max-w-md" aria-live="polite">
                    <div
                      class="mb-1 flex justify-between text-xs font-medium text-slate-600"
                    >
                      <span>Progreso de descarga</span>
                      <span>{{ otaProgress() ?? 0 }}%</span>
                    </div>
                    <div
                      class="h-2 overflow-hidden rounded-full bg-slate-200"
                      role="progressbar"
                      aria-label="Progreso de descarga OTA"
                      aria-valuemin="0"
                      aria-valuemax="100"
                      [attr.aria-valuenow]="otaProgress() ?? 0"
                    >
                      <div
                        class="h-full rounded-full bg-blue-700 transition-all"
                        [style.width.%]="otaProgress() ?? 0"
                      ></div>
                    </div>
                  </div>
                }
              }
            </div>
          }
        }
      </section>

      <!-- Nota de distribución -->
      <aside class="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <h2 class="text-sm font-semibold text-amber-950">Antes de instalar una actualización</h2>

        <p class="mt-1 text-sm leading-6 text-amber-900">
          Android puede solicitar autorización para instalar aplicaciones descargadas desde el
          navegador. Las actualizaciones deben conservar el identificador de la aplicación y
          utilizar una firma compatible con la instalada. No desinstales la aplicación si no estás
          seguro de la procedencia de la APK.
        </p>
      </aside>

      <footer class="pb-2 text-center text-xs text-slate-400">
        Panadería Gestión · Canal estable
      </footer>
    </main>
  `,
})
export class UpdatesPage implements OnInit {
  private readonly updateService = inject(AppUpdateService);

  readonly isNativeApp = Capacitor.isNativePlatform();

  readonly currentVersion = signal<string | null>(null);
  readonly currentBuild = signal<number | null>(null);
  readonly nativeInfoError = signal<string | null>(null);

  readonly latest = signal<AppUpdateManifest | null>(null);
  readonly isChecking = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly lastChecked = signal<Date | null>(null);

  readonly currentOtaVersion = signal<string | null>(null);
  readonly latestOta = signal<OtaUpdateManifest | null>(null);

  readonly isCheckingOta = signal(false);
  readonly isDownloadingOta = signal(false);
  readonly isApplyingOta = signal(false);
  readonly otaProgress = signal<number | null>(null);

  readonly otaError = signal<string | null>(null);
  readonly otaMessage = signal<string | null>(null);
  readonly lastOtaChecked = signal<Date | null>(null);

  readonly otaNativeBuildIncompatible = computed(() => {
    const release = this.latestOta();
    const build = this.currentBuild();

    return this.isNativeApp && release !== null && build !== null && build < release.minNativeBuild;
  });

  readonly otaUpdateAvailable = computed(() => {
    const release = this.latestOta();
    const current = this.currentOtaVersion();
    const build = this.currentBuild();

    if (
      !this.isNativeApp ||
      !release ||
      current === null ||
      build === null ||
      build < release.minNativeBuild
    ) {
      return false;
    }

    // The first OTA starts from the bundle embedded in the native APK.
    if (current === 'builtin') {
      return true;
    }

    const comparison = compareOtaVersions(release.version, current);
    return comparison !== null && comparison > 0;
  });

  readonly otaUpToDate = computed(() => {
    const release = this.latestOta();

    return (
      this.isNativeApp &&
      release !== null &&
      this.currentOtaVersion() === release.version &&
      !this.otaNativeBuildIncompatible()
    );
  });

  readonly otaManifestBehind = computed(() => {
    const release = this.latestOta();
    const current = this.currentOtaVersion();

    if (!release || !current || current === 'builtin') {
      return false;
    }

    const comparison = compareOtaVersions(current, release.version);
    return comparison !== null && comparison > 0;
  });

  readonly updateAvailable = computed(() => {
    const installedBuild = this.currentBuild();
    const release = this.latest();

    return (
      this.isNativeApp &&
      installedBuild !== null &&
      release !== null &&
      release.versionCode > installedBuild
    );
  });

  readonly upToDate = computed(() => {
    const installedBuild = this.currentBuild();
    const release = this.latest();

    return (
      this.isNativeApp &&
      installedBuild !== null &&
      release !== null &&
      installedBuild === release.versionCode
    );
  });

  readonly manifestBehind = computed(() => {
    const installedBuild = this.currentBuild();
    const release = this.latest();

    return (
      this.isNativeApp &&
      installedBuild !== null &&
      release !== null &&
      installedBuild > release.versionCode
    );
  });

  ngOnInit(): void {
    void this.initialize();
  }

  private async initialize(): Promise<void> {
    if (this.isNativeApp) {
      await this.loadInstalledAppInfo();
    }

    await Promise.all([
      this.checkForUpdates(),
      this.isNativeApp ? this.checkForOtaUpdates() : Promise.resolve(),
    ]);
  }

  private async loadInstalledAppInfo(): Promise<void> {
    try {
      const info = await App.getInfo();

      if (info.id !== PANADERIA_APP_ID) {
        this.nativeInfoError.set(
          'El identificador de esta instalación no coincide con Panadería Gestión.',
        );
        return;
      }

      this.currentVersion.set(info.version);

      const build = Number(info.build);

      if (!Number.isSafeInteger(build) || build < 1) {
        this.nativeInfoError.set('No se pudo leer un código de compilación válido.');
        return;
      }

      this.currentBuild.set(build);
    } catch {
      this.nativeInfoError.set('No se pudo consultar la versión instalada en este dispositivo.');
    }
  }

  async checkForUpdates(): Promise<void> {
    if (this.isChecking()) {
      return;
    }

    this.isChecking.set(true);
    this.errorMessage.set(null);

    try {
      const release = await firstValueFrom(this.updateService.getLatestManifest());

      this.latest.set(release);
      this.lastChecked.set(new Date());
    } catch (error: unknown) {
      this.errorMessage.set(this.describeError(error));
    } finally {
      this.isChecking.set(false);
    }
  }

  async downloadLatest(): Promise<void> {
    const release = this.latest();

    if (!release) {
      return;
    }

    try {
      if (this.isNativeApp) {
        await Browser.open({
          url: release.apkUrl,
          toolbarColor: '#1e40af',
        });
      } else {
        window.open(release.apkUrl, '_blank', 'noopener,noreferrer');
      }
    } catch {
      this.errorMessage.set(
        'No se pudo abrir la descarga. Comprueba tu conexión e inténtalo de nuevo.',
      );
    }
  }

  async checkForOtaUpdates(): Promise<void> {
    if (!this.isNativeApp || this.isCheckingOta()) {
      return;
    }

    this.isCheckingOta.set(true);
    this.otaError.set(null);
    this.otaMessage.set(null);

    try {
      const [current, release] = await Promise.all([
        CapacitorUpdater.current(),
        firstValueFrom(this.updateService.getLatestOtaManifest()),
      ]);

      const activeVersion = current.bundle?.version;

      this.currentOtaVersion.set(
        typeof activeVersion === 'string' && activeVersion.length > 0 ? activeVersion : 'builtin',
      );

      this.latestOta.set(release);
      this.lastOtaChecked.set(new Date());
    } catch (error: unknown) {
      this.otaError.set(this.describeOtaError(error));
    } finally {
      this.isCheckingOta.set(false);
    }
  }

  async installOtaUpdate(): Promise<void> {
    const release = this.latestOta();

    if (
      !this.isNativeApp ||
      !release ||
      !this.otaUpdateAvailable() ||
      this.isDownloadingOta() ||
      this.isApplyingOta()
    ) {
      return;
    }

    this.isDownloadingOta.set(true);
    this.otaProgress.set(0);
    this.otaError.set(null);
    this.otaMessage.set(null);

    let listener: PluginListenerHandle | null = null;
    let bundle: Awaited<ReturnType<typeof CapacitorUpdater.download>> | null = null;
    let failed = false;
    let failure: unknown;

    try {
      listener = await CapacitorUpdater.addListener('updaterEvent', (event) => {
        if (event.type === 'download' && event.data.bundle.version === release.version) {
          if (Number.isFinite(event.data.percent)) {
            this.otaProgress.set(Math.max(0, Math.min(100, event.data.percent)));
          }
        }
      });

      bundle = await CapacitorUpdater.download({
        url: release.bundleUrl,
        version: release.version,
        checksum: release.checksum,
      });

      if (bundle.version !== release.version || bundle.id.length === 0) {
        throw new Error('El plugin devolvió un bundle OTA que no coincide con el manifiesto.');
      }
    } catch (error: unknown) {
      failed = true;
      failure = error;
    }

    if (listener) {
      try {
        await listener.remove();
      } catch (error: unknown) {
        if (!failed) {
          failed = true;
          failure = error;
        }
      }
    }

    this.isDownloadingOta.set(false);

    if (failed || !bundle) {
      this.otaProgress.set(null);
      this.otaError.set(
        this.describeOtaError(
          failed ? failure : new Error('La descarga no devolvió información del bundle OTA.'),
        ),
      );
      return;
    }

    this.isApplyingOta.set(true);
    this.otaMessage.set(
      `La versión web ${release.version} se descargó correctamente. Se está aplicando y la aplicación se reiniciará.`,
    );

    try {
      await CapacitorUpdater.set({ id: bundle.id });
    } catch (error: unknown) {
      this.isApplyingOta.set(false);
      this.otaProgress.set(null);
      this.otaMessage.set(null);
      this.otaError.set(this.describeOtaError(error));
    }
  }

  private describeOtaError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        return 'No se pudo conectar con el servidor OTA. Comprueba la conexión y el acceso a updates.may.cu.';
      }

      if (error.status === 404) {
        return 'No se encontró el manifiesto OTA. Comprueba la publicación de /ota/stable.json en el VPS.';
      }

      return `El servidor OTA respondió con HTTP ${error.status}.`;
    }

    if (error instanceof Error) {
      return error.message;
    }

    return 'No se pudo completar la operación OTA.';
  }

  private describeError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        return 'No se pudo conectar con el servidor de actualizaciones. Comprueba Internet y el acceso a updates.may.cu.';
      }

      if (error.status === 404) {
        return 'El servidor no tiene publicado stable.json. Comprueba la publicación en el VPS.';
      }

      return `El servidor de actualizaciones respondió con el código HTTP ${error.status}.`;
    }

    if (error instanceof Error) {
      return error.message;
    }

    return 'Ocurrió un error inesperado al comprobar las actualizaciones.';
  }
}

function compareOtaVersions(left: string, right: string): number | null {
  const pattern = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/;

  const parse = (value: string) => {
    const match = pattern.exec(value);

    if (!match) {
      return null;
    }

    return {
      numbers: [Number(match[1]), Number(match[2]), Number(match[3])],
      prerelease: match[4]?.split('.') ?? null,
    };
  };

  const a = parse(left);
  const b = parse(right);

  if (!a || !b) {
    return null;
  }

  for (let i = 0; i < 3; i++) {
    if (a.numbers[i] !== b.numbers[i]) {
      return a.numbers[i] > b.numbers[i] ? 1 : -1;
    }
  }

  if (a.prerelease === null && b.prerelease === null) {
    return 0;
  }

  if (a.prerelease === null) {
    return 1;
  }

  if (b.prerelease === null) {
    return -1;
  }

  const length = Math.max(a.prerelease.length, b.prerelease.length);

  for (let i = 0; i < length; i++) {
    const av = a.prerelease[i];
    const bv = b.prerelease[i];

    if (av === undefined) return -1;
    if (bv === undefined) return 1;
    if (av === bv) continue;

    const an = /^\d+$/.test(av);
    const bn = /^\d+$/.test(bv);

    if (an && bn) {
      return Number(av) > Number(bv) ? 1 : -1;
    }

    if (an !== bn) {
      return an ? -1 : 1;
    }

    return av > bv ? 1 : -1;
  }

  return 0;
}
