
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type {
  CreateRecipeVersionRequest,
  RecipeVersion,
  RecipeVersionListResponse,
  ReplaceRecipeIngredientsRequest,
  UpdateRecipeVersionRequest,
} from '../models/recipe.models';

@Injectable({
  providedIn: 'root',
})
export class RecipesService {
  private readonly baseUrl = `${environment.apiUrl}/businesses`;

  constructor(private readonly http: HttpClient) {}

  getVersions(
    businessId: string,
    productId: string,
  ): Observable<RecipeVersionListResponse> {
    return this.http.get<RecipeVersionListResponse>(
      this.productUrl(businessId, productId),
    );
  }

  createDraft(
    businessId: string,
    productId: string,
    request: CreateRecipeVersionRequest,
  ): Observable<RecipeVersion> {
    return this.http.post<RecipeVersion>(
      this.productUrl(businessId, productId),
      request,
    );
  }

  updateDraft(
    businessId: string,
    productId: string,
    versionId: string,
    request: UpdateRecipeVersionRequest,
  ): Observable<RecipeVersion> {
    return this.http.patch<RecipeVersion>(
      `${this.productUrl(businessId, productId)}/${encodeURIComponent(versionId)}`,
      request,
    );
  }

  replaceIngredients(
    businessId: string,
    productId: string,
    versionId: string,
    request: ReplaceRecipeIngredientsRequest,
  ): Observable<RecipeVersion> {
    return this.http.put<RecipeVersion>(
      `${this.productUrl(businessId, productId)}/${encodeURIComponent(versionId)}/ingredients`,
      request,
    );
  }

  publish(
    businessId: string,
    productId: string,
    versionId: string,
  ): Observable<RecipeVersion> {
    return this.http.post<RecipeVersion>(
      `${this.productUrl(businessId, productId)}/${encodeURIComponent(versionId)}/publish`,
      {},
    );
  }

  private productUrl(
    businessId: string,
    productId: string,
  ): string {
    return (
      `${this.baseUrl}/${encodeURIComponent(businessId)}` +
      `/products/${encodeURIComponent(productId)}/recipe-versions`
    );
  }
}
