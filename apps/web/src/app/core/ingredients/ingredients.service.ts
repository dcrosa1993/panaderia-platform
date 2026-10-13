
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
  ): Observable<{ ingredients: Ingredient[] }> {
    let params = new HttpParams();

    if (search?.trim()) {
      params = params.set('search', search.trim());
    }

    return this.http.get<{ ingredients: Ingredient[] }>(
      `${this.baseUrl}/${encodeURIComponent(businessId)}/ingredients`,
      { params },
    );
  }

  create(
    businessId: string,
    request: CreateIngredientRequest,
  ): Observable<Ingredient> {
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
