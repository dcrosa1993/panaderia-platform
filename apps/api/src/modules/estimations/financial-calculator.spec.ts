
import { describe, expect, it } from 'vitest';

import { calculateFinancials } from './financial-calculator.js';

const baseInput = {
  ingredientCost: '25065.89',
  knownIngredientCostSubtotal: '25065.89',
  laborCost: '1200',
  energyCost: '300',
  packagingCost: '500',
  otherCost: '250',
  targetMarginPercent: '30',
  salesTaxRatePercent: '10',
  productCount: '1000',
};

describe('Financial calculator', () => {
  it('calcula el coste total del lote', () => {
    const result = calculateFinancials(baseInput);

    expect(Number(result.additionalCostsSubtotal)).toBeCloseTo(
      2250,
      8,
    );

    expect(Number(result.productionCostTotal)).toBeCloseTo(
      27315.89,
      8,
    );

    expect(result.pricingComplete).toBe(true);
  });

  it('calcula el precio neto necesario para alcanzar el margen objetivo', () => {
    const result = calculateFinancials(baseInput);

    expect(Number(result.suggestedNetSalesTotal)).toBeCloseTo(
      39022.7,
      8,
    );

    expect(Number(result.targetProfitTotal)).toBeCloseTo(
      11706.81,
      8,
    );

    const actualMargin =
      Number(result.targetProfitTotal) /
      Number(result.suggestedNetSalesTotal) *
      100;

    expect(actualMargin).toBeCloseTo(30, 8);
  });

  it('añade el impuesto después de calcular las ventas netas', () => {
    const result = calculateFinancials(baseInput);

    expect(Number(result.salesTaxTotal)).toBeCloseTo(
      3902.27,
      8,
    );

    expect(Number(result.suggestedCustomerSalesTotal)).toBeCloseTo(
      42924.97,
      8,
    );
  });

  it('calcula correctamente los importes por unidad', () => {
    const result = calculateFinancials(baseInput);

    expect(Number(result.productionCostPerUnit)).toBeCloseTo(
      27.31589,
      8,
    );

    expect(Number(result.suggestedNetUnitPrice)).toBeCloseTo(
      39.0227,
      8,
    );

    expect(Number(result.salesTaxPerUnit)).toBeCloseTo(
      3.90227,
      8,
    );

    expect(Number(result.suggestedCustomerUnitPrice)).toBeCloseTo(
      42.92497,
      8,
    );
  });

  it('acepta un coste de ingredientes igual a cero', () => {
    const result = calculateFinancials({
      ingredientCost: '0',
      knownIngredientCostSubtotal: '0',
      targetMarginPercent: '20',
      salesTaxRatePercent: '0',
      productCount: '10',
    });

    expect(result.pricingComplete).toBe(true);
    expect(result.productionCostTotal).toBe('0');
    expect(result.suggestedNetSalesTotal).toBe('0');
    expect(result.suggestedCustomerUnitPrice).toBe('0');
  });

  it('no propone precios si falta algún precio de ingrediente', () => {
    const result = calculateFinancials({
      ingredientCost: null,
      knownIngredientCostSubtotal: '1800',
      laborCost: '200',
      energyCost: '50',
      targetMarginPercent: '25',
      salesTaxRatePercent: '10',
      productCount: '100',
    });

    expect(result.costingComplete).toBe(false);
    expect(result.pricingComplete).toBe(false);

    expect(Number(result.knownCostSubtotal)).toBeCloseTo(
      2050,
      8,
    );

    expect(result.productionCostTotal).toBeNull();
    expect(result.suggestedNetSalesTotal).toBeNull();
    expect(result.suggestedCustomerUnitPrice).toBeNull();
  });

  it('calcula el precio del lote aunque no se conozca el número de piezas', () => {
    const result = calculateFinancials({
      ...baseInput,
      productCount: null,
    });

    expect(result.productionCostTotal).not.toBeNull();
    expect(result.suggestedCustomerSalesTotal).not.toBeNull();
    expect(result.suggestedCustomerUnitPrice).toBeNull();
  });

  it('acepta un margen objetivo de cero', () => {
    const result = calculateFinancials({
      ingredientCost: '100',
      knownIngredientCostSubtotal: '100',
      targetMarginPercent: '0',
      salesTaxRatePercent: '0',
    });

    expect(Number(result.suggestedNetSalesTotal)).toBeCloseTo(
      100,
      8,
    );

    expect(Number(result.targetProfitTotal)).toBeCloseTo(
      0,
      8,
    );
  });

  it('rechaza un margen del 100%', () => {
    expect(() =>
      calculateFinancials({
        ingredientCost: '100',
        knownIngredientCostSubtotal: '100',
        targetMarginPercent: '100',
        salesTaxRatePercent: '0',
      }),
    ).toThrow(/menor que 100%/);
  });

  it('rechaza costes negativos', () => {
    expect(() =>
      calculateFinancials({
        ingredientCost: '100',
        knownIngredientCostSubtotal: '100',
        laborCost: '-10',
        targetMarginPercent: '20',
        salesTaxRatePercent: '0',
      }),
    ).toThrow(/no puede ser negativo/);
  });

  it('rechaza un impuesto negativo', () => {
    expect(() =>
      calculateFinancials({
        ingredientCost: '100',
        knownIngredientCostSubtotal: '100',
        targetMarginPercent: '20',
        salesTaxRatePercent: '-1',
      }),
    ).toThrow(/no puede ser negativo/);
  });

  it('rechaza una cantidad fraccionaria de unidades vendibles', () => {
    expect(() =>
      calculateFinancials({
        ingredientCost: '100',
        knownIngredientCostSubtotal: '100',
        targetMarginPercent: '20',
        salesTaxRatePercent: '0',
        productCount: '10.5',
      }),
    ).toThrow(/entero mayor que cero/);
  });
});
