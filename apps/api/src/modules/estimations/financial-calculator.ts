
import { Prisma } from '../../generated/prisma/client.js';

export type FinancialDecimalInput =
  | string
  | number
  | { toString(): string };

export interface FinancialCalculationInput {
  /**
   * null indica que falta al menos un precio de ingrediente.
   * "0" es un coste conocido válido.
   */
  ingredientCost: FinancialDecimalInput | null;

  /**
   * Subtotal conocido calculado por el motor de ingredientes.
   */
  knownIngredientCostSubtotal: FinancialDecimalInput;

  /**
   * Costes adicionales para el lote completo, en la moneda del negocio.
   * Si no se indica un coste, se considera cero.
   */
  laborCost?: FinancialDecimalInput;
  energyCost?: FinancialDecimalInput;
  packagingCost?: FinancialDecimalInput;
  otherCost?: FinancialDecimalInput;

  /**
   * Margen sobre ventas netas, expresado como porcentaje.
   * Debe estar entre 0 y 100, sin incluir el 100.
   */
  targetMarginPercent: FinancialDecimalInput;

  /**
   * Impuesto que se añade al precio neto de venta.
   * No es una determinación de los impuestos legalmente aplicables.
   */
  salesTaxRatePercent: FinancialDecimalInput;

  /**
   * Número de unidades completas vendibles.
   * Se omite cuando no se conoce el rendimiento en unidades.
   */
  productCount?: FinancialDecimalInput | null;
}

export interface FinancialCalculationResult {
  costingComplete: boolean;
  pricingComplete: boolean;

  ingredientCost: string | null;
  knownIngredientCostSubtotal: string;
  laborCost: string;
  energyCost: string;
  packagingCost: string;
  otherCost: string;
  additionalCostsSubtotal: string;
  knownCostSubtotal: string;

  productionCostTotal: string | null;
  targetMarginPercent: string;
  salesTaxRatePercent: string;

  /**
   * Todos los resultados siguientes son importes del lote completo.
   * Son null si los costes de ingredientes están incompletos.
   */
  suggestedNetSalesTotal: string | null;
  targetProfitTotal: string | null;
  salesTaxTotal: string | null;
  suggestedCustomerSalesTotal: string | null;

  productCount: string | null;
  productionCostPerUnit: string | null;
  suggestedNetUnitPrice: string | null;
  targetProfitPerUnit: string | null;
  salesTaxPerUnit: string | null;
  suggestedCustomerUnitPrice: string | null;
}

const ZERO = new Prisma.Decimal(0);
const ONE_HUNDRED = new Prisma.Decimal(100);

function toDecimal(
  value: FinancialDecimalInput,
  field: string,
): Prisma.Decimal {
  let parsed: Prisma.Decimal;

  try {
    parsed = new Prisma.Decimal(String(value));
  } catch {
    throw new Error(`${field} debe ser un número válido.`);
  }

  if (!parsed.isFinite()) {
    throw new Error(`${field} debe ser un número finito.`);
  }

  return parsed;
}

function toOutput(value: Prisma.Decimal): string {
  return value.toFixed();
}

function nonNegativeCost(
  value: FinancialDecimalInput | undefined,
  field: string,
): Prisma.Decimal {
  const parsed =
    value === undefined ? ZERO : toDecimal(value, field);

  if (parsed.lt(ZERO)) {
    throw new Error(`${field} no puede ser negativo.`);
  }

  return parsed;
}

function optionalCost(
  value: FinancialDecimalInput | null,
  field: string,
): Prisma.Decimal | null {
  if (value === null) {
    return null;
  }

  const parsed = nonNegativeCost(value, field);
  return parsed;
}

