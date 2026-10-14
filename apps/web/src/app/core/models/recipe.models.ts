
import type { MeasurementUnit } from './measurement-unit.models';

export type RecipeVersionStatus =
  | 'DRAFT'
  | 'PUBLISHED'
  | 'SUPERSEDED';

export interface RecipeProduct {
  id: string;
  name: string;
  businessId: string;
  productionUnit: MeasurementUnit;
  targetFinishedWeight: string | null;
  targetWeightUnit: MeasurementUnit | null;
}

export interface RecipePriceReference {
  purchaseQuantity: string;
  purchaseUnit: MeasurementUnit;
  totalPrice: string;
  costPerBaseUnit: string;
  effectiveFrom: string;
}

export interface RecipeIngredientDetail {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  baseUnit: MeasurementUnit;
  densityGramsPerMl: string | null;
  latestPrice: RecipePriceReference | null;
}

export interface RecipeIngredientLine {
  id: string;
  ingredientId: string;
  bakerPercentage: string;
  isFlourBase: boolean;
  sortOrder: number;
  ingredient: RecipeIngredientDetail;
}

export interface RecipeVersion {
  id: string;
  productId: string;
  versionNumber: number;
  status: RecipeVersionStatus;
  expectedBakeLossPercent: string;
  notes: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  product: RecipeProduct;
  ingredients: RecipeIngredientLine[];
}

export interface RecipeVersionListResponse {
  versions: RecipeVersion[];
}

export interface CreateRecipeVersionRequest {
  expectedBakeLossPercent: string;
  notes?: string | null;
}

export interface UpdateRecipeVersionRequest {
  expectedBakeLossPercent?: string;
  notes?: string | null;
}

export interface ReplaceRecipeIngredientsRequest {
  ingredients: Array<{
    ingredientId: string;
    bakerPercentage: string;
    isFlourBase: boolean;
    sortOrder: number;
  }>;
}
