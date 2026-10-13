
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MeasurementUnit } from '../models/measurement-unit.models';

@Injectable({
  providedIn: 'root',
})
export class MeasurementUnitsService {
  private readonly url = `${environment.apiUrl}/measurement-units`;

  constructor(private readonly http: HttpClient) {}

  getAll(): Observable<MeasurementUnit[]> {
    return this.http.get<MeasurementUnit[]>(this.url);
  }
}
