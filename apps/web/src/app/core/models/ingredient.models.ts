
import { MeasurementUnit } from './measurement-unit.models';

export interface IngredientPrice {
  id: string;
  purchaseQuantity: string;
  purchaseUnit: MeasurementUnit;
  totalPrice: string;
  costPerBaseUnit: string;
  effectiveFrom: string;
  createdAt?: string;
}

export interface Ingredient {
  id: string;
  businessId: string;
  name: string;
  description: string | null;
  isActive: boolean;
  baseUnit: MeasurementUnit;
  densityGramsPerMl: string | null;
  latestPrice: IngredientPrice | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateIngredientRequest {
  name: string;
  description?: string;
  baseUnitId: string;
  densityGramsPerMl?: string;
  initialPrice: {
    purchaseQuantity: string;
    purchaseUnitId: string;
    totalPrice: string;
  };
}

export interface CreateIngredientPriceRequest {
  purchaseQuantity: string;
  purchaseUnitId: string;
  totalPrice: string;
}

export interface IngredientPriceHistoryItem {
  id: string;
  purchaseQuantity: string;
  purchaseUnit: MeasurementUnit;
  totalPrice: string;
  costPerBaseUnit: string;
  effectiveFrom: string;
  createdAt: string;
}
