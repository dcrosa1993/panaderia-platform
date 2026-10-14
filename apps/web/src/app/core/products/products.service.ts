
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type {
  CreateProductRequest,
  Product,
  UpdateProductRequest,
} from '../models/product.models';

@Injectable({
  providedIn: 'root',
})
export class ProductsService {
  private readonly baseUrl = `${environment.apiUrl}/businesses`;

  constructor(private readonly http: HttpClient) {}

  getAll(
    businessId: string,
    search?: string,
  ): Observable<{ products: Product[] }> {
    let params = new HttpParams();

    if (search?.trim()) {
      params = params.set('search', search.trim());
    }

    return this.http.get<{ products: Product[] }>(
      `${this.baseUrl}/${encodeURIComponent(businessId)}/products`,
      { params },
    );
  }

  create(
    businessId: string,
    request: CreateProductRequest,
  ): Observable<Product> {
    return this.http.post<Product>(
      `${this.baseUrl}/${encodeURIComponent(businessId)}/products`,
      request,
    );
  }

  getOne(
    businessId: string,
    productId: string,
  ): Observable<Product> {
    return this.http.get<Product>(
      `${this.baseUrl}/${encodeURIComponent(businessId)}/products/${encodeURIComponent(productId)}`,
    );
  }

  update(
    businessId: string,
    productId: string,
    request: UpdateProductRequest,
  ): Observable<Product> {
    return this.http.patch<Product>(
      `${this.baseUrl}/${encodeURIComponent(businessId)}/products/${encodeURIComponent(productId)}`,
      request,
    );
  }
}
