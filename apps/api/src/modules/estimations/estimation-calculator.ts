
import { Prisma } from '../../generated/prisma/client.js';

export type EstimationDimension = 'MASS' | 'VOLUME' | 'COUNT';

export type DecimalInput = string | number | { toString(): string };

export interface EstimationUnitSnapshot {
  code: string;
  name: string;
  symbol: string;
  dimension: EstimationDimension;

  /**
   * MASS: factor para convertir la unidad a gramos.
   * VOLUME: factor para convertir la unidad a mililitros.
   * COUNT: factor para convertir a unidades individuales.
   */
  factorToBase: DecimalInput;
}

export interface EstimationPriceSnapshot {
  purchaseQuantity: DecimalInput;
  purchaseUnit: EstimationUnitSnapshot;
  totalPrice: DecimalInput;
}

export interface EstimationRecipeIngredientSnapshot {
  ingredientId: string;
  name: string;
  bakerPercentage: DecimalInput;
  isFlourBase: boolean;
  baseUnit: EstimationUnitSnapshot;
  densityGramsPerMl?: DecimalInput | null;
  latestPrice?: EstimationPriceSnapshot | null;
  isActive?: boolean;
}

export interface EstimationCalculationInput {
  expectedBakeLossPercent: DecimalInput;
  recipeIngredients: EstimationRecipeIngredientSnapshot[];
}

export interface EstimateByProductCountInput
  extends EstimationCalculationInput {
  quantity: DecimalInput;
  targetFinishedWeight: DecimalInput;
  targetFinishedWeightUnit: EstimationUnitSnapshot;
}

export interface EstimateByFlourQuantityInput
  extends EstimationCalculationInput {
  flourQuantity: DecimalInput;
  flourUnit: EstimationUnitSnapshot;

  /**
   * Opcionales para calcular también el rendimiento en panes.
   * Si se proporciona uno, deben proporcionarse ambos.
   */
  targetFinishedWeight?: DecimalInput;
  targetFinishedWeightUnit?: EstimationUnitSnapshot;
}

export interface CalculatedIngredientAmount {
  ingredientId: string;
  name: string;
  bakerPercentage: string;

  baseUnitCode: string;
  baseUnitName: string;
  baseUnitSymbol: string;

  ingredientMassGrams: string;
  ingredientVolumeMl: string | null;
  quantityInBaseUnit: string;

  /**
   * null significa que falta un precio.
   * "0" significa que el ingrediente tiene precio conocido igual a cero.
   */
  estimatedCost: string | null;
}

export interface EstimationCalculationResult {
  mode: 'PRODUCT_COUNT' | 'FLOUR_QUANTITY';

  expectedBakeLossPercent: string;
  recipeTotalPercentage: string;

  flourMassGrams: string;
  rawDoughMassGrams: string;
  expectedFinishedMassGrams: string;

  plannedProductCount: string | null;
  targetFinishedWeightPerUnitGrams: string | null;

  theoreticalProductCount: string | null;
  wholeProductCount: number | null;

  ingredients: CalculatedIngredientAmount[];

  costingComplete: boolean;
  estimatedIngredientCost: string | null;
  knownIngredientCostSubtotal: string;
  ingredientsMissingPrice: string[];
}

interface PreparedRecipe {
  bakeLossPercent: Prisma.Decimal;
  remainingWeightRatio: Prisma.Decimal;
  totalPercentage: Prisma.Decimal;
  ingredients: EstimationRecipeIngredientSnapshot[];
}

interface CalculatedAmounts {
  flourMassGrams: Prisma.Decimal;
  rawDoughMassGrams: Prisma.Decimal;
  expectedFinishedMassGrams: Prisma.Decimal;
  plannedProductCount: string | null;
  targetFinishedWeightPerUnitGrams: string | null;
  theoreticalProductCount: string | null;
  wholeProductCount: number | null;
  ingredients: CalculatedIngredientAmount[];
  costingComplete: boolean;
  estimatedIngredientCost: string | null;
  knownIngredientCostSubtotal: string;
  ingredientsMissingPrice: string[];
}

