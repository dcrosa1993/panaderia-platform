import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { EstimationMode, Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../database/prisma.service.js';
import {
  calculateByFlourQuantity,
  calculateByProductCount,
  type EstimationCalculationResult,
  type EstimationRecipeIngredientSnapshot,
  type EstimationUnitSnapshot,
} from './estimation-calculator.js';
import {
  calculateFinancials,
  type FinancialCalculationResult,
} from './financial-calculator.js';
import { CreateEstimationDto } from './dto/create-estimation.dto.js';

@Injectable()
export class EstimationsService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertMembership(
    businessId: string,
    userId: string,
  ): Promise<void> {
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_businessId: {
          userId,
          businessId,
        },
      },
      select: {
        id: true,
      },
    });

    if (!membership) {
      throw new ForbiddenException('No tienes acceso a este negocio.');
    }
  }

  private toUnitSnapshot(unit: {
    code: string;
    name: string;
    symbol: string;
    dimension: 'MASS' | 'VOLUME' | 'COUNT';
    factorToBase: Prisma.Decimal;
  }): EstimationUnitSnapshot {
    return {
      code: unit.code,
      name: unit.name,
      symbol: unit.symbol,
      dimension: unit.dimension,
      factorToBase: unit.factorToBase.toString(),
    };
  }

  async create(businessId: string, userId: string, dto: CreateEstimationDto) {
    await this.assertMembership(businessId, userId);

    const product = await this.prisma.product.findFirst({
      where: {
        id: dto.productId,
        businessId,
      },
      include: {
        productionUnit: true,
        targetWeightUnit: true,
        business: {
          select: {
            currencyCode: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(
        'No se encontró el producto en este negocio.',
      );
    }

    if (!product.isActive) {
      throw new BadRequestException(
        'No se pueden crear estimaciones para un producto inactivo.',
      );
    }

    const effectiveAt = new Date();

    const recipeVersion = await this.prisma.recipeVersion.findFirst({
      where: {
        id: dto.recipeVersionId,
        productId: product.id,
        status: 'PUBLISHED',
      },
      include: {
        ingredients: {
          orderBy: [{ sortOrder: 'asc' }, { ingredientId: 'asc' }],
          include: {
            ingredient: {
              include: {
                baseUnit: true,
                prices: {
                  where: {
                    effectiveFrom: {
                      lte: effectiveAt,
                    },
                  },
                  orderBy: [{ effectiveFrom: 'desc' }, { createdAt: 'desc' }],
                  take: 1,
                  include: {
                    purchaseUnit: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!recipeVersion) {
      throw new NotFoundException(
        'No se encontró una versión publicada de la receta para este producto.',
      );
    }

    for (const line of recipeVersion.ingredients) {
      if (line.ingredient.businessId !== businessId) {
        throw new ForbiddenException(
          'La receta contiene ingredientes de otro negocio.',
        );
      }
    }

    const recipeIngredients: EstimationRecipeIngredientSnapshot[] =
      recipeVersion.ingredients.map((line) => {
        const ingredient = line.ingredient;
        const latestPrice = ingredient.prices[0] ?? null;

        return {
          ingredientId: ingredient.id,
          name: ingredient.name,
          bakerPercentage: line.bakerPercentage.toString(),
          isFlourBase: line.isFlourBase,
          baseUnit: this.toUnitSnapshot(ingredient.baseUnit),
          densityGramsPerMl: ingredient.densityGramsPerMl?.toString() ?? null,
          isActive: ingredient.isActive,
          latestPrice: latestPrice
            ? {
                purchaseQuantity: latestPrice.purchaseQuantity.toString(),
                purchaseUnit: this.toUnitSnapshot(latestPrice.purchaseUnit),
                totalPrice: latestPrice.totalPrice.toString(),
              }
            : null,
        };
      });

    let calculation: EstimationCalculationResult;
    let flourUnitSnapshot: EstimationUnitSnapshot | null = null;

    try {
      if (dto.mode === EstimationMode.PRODUCT_COUNT) {
        if (product.productionUnit.dimension !== 'COUNT') {
          throw new BadRequestException(
            'El cálculo por cantidad de piezas requiere que la unidad de producción sea de conteo.',
          );
        }

        if (
          product.targetFinishedWeight === null ||
          product.targetWeightUnit === null
        ) {
          throw new BadRequestException(
            'Configura el peso terminado por pieza en el producto antes de estimar por unidades.',
          );
        }

        if (dto.quantity === undefined) {
          throw new BadRequestException('Debes indicar la cantidad de piezas.');
        }

        if (product.targetWeightUnit.dimension !== 'MASS') {
          throw new BadRequestException(
            'El peso terminado del producto debe utilizar una unidad de masa.',
          );
        }

        calculation = calculateByProductCount({
          quantity: String(dto.quantity),
          targetFinishedWeight: product.targetFinishedWeight.toString(),
          targetFinishedWeightUnit: this.toUnitSnapshot(
            product.targetWeightUnit,
          ),
          expectedBakeLossPercent:
            recipeVersion.expectedBakeLossPercent.toString(),
          recipeIngredients,
        });
      } else if (dto.mode === EstimationMode.FLOUR_QUANTITY) {
        if (dto.flourQuantity === undefined || !dto.flourUnitId) {
          throw new BadRequestException(
            'Indica la cantidad de harina y su unidad de medida.',
          );
        }

        const flourUnit = await this.prisma.measurementUnit.findFirst({
          where: {
            id: dto.flourUnitId,
            dimension: 'MASS',
            isActive: true,
          },
        });

        if (!flourUnit) {
          throw new BadRequestException(
            'La unidad de harina no existe, está inactiva o no es una unidad de masa.',
          );
        }

        flourUnitSnapshot = this.toUnitSnapshot(flourUnit);

        const input = {
          flourQuantity: String(dto.flourQuantity),
          flourUnit: flourUnitSnapshot,
          expectedBakeLossPercent:
            recipeVersion.expectedBakeLossPercent.toString(),
          recipeIngredients,
        };

        if (
          product.targetFinishedWeight !== null &&
          product.targetWeightUnit !== null
        ) {
          if (product.targetWeightUnit.dimension !== 'MASS') {
            throw new BadRequestException(
              'El peso terminado del producto debe utilizar una unidad de masa.',
            );
          }

          calculation = calculateByFlourQuantity({
            ...input,
            targetFinishedWeight: product.targetFinishedWeight.toString(),
            targetFinishedWeightUnit: this.toUnitSnapshot(
              product.targetWeightUnit,
            ),
          });
        } else {
          calculation = calculateByFlourQuantity(input);
        }
      } else {
        throw new BadRequestException(
          'La modalidad de estimación no es válida.',
        );
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }

      throw error;
    }

    const calculationByIngredientId = new Map(
      calculation.ingredients.map((ingredient) => [
        ingredient.ingredientId,
        ingredient,
      ]),
    );

    const ingredientSnapshots = recipeVersion.ingredients.map((line) => {
      const ingredient = line.ingredient;
      const price = ingredient.prices[0] ?? null;
      const calculated = calculationByIngredientId.get(ingredient.id);

      if (!calculated) {
        throw new Error(`No se encontró el cálculo de "${ingredient.name}".`);
      }

      return {
        sourceIngredientId: ingredient.id,
        nameSnapshot: ingredient.name,
        bakerPercentage: line.bakerPercentage,
        isFlourBase: line.isFlourBase,
        sortOrder: line.sortOrder,

        baseUnitCode: ingredient.baseUnit.code,
        baseUnitName: ingredient.baseUnit.name,
        baseUnitSymbol: ingredient.baseUnit.symbol,
        baseUnitDimension: ingredient.baseUnit.dimension,
        baseUnitFactorToBase: ingredient.baseUnit.factorToBase,
        densityGramsPerMl: ingredient.densityGramsPerMl,

        ingredientMassGrams: new Prisma.Decimal(calculated.ingredientMassGrams),
        ingredientVolumeMl:
          calculated.ingredientVolumeMl === null
            ? null
            : new Prisma.Decimal(calculated.ingredientVolumeMl),
        quantityInBaseUnit: new Prisma.Decimal(calculated.quantityInBaseUnit),

        purchaseQuantity: price?.purchaseQuantity ?? null,
        purchaseUnitCode: price?.purchaseUnit.code ?? null,
        purchaseUnitName: price?.purchaseUnit.name ?? null,
        purchaseUnitSymbol: price?.purchaseUnit.symbol ?? null,
        purchaseUnitDimension: price?.purchaseUnit.dimension ?? null,
        purchaseUnitFactorToBase: price?.purchaseUnit.factorToBase ?? null,
        purchaseTotalPrice: price?.totalPrice ?? null,

        estimatedCost:
          calculated.estimatedCost === null
            ? null
            : new Prisma.Decimal(calculated.estimatedCost),
      };
    });

    const targetWeightUnit = product.targetWeightUnit;

    const laborCost = new Prisma.Decimal(String(dto.laborCost ?? 0));
    const energyCost = new Prisma.Decimal(String(dto.energyCost ?? 0));
    const packagingCost = new Prisma.Decimal(String(dto.packagingCost ?? 0));
    const otherCost = new Prisma.Decimal(String(dto.otherCost ?? 0));

    const hasMargin = dto.targetMarginPercent !== undefined;
    const hasTaxRate = dto.salesTaxRatePercent !== undefined;

    if (hasMargin !== hasTaxRate) {
      throw new BadRequestException(
        'Debes proporcionar el margen objetivo y el impuesto juntos.',
      );
    }

    const additionalCostsSubtotal = laborCost
      .plus(energyCost)
      .plus(packagingCost)
      .plus(otherCost);

    const knownCostSubtotal = new Prisma.Decimal(
      calculation.knownIngredientCostSubtotal,
    ).plus(additionalCostsSubtotal);

    const productionCostTotal =
      calculation.estimatedIngredientCost === null
        ? null
        : new Prisma.Decimal(calculation.estimatedIngredientCost).plus(
            additionalCostsSubtotal,
          );

    let financial: FinancialCalculationResult | null = null;

    if (hasMargin && hasTaxRate) {
      try {
        const productCount =
          dto.mode === EstimationMode.PRODUCT_COUNT
            ? String(dto.quantity)
            : calculation.wholeProductCount !== null &&
                calculation.wholeProductCount > 0
              ? String(calculation.wholeProductCount)
              : undefined;

        financial = calculateFinancials({
          ingredientCost: calculation.estimatedIngredientCost,
          knownIngredientCostSubtotal: calculation.knownIngredientCostSubtotal,
          laborCost: laborCost.toString(),
          energyCost: energyCost.toString(),
          packagingCost: packagingCost.toString(),
          otherCost: otherCost.toString(),
          targetMarginPercent: String(dto.targetMarginPercent),
          salesTaxRatePercent: String(dto.salesTaxRatePercent),
          productCount,
        });
      } catch (error) {
        if (error instanceof Error) {
          throw new BadRequestException(error.message);
        }

        throw error;
      }
    }

    return this.prisma.estimation.create({
      data: {
        businessId,
        productId: product.id,
        recipeVersionId: recipeVersion.id,
        createdByUserId: userId,
        mode: dto.mode,

        productNameSnapshot: product.name,
        productProductionUnitCodeSnapshot: product.productionUnit.code,
        currencyCodeSnapshot: product.business.currencyCode,
        recipeVersionNumber: recipeVersion.versionNumber,

        plannedProductCount:
          dto.mode === EstimationMode.PRODUCT_COUNT ? dto.quantity! : null,

        targetFinishedWeightInput: product.targetFinishedWeight,
        targetFinishedWeightUnitCode: targetWeightUnit?.code ?? null,
        targetFinishedWeightUnitName: targetWeightUnit?.name ?? null,
        targetFinishedWeightUnitSymbol: targetWeightUnit?.symbol ?? null,
        targetFinishedWeightUnitFactorToBase:
          targetWeightUnit?.factorToBase ?? null,

        flourQuantity:
          dto.mode === EstimationMode.FLOUR_QUANTITY
            ? new Prisma.Decimal(String(dto.flourQuantity))
            : null,
        flourUnitCode: flourUnitSnapshot?.code ?? null,
        flourUnitName: flourUnitSnapshot?.name ?? null,
        flourUnitSymbol: flourUnitSnapshot?.symbol ?? null,
        flourUnitFactorToBase:
          flourUnitSnapshot === null
            ? null
            : new Prisma.Decimal(String(flourUnitSnapshot.factorToBase)),

        expectedBakeLossPercent: new Prisma.Decimal(
          calculation.expectedBakeLossPercent,
        ),
        recipeTotalPercentage: new Prisma.Decimal(
          calculation.recipeTotalPercentage,
        ),
        flourMassGrams: new Prisma.Decimal(calculation.flourMassGrams),
        rawDoughMassGrams: new Prisma.Decimal(calculation.rawDoughMassGrams),
        expectedFinishedMassGrams: new Prisma.Decimal(
          calculation.expectedFinishedMassGrams,
        ),

        targetFinishedWeightPerUnitGrams:
          calculation.targetFinishedWeightPerUnitGrams === null
            ? null
            : new Prisma.Decimal(calculation.targetFinishedWeightPerUnitGrams),
        theoreticalProductCount:
          calculation.theoreticalProductCount === null
            ? null
            : new Prisma.Decimal(calculation.theoreticalProductCount),
        wholeProductCount: calculation.wholeProductCount,

        costingComplete: calculation.costingComplete,
        estimatedIngredientCost:
          calculation.estimatedIngredientCost === null
            ? null
            : new Prisma.Decimal(calculation.estimatedIngredientCost),
        knownIngredientCostSubtotal: new Prisma.Decimal(
          calculation.knownIngredientCostSubtotal,
        ),
        missingPriceIngredientNames:
          calculation.ingredientsMissingPrice as Prisma.InputJsonValue,

        laborCost,
        energyCost,
        packagingCost,
        otherCost,
        additionalCostsSubtotal,
        knownCostSubtotal,
        productionCostTotal,

        targetMarginPercent:
          dto.targetMarginPercent === undefined
            ? null
            : new Prisma.Decimal(String(dto.targetMarginPercent)),
        salesTaxRatePercent:
          dto.salesTaxRatePercent === undefined
            ? null
            : new Prisma.Decimal(String(dto.salesTaxRatePercent)),

        suggestedNetSalesTotal:
          financial?.suggestedNetSalesTotal == null
            ? null
            : new Prisma.Decimal(financial.suggestedNetSalesTotal),
        targetProfitTotal:
          financial?.targetProfitTotal == null
            ? null
            : new Prisma.Decimal(financial.targetProfitTotal),
        salesTaxTotal:
          financial?.salesTaxTotal == null
            ? null
            : new Prisma.Decimal(financial.salesTaxTotal),
        suggestedCustomerSalesTotal:
          financial?.suggestedCustomerSalesTotal == null
            ? null
            : new Prisma.Decimal(financial.suggestedCustomerSalesTotal),

        productionCostPerUnit:
          financial?.productionCostPerUnit == null
            ? null
            : new Prisma.Decimal(financial.productionCostPerUnit),
        suggestedNetUnitPrice:
          financial?.suggestedNetUnitPrice == null
            ? null
            : new Prisma.Decimal(financial.suggestedNetUnitPrice),
        targetProfitPerUnit:
          financial?.targetProfitPerUnit == null
            ? null
            : new Prisma.Decimal(financial.targetProfitPerUnit),
        salesTaxPerUnit:
          financial?.salesTaxPerUnit == null
            ? null
            : new Prisma.Decimal(financial.salesTaxPerUnit),
        suggestedCustomerUnitPrice:
          financial?.suggestedCustomerUnitPrice == null
            ? null
            : new Prisma.Decimal(financial.suggestedCustomerUnitPrice),

        ingredients: {
          create: ingredientSnapshots,
        },
      },
      include: {
        ingredients: {
          orderBy: [{ sortOrder: 'asc' }, { sourceIngredientId: 'asc' }],
        },
      },
    });
  }

  async findAll(businessId: string, userId: string) {
    await this.assertMembership(businessId, userId);

    return this.prisma.estimation.findMany({
      where: {
        businessId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100,
    });
  }

  async findOne(businessId: string, userId: string, estimationId: string) {
    await this.assertMembership(businessId, userId);

    const estimation = await this.prisma.estimation.findFirst({
      where: {
        id: estimationId,
        businessId,
      },
      include: {
        ingredients: {
          orderBy: [{ sortOrder: 'asc' }, { sourceIngredientId: 'asc' }],
        },
      },
    });

    if (!estimation) {
      throw new NotFoundException(
        'No se encontró la estimación en este negocio.',
      );
    }

    return estimation;
  }
}
