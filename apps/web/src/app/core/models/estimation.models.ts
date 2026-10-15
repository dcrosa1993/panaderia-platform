
export type EstimationMode = 'PRODUCT_COUNT' | 'FLOUR_QUANTITY';

export interface CreateEstimationRequest {
  productId: string;
  recipeVersionId: string;
  mode: EstimationMode;
  quantity?: number;
  flourQuantity?: number;
  flourUnitId?: string;
}

export interface EstimationIngredientSnapshot {
  id: string;
  sourceIngredientId: string;
  nameSnapshot: string;
  bakerPercentage: string | number;
  isFlourBase: boolean;
  sortOrder: number;

  baseUnitCode: string;
  baseUnitName: string;
  baseUnitSymbol: string;
  baseUnitDimension: string;
  baseUnitFactorToBase: string | number;
  densityGramsPerMl: string | number | null;

  ingredientMassGrams: string | number;
  ingredientVolumeMl: string | number | null;
  quantityInBaseUnit: string | number;

  purchaseQuantity: string | number | null;
  purchaseUnitCode: string | null;
  purchaseUnitName: string | null;
  purchaseUnitSymbol: string | null;
  purchaseUnitDimension: string | null;
  purchaseUnitFactorToBase: string | number | null;
  purchaseTotalPrice: string | number | null;

  estimatedCost: string | number | null;
}

export interface Estimation {
  id: string;
  businessId: string;
  productId: string;
  recipeVersionId: string;
  createdByUserId: string;

  mode: EstimationMode;
  productNameSnapshot: string;
  productProductionUnitCodeSnapshot: string;
  recipeVersionNumber: number;

  plannedProductCount: number | null;
  targetFinishedWeightInput: string | number | null;
  targetFinishedWeightUnitCode: string | null;
  targetFinishedWeightUnitName: string | null;
  targetFinishedWeightUnitSymbol: string | null;

  flourQuantity: string | number | null;
  flourUnitCode: string | null;
  flourUnitName: string | null;
  flourUnitSymbol: string | null;

  expectedBakeLossPercent: string | number;
  recipeTotalPercentage: string | number;
  flourMassGrams: string | number;
  rawDoughMassGrams: string | number;
  expectedFinishedMassGrams: string | number;

  targetFinishedWeightPerUnitGrams: string | number | null;
  theoreticalProductCount: string | number | null;
  wholeProductCount: number | null;

  costingComplete: boolean;
  estimatedIngredientCost: string | number | null;
  knownIngredientCostSubtotal: string | number;
  missingPriceIngredientNames: string[];

  createdAt: string;
  ingredients?: EstimationIngredientSnapshot[];
}
