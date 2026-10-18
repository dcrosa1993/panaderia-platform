import { HttpBackend, HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, timeout } from 'rxjs';

export const PANADERIA_APP_ID = 'cu.may.panaderia';

export const UPDATE_MANIFEST_URL = 'https://updates.may.cu/stable.json';

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

@Injectable({ providedIn: 'root' })
export class AppUpdateService {
  /*
   * Use a dedicated HttpClient without application interceptors.
   * The public update server must not receive the user's API token
   * or the active bakery's custom headers.
   */
  private readonly http = new HttpClient(inject(HttpBackend));

  getLatestManifest(): Observable<AppUpdateManifest> {
    return this.http
      .get<unknown>(UPDATE_MANIFEST_URL)
      .pipe(
        timeout({ first: 12000 }),
        map((value) => validateManifest(value)),
      );
  }
}

function validateManifest(value: unknown): AppUpdateManifest {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('El servidor de actualizaciones devolvió un documento inválido.');
  }

  const data = value as Record<string, unknown>;

  if (data['schemaVersion'] !== 1) {
    throw new Error('La versión del formato del manifiesto no es compatible.');
  }

  if (data['appId'] !== PANADERIA_APP_ID) {
    throw new Error('El manifiesto no corresponde a Panadería Gestión.');
  }

  if (data['channel'] !== 'stable') {
    throw new Error('El manifiesto no pertenece al canal estable.');
  }

  if (
    typeof data['versionName'] !== 'string' ||
    data['versionName'].trim().length === 0 ||
    !Number.isSafeInteger(data['versionCode']) ||
    Number(data['versionCode']) < 1
  ) {
    throw new Error('El manifiesto contiene una versión inválida.');
  }

  if (typeof data['apkUrl'] !== 'string') {
    throw new Error('El manifiesto no contiene una URL de descarga válida.');
  }

  let apkUrl: URL;

  try {
    apkUrl = new URL(data['apkUrl']);
  } catch {
    throw new Error('La URL de descarga no es válida.');
  }

  if (
    apkUrl.protocol !== 'https:' ||
    apkUrl.hostname !== 'updates.may.cu' ||
    !apkUrl.pathname.startsWith('/apk/') ||
    apkUrl.username !== '' ||
    apkUrl.password !== ''
  ) {
    throw new Error('La descarga no procede del servidor autorizado.');
  }

  if (
    typeof data['sha256'] !== 'string' ||
    !/^[a-fA-F0-9]{64}$/.test(data['sha256'])
  ) {
    throw new Error('El manifiesto contiene una huella SHA-256 inválida.');
  }

  if (
    typeof data['publishedAt'] !== 'string' ||
    !Number.isFinite(Date.parse(data['publishedAt']))
  ) {
    throw new Error('La fecha de publicación del manifiesto no es válida.');
  }

  if (
    !Array.isArray(data['releaseNotes']) ||
    !data['releaseNotes'].every(
      (note) => typeof note === 'string' && note.length <= 500,
    )
  ) {
    throw new Error('Las notas de publicación tienen un formato inválido.');
  }

  return {
    schemaVersion: 1,
    appId: PANADERIA_APP_ID,
    channel: 'stable',
    versionName: String(data['versionName']),
    versionCode: Number(data['versionCode']),
    apkUrl: apkUrl.href,
    sha256: data['sha256'].toLowerCase(),
    publishedAt: String(data['publishedAt']),
    releaseNotes: data['releaseNotes'] as string[],
  };
}
