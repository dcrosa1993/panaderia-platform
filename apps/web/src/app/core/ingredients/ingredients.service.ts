import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CreateIngredientPriceRequest,
  CreateIngredientRequest,
  Ingredient,
  IngredientPriceHistoryItem,
} from '../models/ingredient.models';

@Injectable({
  providedIn: 'root',
})
export class IngredientsService {
  private readonly baseUrl = `${environment.apiUrl}/businesses`;

  constructor(private readonly http: HttpClient) {}

  getAll(
    businessId: string,
    search?: string,
    includeInactive = false,
  ): Observable<{ ingredients: Ingredient[] }> {
    let params = new HttpParams();

    if (search?.trim()) {
      params = params.set('search', search.trim());
    }

    if (includeInactive) {
      params = params.set('includeInactive', 'true');
    }

    return this.http.get<{ ingredients: Ingredient[] }>(
      `${this.baseUrl}/${encodeURIComponent(businessId)}/ingredients`,
      { params },
    );
  }

  update(
    businessId: string,
    ingredientId: string,
    request: {
      isActive?: boolean;
      name?: string;
      description?: string | null;
      densityGramsPerMl?: string;
    },
  ): Observable<Ingredient> {
    return this.http.patch<Ingredient>(
      `${this.baseUrl}/${encodeURIComponent(businessId)}/ingredients/${encodeURIComponent(ingredientId)}`,
      request,
    );
  }

  create(businessId: string, request: CreateIngredientRequest): Observable<Ingredient> {
    return this.http.post<Ingredient>(
      `${this.baseUrl}/${encodeURIComponent(businessId)}/ingredients`,
      request,
    );
  }

  addPrice(
    businessId: string,
    ingredientId: string,
    request: CreateIngredientPriceRequest,
  ): Observable<Ingredient> {
    return this.http.post<Ingredient>(
      `${this.baseUrl}/${encodeURIComponent(businessId)}/ingredients/${encodeURIComponent(ingredientId)}/prices`,
      request,
    );
  }

  getPriceHistory(
    businessId: string,
    ingredientId: string,
  ): Observable<{ prices: IngredientPriceHistoryItem[] }> {
    return this.http.get<{ prices: IngredientPriceHistoryItem[] }>(
      `${this.baseUrl}/${encodeURIComponent(businessId)}/ingredients/${encodeURIComponent(ingredientId)}/prices`,
    );
  }
}
