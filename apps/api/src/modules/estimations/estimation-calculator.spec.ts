
import { describe, expect, it } from 'vitest';

import {
  calculateByFlourQuantity,
  calculateByProductCount,
  type EstimationRecipeIngredientSnapshot,
  type EstimationUnitSnapshot,
} from './estimation-calculator.js';

const g: EstimationUnitSnapshot = {
  code: 'g',
  name: 'Gramo',
  symbol: 'g',
  dimension: 'MASS',
  factorToBase: '1',
};

const kg: EstimationUnitSnapshot = {
  code: 'kg',
  name: 'Kilogramo',
  symbol: 'kg',
  dimension: 'MASS',
  factorToBase: '1000',
};

const ml: EstimationUnitSnapshot = {
  code: 'ml',
  name: 'Mililitro',
  symbol: 'ml',
  dimension: 'VOLUME',
  factorToBase: '1',
};

const liter: EstimationUnitSnapshot = {
  code: 'l',
  name: 'Litro',
  symbol: 'l',
  dimension: 'VOLUME',
  factorToBase: '1000',
};

function massPrice(
  totalPrice: string,
  purchaseQuantity = '1',
): NonNullable<EstimationRecipeIngredientSnapshot['latestPrice']> {
  return {
    purchaseQuantity,
    purchaseUnit: kg,
    totalPrice,
  };
}

function volumePrice(
  totalPrice: string,
): NonNullable<EstimationRecipeIngredientSnapshot['latestPrice']> {
  return {
    purchaseQuantity: '1',
    purchaseUnit: liter,
    totalPrice,
  };
}

function makeRecipe(): EstimationRecipeIngredientSnapshot[] {
  return [
    {
      ingredientId: 'flour',
      name: 'Harina',
      bakerPercentage: '100',
      isFlourBase: true,
      baseUnit: g,
      latestPrice: massPrice('20', '25'),
    },
    {
      ingredientId: 'water',
      name: 'Agua',
      bakerPercentage: '60',
      isFlourBase: false,
      baseUnit: ml,
      densityGramsPerMl: '1',
      latestPrice: volumePrice('0'),
    },
    {
      ingredientId: 'sugar',
      name: 'Azúcar',
      bakerPercentage: '5',
      isFlourBase: false,
      baseUnit: g,
      latestPrice: massPrice('3'),
    },
    {
      ingredientId: 'fat',
      name: 'Grasa',
      bakerPercentage: '4',
      isFlourBase: false,
      baseUnit: ml,
      densityGramsPerMl: '0.9',
      latestPrice: volumePrice('4'),
    },
    {
      ingredientId: 'salt',
      name: 'Sal',
      bakerPercentage: '1.8',
      isFlourBase: false,
      baseUnit: g,
      latestPrice: massPrice('1'),
    },
    {
      ingredientId: 'yeast',
      name: 'Levadura',
      bakerPercentage: '1.5',
      isFlourBase: false,
      baseUnit: g,
      latestPrice: massPrice('10'),
    },
    {
      ingredientId: 'enhancer',
      name: 'Mejorante',
      bakerPercentage: '0.5',
      isFlourBase: false,
      baseUnit: g,
      latestPrice: massPrice('8'),
    },
  ];
}

function estimateByCount(
  quantity: string,
  recipeIngredients = makeRecipe(),
) {
  return calculateByProductCount({
    quantity,
    targetFinishedWeight: '35',
    targetFinishedWeightUnit: g,
    expectedBakeLossPercent: '12',
    recipeIngredients,
  });
}