const HUNDRED = new Prisma.Decimal(100);
const ZERO = new Prisma.Decimal(0);

function decimal(value: DecimalInput, field: string): Prisma.Decimal {
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

function outputDecimal(value: Prisma.Decimal): string {
  return value.toFixed();
}

function assertPositive(
  value: Prisma.Decimal,
  field: string,
): void {
  if (!value.gt(ZERO)) {
    throw new Error(`${field} debe ser mayor que cero.`);
  }
}

function validateUnit(
  unit: EstimationUnitSnapshot,
  field: string,
): Prisma.Decimal {
  if (!unit || !unit.code || !unit.symbol) {
    throw new Error(`${field} no es una unidad válida.`);
  }

  const factor = decimal(unit.factorToBase, `${field}.factorToBase`);
  assertPositive(factor, `${field}.factorToBase`);

  if (!['MASS', 'VOLUME', 'COUNT'].includes(unit.dimension)) {
    throw new Error(`${field} tiene una dimensión no válida.`);
  }

  return factor;
}

function validateMassUnit(
  unit: EstimationUnitSnapshot,
  field: string,
): Prisma.Decimal {
  const factor = validateUnit(unit, field);

  if (unit.dimension !== 'MASS') {
    throw new Error(`${field} debe ser una unidad de masa.`);
  }

  return factor;
}

function prepareRecipe(
  input: EstimationCalculationInput,
): PreparedRecipe {
  const bakeLossPercent = decimal(
    input.expectedBakeLossPercent,
    'La pérdida de peso al hornear',
  );

  if (bakeLossPercent.lt(ZERO) || !bakeLossPercent.lt(HUNDRED)) {
    throw new Error(
      'La pérdida de peso debe ser igual o mayor que cero y menor que 100%.',
    );
  }

  if (
    !Array.isArray(input.recipeIngredients) ||
    input.recipeIngredients.length === 0
  ) {
    throw new Error('La receta debe contener ingredientes.');
  }

  const ids = new Set<string>();
  let totalPercentage = ZERO;
  let flourBasePercentage = ZERO;

  for (const ingredient of input.recipeIngredients) {
    if (!ingredient.ingredientId || !ingredient.name) {
      throw new Error('Todos los ingredientes deben tener ID y nombre.');
    }

    if (ids.has(ingredient.ingredientId)) {
      throw new Error(
        `El ingrediente "${ingredient.name}" aparece más de una vez.`,
      );
    }

    ids.add(ingredient.ingredientId);

    if (ingredient.isActive === false) {
      throw new Error(
        `El ingrediente "${ingredient.name}" está inactivo.`,
      );
    }

    const percentage = decimal(
      ingredient.bakerPercentage,
      `El porcentaje de "${ingredient.name}"`,
    );

    assertPositive(
      percentage,
      `El porcentaje de "${ingredient.name}"`,
    );

    totalPercentage = totalPercentage.plus(percentage);

    if (ingredient.isFlourBase) {
      flourBasePercentage = flourBasePercentage.plus(percentage);
    }

    const baseFactor = validateUnit(
      ingredient.baseUnit,
      `La unidad base de "${ingredient.name}"`,
    );

    if (ingredient.baseUnit.dimension === 'COUNT') {
      throw new Error(
        `"${ingredient.name}" usa una unidad de conteo. ` +
          'Las recetas deben expresar los ingredientes en masa ' +
          'o en volumen con densidad conocida.',
      );
    }

    if (
      ingredient.baseUnit.dimension === 'VOLUME'
    ) {
      if (
        ingredient.densityGramsPerMl === null ||
        ingredient.densityGramsPerMl === undefined
      ) {
        throw new Error(
          `"${ingredient.name}" necesita una densidad en g/ml.`,
        );
      }

      assertPositive(
        decimal(
          ingredient.densityGramsPerMl,
          `La densidad de "${ingredient.name}"`,
        ),
        `La densidad de "${ingredient.name}"`,
      );
    }

    // Ya se validó el factor positivo de la unidad base.
    void baseFactor;

    if (ingredient.latestPrice) {
      const price = ingredient.latestPrice;
      const purchaseQuantity = decimal(
        price.purchaseQuantity,
        `La cantidad de compra de "${ingredient.name}"`,
      );
      const totalPrice = decimal(
        price.totalPrice,
        `El precio de "${ingredient.name}"`,
      );

      assertPositive(
        purchaseQuantity,
        `La cantidad de compra de "${ingredient.name}"`,
      );

      if (totalPrice.lt(ZERO)) {
        throw new Error(
          `El precio de "${ingredient.name}" no puede ser negativo.`,
        );
      }

      validateUnit(
        price.purchaseUnit,
        `La unidad de compra de "${ingredient.name}"`,
      );

      if (
        price.purchaseUnit.dimension !==
        ingredient.baseUnit.dimension
      ) {
        throw new Error(
          `La unidad de compra de "${ingredient.name}" ` +
            'no es compatible con su unidad base.',
        );
      }
    }
  }

  if (!flourBasePercentage.eq(HUNDRED)) {
    throw new Error(
      `Los ingredientes base de harina deben sumar 100%; ` +
        `la receta recibida suma ${flourBasePercentage.toString()}%.`,
    );
  }

  const remainingWeightRatio = HUNDRED
    .minus(bakeLossPercent)
    .div(HUNDRED);

  return {
    bakeLossPercent,
    remainingWeightRatio,
    totalPercentage,
    ingredients: input.recipeIngredients,
  };
}

function calculateIngredientAmounts(
  recipe: PreparedRecipe,
  flourMassGrams: Prisma.Decimal,
): Pick<
  CalculatedAmounts,
  | 'ingredients'
  | 'costingComplete'
  | 'estimatedIngredientCost'
  | 'knownIngredientCostSubtotal'
  | 'ingredientsMissingPrice'
> {
  let knownIngredientCostSubtotal = ZERO;
  const ingredientsMissingPrice: string[] = [];

  const ingredients = recipe.ingredients.map((ingredient) => {
    const percentage = decimal(
      ingredient.bakerPercentage,
      `El porcentaje de "${ingredient.name}"`,
    );

    const ingredientMassGrams = flourMassGrams
      .mul(percentage)
      .div(HUNDRED);

    const baseFactor = decimal(
      ingredient.baseUnit.factorToBase,
      `El factor de unidad de "${ingredient.name}"`,
    );

    let ingredientVolumeMl: Prisma.Decimal | null = null;
    let quantityInBaseUnit: Prisma.Decimal;

    if (ingredient.baseUnit.dimension === 'VOLUME') {
      const density = decimal(
        ingredient.densityGramsPerMl!,
        `La densidad de "${ingredient.name}"`,
      );

      ingredientVolumeMl = ingredientMassGrams.div(density);

      quantityInBaseUnit = ingredientVolumeMl.div(baseFactor);
    } else {
      quantityInBaseUnit = ingredientMassGrams.div(baseFactor);
    }

    let estimatedCost: Prisma.Decimal | null = null;
    const price = ingredient.latestPrice;

    if (price) {
      const purchaseQuantity = decimal(
        price.purchaseQuantity,
        `La cantidad de compra de "${ingredient.name}"`,
      );
      const purchaseUnitFactor = decimal(
        price.purchaseUnit.factorToBase,
        `El factor de unidad de compra de "${ingredient.name}"`,
      );
      const totalPrice = decimal(
        price.totalPrice,
        `El precio de "${ingredient.name}"`,
      );

      /*
       * Convierte el tamaño de compra a unidades de la unidad base
       * del ingrediente. Ejemplo: 25 kg -> 25 000 g.
       */
      const purchaseQuantityInBaseUnits = purchaseQuantity
        .mul(purchaseUnitFactor)
        .div(baseFactor);

      estimatedCost = quantityInBaseUnit
        .mul(totalPrice)
        .div(purchaseQuantityInBaseUnits);

      knownIngredientCostSubtotal = knownIngredientCostSubtotal.plus(
        estimatedCost,
      );
    } else {
      ingredientsMissingPrice.push(ingredient.name);
    }

    return {
      ingredientId: ingredient.ingredientId,
      name: ingredient.name,
      bakerPercentage: outputDecimal(percentage),
      baseUnitCode: ingredient.baseUnit.code,
      baseUnitName: ingredient.baseUnit.name,
      baseUnitSymbol: ingredient.baseUnit.symbol,
      ingredientMassGrams: outputDecimal(ingredientMassGrams),
      ingredientVolumeMl:
        ingredientVolumeMl === null
          ? null
          : outputDecimal(ingredientVolumeMl),
      quantityInBaseUnit: outputDecimal(quantityInBaseUnit),
      estimatedCost:
        estimatedCost === null ? null : outputDecimal(estimatedCost),
    };
  });

  const costingComplete = ingredientsMissingPrice.length === 0;

  return {
    ingredients,
    costingComplete,
    estimatedIngredientCost: costingComplete
      ? outputDecimal(knownIngredientCostSubtotal)
      : null,
    knownIngredientCostSubtotal: outputDecimal(
      knownIngredientCostSubtotal,
    ),
    ingredientsMissingPrice,
  };
}

function assembleResult(
  mode: EstimationCalculationResult['mode'],
  recipe: PreparedRecipe,
  values: Omit<
    CalculatedAmounts,
    | 'ingredients'
    | 'costingComplete'
    | 'estimatedIngredientCost'
    | 'knownIngredientCostSubtotal'
    | 'ingredientsMissingPrice'
  >,
  ingredientAmounts: ReturnType<typeof calculateIngredientAmounts>,
): EstimationCalculationResult {
  return {
    mode,
    expectedBakeLossPercent: outputDecimal(recipe.bakeLossPercent),
    recipeTotalPercentage: outputDecimal(recipe.totalPercentage),
    flourMassGrams: outputDecimal(values.flourMassGrams),
    rawDoughMassGrams: outputDecimal(values.rawDoughMassGrams),
    expectedFinishedMassGrams: outputDecimal(
      values.expectedFinishedMassGrams,
    ),
    plannedProductCount: values.plannedProductCount,
    targetFinishedWeightPerUnitGrams:
      values.targetFinishedWeightPerUnitGrams,
    theoreticalProductCount: values.theoreticalProductCount,
    wholeProductCount: values.wholeProductCount,
    ...ingredientAmounts,
  };
}

/**
 * Calcula las cantidades necesarias para una cantidad conocida de piezas
 * y su peso terminado objetivo.
 */
export function calculateByProductCount(
  input: EstimateByProductCountInput,
): EstimationCalculationResult {
  const recipe = prepareRecipe(input);

  const quantity = decimal(input.quantity, 'La cantidad de piezas');
  assertPositive(quantity, 'La cantidad de piezas');

  if (!quantity.isInteger()) {
    throw new Error('La cantidad de piezas debe ser un número entero.');
  }

  const targetWeightUnitFactor = validateMassUnit(
    input.targetFinishedWeightUnit,
    'La unidad del peso terminado',
  );

  const targetFinishedWeight = decimal(
    input.targetFinishedWeight,
    'El peso terminado por pieza',
  );

  assertPositive(targetFinishedWeight, 'El peso terminado por pieza');

  const targetWeightPerUnitGrams = targetFinishedWeight.mul(
    targetWeightUnitFactor,
  );

  const expectedFinishedMassGrams = quantity.mul(
    targetWeightPerUnitGrams,
  );

  const rawDoughMassGrams = expectedFinishedMassGrams.div(
    recipe.remainingWeightRatio,
  );

  const flourMassGrams = rawDoughMassGrams
    .mul(HUNDRED)
    .div(recipe.totalPercentage);

  const ingredientAmounts = calculateIngredientAmounts(
    recipe,
    flourMassGrams,
  );

  return assembleResult(
    'PRODUCT_COUNT',
    recipe,
    {
      flourMassGrams,
      rawDoughMassGrams,
      expectedFinishedMassGrams,
      plannedProductCount: outputDecimal(quantity),
      targetFinishedWeightPerUnitGrams: outputDecimal(
        targetWeightPerUnitGrams,
      ),
      theoreticalProductCount: null,
      wholeProductCount: null,
    },
    ingredientAmounts,
  );
}

/**
 * Calcula el rendimiento esperado a partir de una cantidad de harina.
 * Si se proporciona peso objetivo por pieza, calcula también el rendimiento
 * teórico y la cantidad de piezas completas.
 */
export function calculateByFlourQuantity(
  input: EstimateByFlourQuantityInput,
): EstimationCalculationResult {
  const recipe = prepareRecipe(input);

  const flourUnitFactor = validateMassUnit(
    input.flourUnit,
    'La unidad de la harina',
  );

  const flourQuantity = decimal(
    input.flourQuantity,
    'La cantidad de harina',
  );

  assertPositive(flourQuantity, 'La cantidad de harina');

  const flourMassGrams = flourQuantity.mul(flourUnitFactor);

  const rawDoughMassGrams = flourMassGrams
    .mul(recipe.totalPercentage)
    .div(HUNDRED);

  const expectedFinishedMassGrams = rawDoughMassGrams.mul(
    recipe.remainingWeightRatio,
  );

  const hasTargetWeight = input.targetFinishedWeight !== undefined;
  const hasTargetUnit = input.targetFinishedWeightUnit !== undefined;

  if (hasTargetWeight !== hasTargetUnit) {
    throw new Error(
      'Para calcular las piezas debes proporcionar el peso terminado ' +
        'y su unidad de medida.',
    );
  }

  let targetFinishedWeightPerUnitGrams: Prisma.Decimal | null = null;
  let theoreticalProductCount: Prisma.Decimal | null = null;
  let wholeProductCount: number | null = null;

  if (hasTargetWeight && input.targetFinishedWeightUnit) {
    const targetWeightUnitFactor = validateMassUnit(
      input.targetFinishedWeightUnit,
      'La unidad del peso terminado',
    );

    const targetWeight = decimal(
      input.targetFinishedWeight!,
      'El peso terminado por pieza',
    );

    assertPositive(targetWeight, 'El peso terminado por pieza');

    targetFinishedWeightPerUnitGrams = targetWeight.mul(
      targetWeightUnitFactor,
    );

    theoreticalProductCount = expectedFinishedMassGrams.div(
      targetFinishedWeightPerUnitGrams,
    );

    wholeProductCount = theoreticalProductCount.floor().toNumber();
  }

  const ingredientAmounts = calculateIngredientAmounts(
    recipe,
    flourMassGrams,
  );

  return assembleResult(
    'FLOUR_QUANTITY',
    recipe,
    {
      flourMassGrams,
      rawDoughMassGrams,
      expectedFinishedMassGrams,
      plannedProductCount: null,
      targetFinishedWeightPerUnitGrams:
        targetFinishedWeightPerUnitGrams === null
          ? null
          : outputDecimal(targetFinishedWeightPerUnitGrams),
      theoreticalProductCount:
        theoreticalProductCount === null
          ? null
          : outputDecimal(theoreticalProductCount),
      wholeProductCount,
    },
    ingredientAmounts,
  );
}
