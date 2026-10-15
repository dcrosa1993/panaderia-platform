
export type EstimationMode = 'PRODUCT_COUNT' | 'FLOUR_QUANTITY';

export interface CreateEstimationRequest {
  productId: string;
  recipeVersionId: string;
  mode: EstimationMode;
  quantity?: number;
  flourQuantity?: number;
  flourUnitId?: string;

  laborCost?: number;
  energyCost?: number;
  packagingCost?: number;
  otherCost?: number;

  targetMarginPercent?: number;
  salesTaxRatePercent?: number;
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
  currencyCodeSnapshot: string;
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

  laborCost: string | number | null;
  energyCost: string | number | null;
  packagingCost: string | number | null;
  otherCost: string | number | null;
  additionalCostsSubtotal: string | number | null;
  knownCostSubtotal: string | number | null;
  productionCostTotal: string | number | null;

  targetMarginPercent: string | number | null;
  salesTaxRatePercent: string | number | null;

  suggestedNetSalesTotal: string | number | null;
  targetProfitTotal: string | number | null;
  salesTaxTotal: string | number | null;
  suggestedCustomerSalesTotal: string | number | null;

  productionCostPerUnit: string | number | null;
  suggestedNetUnitPrice: string | number | null;
  targetProfitPerUnit: string | number | null;
  salesTaxPerUnit: string | number | null;
  suggestedCustomerUnitPrice: string | number | null;

  createdAt: string;
  ingredients?: EstimationIngredientSnapshot[];
}