describe('Estimation calculator', () => {
  it('calcula la harina necesaria para una pieza terminada de 35 g', () => {
    const result = estimateByCount('1');

    const expectedRawDough = 35 / (1 - 0.12);
    const expectedFlour = (expectedRawDough * 100) / 172.8;

    expect(result.mode).toBe('PRODUCT_COUNT');
    expect(Number(result.recipeTotalPercentage)).toBeCloseTo(172.8, 8);
    expect(Number(result.expectedFinishedMassGrams)).toBeCloseTo(35, 8);
    expect(Number(result.rawDoughMassGrams)).toBeCloseTo(
      expectedRawDough,
      8,
    );
    expect(Number(result.flourMassGrams)).toBeCloseTo(
      expectedFlour,
      8,
    );
    expect(result.costingComplete).toBe(true);
  });

  it('escala las cantidades de forma proporcional para 1000 piezas', () => {
    const one = estimateByCount('1');
    const thousand = estimateByCount('1000');

    expect(Number(thousand.expectedFinishedMassGrams)).toBeCloseTo(
      35000,
      6,
    );
    expect(Number(thousand.rawDoughMassGrams)).toBeCloseTo(
      Number(one.rawDoughMassGrams) * 1000,
      5,
    );
    expect(Number(thousand.flourMassGrams)).toBeCloseTo(
      Number(one.flourMassGrams) * 1000,
      5,
    );
    expect(Number(thousand.ingredients[0].quantityInBaseUnit)).toBeCloseTo(
      Number(one.ingredients[0].quantityInBaseUnit) * 1000,
      5,
    );
  });

  it('estima rendimiento y piezas completas a partir de 25 kg de harina', () => {
    const result = calculateByFlourQuantity({
      flourQuantity: '25',
      flourUnit: kg,
      expectedBakeLossPercent: '12',
      targetFinishedWeight: '35',
      targetFinishedWeightUnit: g,
      recipeIngredients: makeRecipe(),
    });

    expect(result.mode).toBe('FLOUR_QUANTITY');
    expect(Number(result.flourMassGrams)).toBeCloseTo(25000, 8);
    expect(Number(result.rawDoughMassGrams)).toBeCloseTo(43200, 8);
    expect(Number(result.expectedFinishedMassGrams)).toBeCloseTo(
      38016,
      8,
    );
    expect(Number(result.theoreticalProductCount)).toBeCloseTo(
      38016 / 35,
      8,
    );
    expect(result.wholeProductCount).toBe(1086);
  });

  it('convierte correctamente ingredientes líquidos usando su densidad', () => {
    const result = estimateByCount('1');

    const flourGrams = Number(result.flourMassGrams);
    const water = result.ingredients.find(
      (ingredient) => ingredient.ingredientId === 'water',
    );
    const fat = result.ingredients.find(
      (ingredient) => ingredient.ingredientId === 'fat',
    );

    expect(water).toBeDefined();
    expect(fat).toBeDefined();

    expect(Number(water!.ingredientMassGrams)).toBeCloseTo(
      flourGrams * 0.6,
      8,
    );
    expect(Number(water!.ingredientVolumeMl)).toBeCloseTo(
      flourGrams * 0.6,
      8,
    );
    expect(Number(fat!.ingredientVolumeMl)).toBeCloseTo(
      (flourGrams * 0.04) / 0.9,
      8,
    );
  });

  it('acepta un ingrediente con precio cero sin marcar el coste como incompleto', () => {
    const result = estimateByCount('1');
    const water = result.ingredients.find(
      (ingredient) => ingredient.ingredientId === 'water',
    );

    expect(water?.estimatedCost).toBe('0');
    expect(result.costingComplete).toBe(true);
    expect(result.estimatedIngredientCost).not.toBeNull();
    expect(result.ingredientsMissingPrice).toEqual([]);
  });

  it('marca el coste como incompleto si falta el precio de un ingrediente', () => {
    const recipe = makeRecipe();
    recipe[1].latestPrice = null;

    const result = estimateByCount('1', recipe);

    expect(result.costingComplete).toBe(false);
    expect(result.estimatedIngredientCost).toBeNull();
    expect(Number(result.knownIngredientCostSubtotal)).toBeGreaterThan(0);
    expect(result.ingredientsMissingPrice).toContain('Agua');
  });

  it('rechaza recetas cuya base de harina no suma el 100%', () => {
    const recipe = makeRecipe();
    recipe[0].bakerPercentage = '99';

    expect(() => estimateByCount('1', recipe)).toThrow(
      /base de harina deben sumar 100%/,
    );
  });

  it('rechaza una pérdida de peso del 100% o superior', () => {
    expect(() =>
      calculateByProductCount({
        quantity: '1',
        targetFinishedWeight: '35',
        targetFinishedWeightUnit: g,
        expectedBakeLossPercent: '100',
        recipeIngredients: makeRecipe(),
      }),
    ).toThrow(/menor que 100%/);
  });

  it('rechaza cantidades fraccionarias de productos contables', () => {
    expect(() => estimateByCount('1.5')).toThrow(
      /debe ser un número entero/,
    );
  });

  it('rechaza unidades de volumen sin densidad', () => {
    const recipe = makeRecipe();
    recipe[1].densityGramsPerMl = null;

    expect(() => estimateByCount('1', recipe)).toThrow(
      /necesita una densidad en g\/ml/,
    );
  });
});
