
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { BusinessSummary } from '../models/auth.models';

@Injectable({
  providedIn: 'root',
})
export class BusinessesService {
  private readonly baseUrl = `${environment.apiUrl}/businesses`;

  constructor(
    private readonly http: HttpClient,
    private readonly auth: AuthService,
  ) {}

  create(name: string): Observable<BusinessSummary> {
    return this.http
      .post<BusinessSummary>(this.baseUrl, { name })
      .pipe(
        tap((business) => {
          this.auth.addBusinessToSession(business);
        }),
      );
  }

  getMine(): Observable<{ businesses: BusinessSummary[] }> {
    return this.http.get<{ businesses: BusinessSummary[] }>(
      this.baseUrl,
    );
  }

  getOne(businessId: string): Observable<BusinessSummary> {
    return this.http.get<BusinessSummary>(
      `${this.baseUrl}/${encodeURIComponent(businessId)}`,
    );
  }
}