export function calculateFinancials(
  input: FinancialCalculationInput,
): FinancialCalculationResult {
  const ingredientCost = optionalCost(
    input.ingredientCost,
    'El coste de ingredientes',
  );

  const knownIngredientCost = nonNegativeCost(
    input.knownIngredientCostSubtotal,
    'El subtotal conocido de ingredientes',
  );

  const laborCost = nonNegativeCost(
    input.laborCost,
    'El coste de mano de obra',
  );

  const energyCost = nonNegativeCost(
    input.energyCost,
    'El coste de energía',
  );

  const packagingCost = nonNegativeCost(
    input.packagingCost,
    'El coste de envases',
  );

  const otherCost = nonNegativeCost(
    input.otherCost,
    'Otros costes',
  );

  const targetMarginPercent = toDecimal(
    input.targetMarginPercent,
    'El margen objetivo',
  );

  if (
    targetMarginPercent.lt(ZERO) ||
    !targetMarginPercent.lt(ONE_HUNDRED)
  ) {
    throw new Error(
      'El margen objetivo debe ser igual o mayor que 0% y menor que 100%.',
    );
  }

  const salesTaxRatePercent = toDecimal(
    input.salesTaxRatePercent,
    'El impuesto sobre la venta',
  );

  if (salesTaxRatePercent.lt(ZERO)) {
    throw new Error(
      'El impuesto sobre la venta no puede ser negativo.',
    );
  }

  let productCount: Prisma.Decimal | null = null;

  if (
    input.productCount !== undefined &&
    input.productCount !== null
  ) {
    productCount = toDecimal(
      input.productCount,
      'La cantidad de unidades vendibles',
    );

    if (
      !productCount.gt(ZERO) ||
      !productCount.isInteger()
    ) {
      throw new Error(
        'La cantidad de unidades vendibles debe ser un entero mayor que cero.',
      );
    }
  }

  const additionalCostsSubtotal = laborCost
    .plus(energyCost)
    .plus(packagingCost)
    .plus(otherCost);

  const knownCostSubtotal = knownIngredientCost
    .plus(additionalCostsSubtotal);

  const pricingComplete = ingredientCost !== null;

  const productionCostTotal =
    ingredientCost === null
      ? null
      : ingredientCost.plus(additionalCostsSubtotal);

  let suggestedNetSalesTotal: Prisma.Decimal | null = null;
  let targetProfitTotal: Prisma.Decimal | null = null;
  let salesTaxTotal: Prisma.Decimal | null = null;
  let suggestedCustomerSalesTotal: Prisma.Decimal | null = null;

  let productionCostPerUnit: Prisma.Decimal | null = null;
  let suggestedNetUnitPrice: Prisma.Decimal | null = null;
  let targetProfitPerUnit: Prisma.Decimal | null = null;
  let salesTaxPerUnit: Prisma.Decimal | null = null;
  let suggestedCustomerUnitPrice: Prisma.Decimal | null = null;

  if (productionCostTotal !== null) {
    const taxRatio = salesTaxRatePercent.div(ONE_HUNDRED);

    suggestedNetSalesTotal = productionCostTotal.div(
      ONE_HUNDRED.minus(targetMarginPercent).div(ONE_HUNDRED),
    );

    targetProfitTotal = suggestedNetSalesTotal.minus(
      productionCostTotal,
    );

    // El impuesto se calcula sobre las ventas netas y se añade después.
    salesTaxTotal = suggestedNetSalesTotal.mul(taxRatio);

    suggestedCustomerSalesTotal = suggestedNetSalesTotal.plus(
      salesTaxTotal,
    );

    if (productCount !== null) {
      productionCostPerUnit = productionCostTotal.div(productCount);
      suggestedNetUnitPrice = suggestedNetSalesTotal.div(productCount);
      targetProfitPerUnit = targetProfitTotal.div(productCount);
      salesTaxPerUnit = salesTaxTotal.div(productCount);
      suggestedCustomerUnitPrice =
        suggestedCustomerSalesTotal.div(productCount);
    }
  }

  return {
    costingComplete: pricingComplete,
    pricingComplete,

    ingredientCost:
      ingredientCost === null ? null : toOutput(ingredientCost),
    knownIngredientCostSubtotal: toOutput(knownIngredientCost),
    laborCost: toOutput(laborCost),
    energyCost: toOutput(energyCost),
    packagingCost: toOutput(packagingCost),
    otherCost: toOutput(otherCost),
    additionalCostsSubtotal: toOutput(additionalCostsSubtotal),
    knownCostSubtotal: toOutput(knownCostSubtotal),

    productionCostTotal:
      productionCostTotal === null
        ? null
        : toOutput(productionCostTotal),

    targetMarginPercent: toOutput(targetMarginPercent),
    salesTaxRatePercent: toOutput(salesTaxRatePercent),

    suggestedNetSalesTotal:
      suggestedNetSalesTotal === null
        ? null
        : toOutput(suggestedNetSalesTotal),
    targetProfitTotal:
      targetProfitTotal === null
        ? null
        : toOutput(targetProfitTotal),
    salesTaxTotal:
      salesTaxTotal === null
        ? null
        : toOutput(salesTaxTotal),
    suggestedCustomerSalesTotal:
      suggestedCustomerSalesTotal === null
        ? null
        : toOutput(suggestedCustomerSalesTotal),

    productCount:
      productCount === null ? null : toOutput(productCount),
    productionCostPerUnit:
      productionCostPerUnit === null
        ? null
        : toOutput(productionCostPerUnit),
    suggestedNetUnitPrice:
      suggestedNetUnitPrice === null
        ? null
        : toOutput(suggestedNetUnitPrice),
    targetProfitPerUnit:
      targetProfitPerUnit === null
        ? null
        : toOutput(targetProfitPerUnit),
    salesTaxPerUnit:
      salesTaxPerUnit === null
        ? null
        : toOutput(salesTaxPerUnit),
    suggestedCustomerUnitPrice:
      suggestedCustomerUnitPrice === null
        ? null
        : toOutput(suggestedCustomerUnitPrice),
  };
}
