
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { computed, Injectable, signal } from '@angular/core';
import { catchError, map, Observable, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AuthProfile,
  AuthResponse,
  AuthUser,
  BusinessSummary,
  LoginRequest,
  RegisterRequest,
} from '../models/auth.models';

interface StoredSession {
  accessToken: string;
  user: AuthUser;
  businesses: BusinessSummary[];
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly sessionKey = 'panaderia.auth.session';
  private readonly businessKey = 'panaderia.active-business';
  private readonly baseUrl = environment.apiUrl;

  private readonly initialSession = this.readStoredSession();

  readonly accessToken = signal<string | null>(
    this.initialSession?.accessToken ?? null,
  );

  readonly user = signal<AuthUser | null>(
    this.initialSession?.user ?? null,
  );

  readonly businesses = signal<BusinessSummary[]>(
    this.initialSession?.businesses ?? [],
  );

  readonly activeBusinessId = signal<string | null>(
    this.resolveActiveBusinessId(
      this.initialSession?.businesses ?? [],
    ),
  );

  readonly activeBusiness = computed(() => {
    const businesses = this.businesses();
    const activeId = this.activeBusinessId();

    return (
      businesses.find((business) => business.id === activeId) ??
      businesses[0] ??
      null
    );
  });

  constructor(private readonly http: HttpClient) {}

  register(request: RegisterRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/auth/register`, request)
      .pipe(tap((response) => this.saveSession(response)));
  }

  login(request: LoginRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/auth/login`, request)
      .pipe(tap((response) => this.saveSession(response)));
  }

  validateSession(): Observable<boolean> {
    if (!this.accessToken()) {
      return of(false);
    }

    return this.http
      .get<AuthProfile>(`${this.baseUrl}/auth/me`)
      .pipe(
        tap((profile) => this.updateProfile(profile)),
        map(() => true),
        catchError((error: unknown) => {
          if (
            error instanceof HttpErrorResponse &&
            error.status === 401
          ) {
            this.logout();
          }

          return of(false);
        }),
      );
  }

  selectBusiness(businessId: string): boolean {
    const allowed = this.businesses().some(
      (business) => business.id === businessId,
    );

    if (!allowed) {
      return false;
    }

    this.activeBusinessId.set(businessId);
    this.writeActiveBusinessId(businessId);

    return true;
  }

  logout(): void {
    this.accessToken.set(null);
    this.user.set(null);
    this.businesses.set([]);
    this.activeBusinessId.set(null);

    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(this.sessionKey);
      window.sessionStorage.removeItem(this.businessKey);
    }
  }

  private saveSession(response: AuthResponse): void {
    this.accessToken.set(response.accessToken);
    this.user.set(response.user);
    this.businesses.set(response.businesses);

    const activeId = this.resolveActiveBusinessId(
      response.businesses,
    );

    this.activeBusinessId.set(activeId);
    this.writeSession();
    this.writeActiveBusinessId(activeId);
  }

  private updateProfile(profile: AuthProfile): void {
    this.user.set(profile.user);
    this.businesses.set(profile.businesses);

    const activeId = this.resolveActiveBusinessId(
      profile.businesses,
    );

    this.activeBusinessId.set(activeId);
    this.writeSession();
    this.writeActiveBusinessId(activeId);
  }

  private writeSession(): void {
    const token = this.accessToken();
    const user = this.user();

    if (!token || !user || typeof window === 'undefined') {
      return;
    }

    const session: StoredSession = {
      accessToken: token,
      user,
      businesses: this.businesses(),
    };

    window.sessionStorage.setItem(
      this.sessionKey,
      JSON.stringify(session),
    );
  }

  private readStoredSession(): StoredSession | null {
    if (typeof window === 'undefined') {
      return null;
    }

    try {
      const raw = window.sessionStorage.getItem(this.sessionKey);

      if (!raw) {
        return null;
      }

      const session = JSON.parse(raw) as StoredSession;

      if (
        typeof session.accessToken !== 'string' ||
        !session.user ||
        !Array.isArray(session.businesses)
      ) {
        return null;
      }

      return session;
    } catch {
      return null;
    }
  }

  private resolveActiveBusinessId(
    businesses: BusinessSummary[],
  ): string | null {
    if (typeof window !== 'undefined') {
      const storedId = window.sessionStorage.getItem(
        this.businessKey,
      );

      if (
        storedId &&
        businesses.some((business) => business.id === storedId)
      ) {
        return storedId;
      }
    }

    return businesses[0]?.id ?? null;
  }

  private writeActiveBusinessId(
    businessId: string | null,
  ): void {
    if (typeof window === 'undefined') {
      return;
    }

    if (businessId) {
      window.sessionStorage.setItem(
        this.businessKey,
        businessId,
      );
    } else {
      window.sessionStorage.removeItem(this.businessKey);
    }
  }
}
