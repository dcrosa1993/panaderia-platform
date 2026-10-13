import { HttpErrorResponse } from '@angular/common/http';

export function apiErrorMessage(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) {
    return 'Ha ocurrido un error inesperado.';
  }

  if (error.status === 0) {
    return 'No se pudo conectar con el servidor. Comprueba que la API esté funcionando.';
  }

  const message = error.error?.message;

  if (Array.isArray(message)) {
    return message.join(' ');
  }

  if (typeof message === 'string' && message.length > 0) {
    return message;
  }

  if (error.status === 401) {
    return 'Las credenciales no son válidas o la sesión ha expirado.';
  }

  if (error.status === 409) {
    return 'Ya existe una cuenta con esos datos.';
  }

  return 'No se pudo completar la operación. Inténtalo de nuevo.';
}
