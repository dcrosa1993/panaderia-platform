
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const isApiRequest = request.url.startsWith(environment.apiUrl);
  const token = auth.accessToken();

  const isPublicAuthEndpoint =
    request.url.endsWith('/auth/login') ||
    request.url.endsWith('/auth/register');

  const outgoingRequest =
    isApiRequest && token && !isPublicAuthEndpoint
      ? request.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`,
          },
        })
      : request;

  return next(outgoingRequest).pipe(
    catchError((error: unknown) => {
      const isSessionEndpoint =
        request.url.endsWith('/auth/me');

      if (
        isApiRequest &&
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        !isPublicAuthEndpoint &&
        !isSessionEndpoint &&
        token
      ) {
        auth.logout();
        void router.navigateByUrl('/auth/login');
      }

      return throwError(() => error);
    }),
  );
};
