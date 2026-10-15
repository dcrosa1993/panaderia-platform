
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import type {
  CreateEstimationRequest,
  Estimation,
} from '../models/estimation.models';
import type { MeasurementUnit } from '../models/measurement-unit.models';

@Injectable({
  providedIn: 'root',
})
export class EstimationsService {
  private readonly businessUrl = `${environment.apiUrl}/businesses`;

  constructor(private readonly http: HttpClient) {}

  getAll(businessId: string): Observable<Estimation[]> {
    return this.http.get<Estimation[]>(
      `${this.businessUrl}/${encodeURIComponent(businessId)}/estimations`,
    );
  }

  getOne(
    businessId: string,
    estimationId: string,
  ): Observable<Estimation> {
    return this.http.get<Estimation>(
      `${this.businessUrl}/${encodeURIComponent(businessId)}/estimations/${encodeURIComponent(estimationId)}`,
    );
  }

  create(
    businessId: string,
    request: CreateEstimationRequest,
  ): Observable<Estimation> {
    return this.http.post<Estimation>(
      `${this.businessUrl}/${encodeURIComponent(businessId)}/estimations`,
      request,
    );
  }

  getMassUnits(): Observable<MeasurementUnit[]> {
    const params = new HttpParams().set('dimension', 'MASS');

    return this.http
      .get<unknown>(`${environment.apiUrl}/measurement-units`, {
        params,
      })
      .pipe(
        map((response) => {
          if (Array.isArray(response)) {
            return response as MeasurementUnit[];
          }

          if (response && typeof response === 'object') {
            const body = response as Record<string, unknown>;
            const possibleUnits =
              body['units'] ??
              body['measurementUnits'] ??
              body['data'];

            if (Array.isArray(possibleUnits)) {
              return possibleUnits as MeasurementUnit[];
            }
          }

          throw new Error(
            'La API no devolvió un catálogo de unidades válido.',
          );
        }),
      );
  }
}
