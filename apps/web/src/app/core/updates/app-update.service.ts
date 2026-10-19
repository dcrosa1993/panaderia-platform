import { HttpBackend, HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, timeout } from 'rxjs';

export const PANADERIA_APP_ID = 'cu.may.panaderia';

export const UPDATE_MANIFEST_URL = 'https://updates.may.cu/stable.json';

export const OTA_UPDATE_MANIFEST_URL = 'https://updates.may.cu/ota/stable.json';

export interface AppUpdateManifest {
  schemaVersion: 1;
  appId: string;
  channel: 'stable';
  versionName: string;
  versionCode: number;
  apkUrl: string;
  sha256: string;
  publishedAt: string;
  releaseNotes: string[];
}

export interface OtaUpdateManifest {
  schemaVersion: 1;
  appId: string;
  channel: 'stable';
  version: string;
  revision: number;
  minNativeBuild: number;
  bundleUrl: string;
  checksum: string;
  publishedAt: string;
  releaseNotes: string[];
}

@Injectable({ providedIn: 'root' })
export class AppUpdateService {
  /*
   * Deliberately bypass application interceptors. The public update
   * server must never receive an API token or an active bakery header.
   */
  private readonly http = new HttpClient(inject(HttpBackend));

  getLatestManifest(): Observable<AppUpdateManifest> {
    return this.http.get<unknown>(UPDATE_MANIFEST_URL).pipe(
      timeout({ first: 12000 }),
      map((value) => validateApkManifest(value)),
    );
  }

  getLatestOtaManifest(): Observable<OtaUpdateManifest> {
    return this.http.get<unknown>(OTA_UPDATE_MANIFEST_URL).pipe(
      timeout({ first: 12000 }),
      map((value) => validateOtaManifest(value)),
    );
  }
}

function validateApkManifest(value: unknown): AppUpdateManifest {
  const data = asRecord(value);

  if (data['schemaVersion'] !== 1) {
    throw new Error('Formato de manifiesto APK no compatible.');
  }

  validateIdentity(data);

  if (
    typeof data['versionName'] !== 'string' ||
    data['versionName'].trim().length === 0 ||
    typeof data['versionCode'] !== 'number' ||
    !Number.isSafeInteger(data['versionCode']) ||
    data['versionCode'] < 1
  ) {
    throw new Error('El manifiesto APK contiene una versión inválida.');
  }

  if (typeof data['sha256'] !== 'string' || !/^[a-fA-F0-9]{64}$/.test(data['sha256'])) {
    throw new Error('El manifiesto APK contiene un SHA-256 inválido.');
  }

  return {
    schemaVersion: 1,
    appId: PANADERIA_APP_ID,
    channel: 'stable',
    versionName: data['versionName'],
    versionCode: data['versionCode'],
    apkUrl: validateHostedUrl(data['apkUrl'], '/apk/'),
    sha256: data['sha256'].toLowerCase(),
    publishedAt: validateDate(data['publishedAt']),
    releaseNotes: validateReleaseNotes(data['releaseNotes']),
  };
}

function validateOtaManifest(value: unknown): OtaUpdateManifest {
  const data = asRecord(value);

  if (data['schemaVersion'] !== 1) {
    throw new Error('Formato de manifiesto OTA no compatible.');
  }

  validateIdentity(data);

  if (
    typeof data['version'] !== 'string' ||
    !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(data['version'])
  ) {
    throw new Error('La versión OTA debe seguir el formato SemVer.');
  }

  if (
    typeof data['revision'] !== 'number' ||
    !Number.isSafeInteger(data['revision']) ||
    data['revision'] < 1
  ) {
    throw new Error('La revisión OTA no es válida.');
  }

  if (
    typeof data['minNativeBuild'] !== 'number' ||
    !Number.isSafeInteger(data['minNativeBuild']) ||
    data['minNativeBuild'] < 1
  ) {
    throw new Error('La versión mínima nativa no es válida.');
  }

  if (typeof data['checksum'] !== 'string' || !/^[a-fA-F0-9]{64}$/.test(data['checksum'])) {
    throw new Error('El checksum OTA debe ser un SHA-256 hexadecimal.');
  }

  return {
    schemaVersion: 1,
    appId: PANADERIA_APP_ID,
    channel: 'stable',
    version: data['version'],
    revision: data['revision'],
    minNativeBuild: data['minNativeBuild'],
    bundleUrl: validateHostedUrl(data['bundleUrl'], '/ota/'),
    checksum: data['checksum'].toLowerCase(),
    publishedAt: validateDate(data['publishedAt']),
    releaseNotes: validateReleaseNotes(data['releaseNotes']),
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('El servidor devolvió un manifiesto inválido.');
  }

  return value as Record<string, unknown>;
}

function validateIdentity(data: Record<string, unknown>): void {
  if (data['appId'] !== PANADERIA_APP_ID) {
    throw new Error('El manifiesto no corresponde a Panadería Gestión.');
  }

  if (data['channel'] !== 'stable') {
    throw new Error('El manifiesto no pertenece al canal estable.');
  }
}

function validateHostedUrl(value: unknown, pathPrefix: string): string {
  if (typeof value !== 'string') {
    throw new Error('El manifiesto no contiene una URL válida.');
  }

  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error('El manifiesto contiene una URL inválida.');
  }

  if (
    url.protocol !== 'https:' ||
    url.hostname !== 'updates.may.cu' ||
    url.port !== '' ||
    !url.pathname.startsWith(pathPrefix) ||
    url.username !== '' ||
    url.password !== '' ||
    url.search !== '' ||
    url.hash !== ''
  ) {
    throw new Error('La URL no pertenece al servidor autorizado.');
  }

  return url.href;
}

function validateDate(value: unknown): string {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) {
    throw new Error('El manifiesto contiene una fecha inválida.');
  }

  return value;
}

function validateReleaseNotes(value: unknown): string[] {
  if (
    !Array.isArray(value) ||
    !value.every((note) => typeof note === 'string' && note.length <= 500)
  ) {
    throw new Error('Las notas de la versión no son válidas.');
  }

  return value as string[];
}
