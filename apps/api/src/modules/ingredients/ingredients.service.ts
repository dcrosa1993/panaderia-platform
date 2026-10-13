import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../database/prisma.service.js';
import { BusinessesService } from '../businesses/businesses.service.js';
import {
  CreateIngredientDto,
  CreateIngredientPriceDto,
} from './dto/create-ingredient.dto.js';
import { UpdateIngredientDto } from './dto/update-ingredient.dto.js';

const unitSelect = {
  id: true,
  code: true,
  name: true,
  symbol: true,
  dimension: true,
  factorToBase: true,
  isBase: true,
} satisfies Prisma.MeasurementUnitSelect;

const ingredientInclude = {
  baseUnit: { select: unitSelect },
  prices: {
    take: 1,
    orderBy: [{ effectiveFrom: 'desc' }, { createdAt: 'desc' }],
    include: {
      purchaseUnit: { select: unitSelect },
    },
  },
} satisfies Prisma.IngredientInclude;

type IngredientRecord = Prisma.IngredientGetPayload<{
  include: typeof ingredientInclude;
}>;

@Injectable()
export class IngredientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly businessesService: BusinessesService,
  ) {}

  async findForBusiness(userId: string, businessId: string, search?: string) {
    await this.businessesService.assertMembership(userId, businessId);

    const term = search?.trim().slice(0, 100);

    const ingredients = await this.prisma.ingredient.findMany({
      where: {
        businessId,
        isActive: true,
        ...(term
          ? {
              name: {
                contains: term,
                mode: 'insensitive',
              },
            }
          : {}),
      },
      orderBy: { name: 'asc' },
      include: ingredientInclude,
    });

    return {
      ingredients: ingredients.map((ingredient) =>
        this.serializeIngredient(ingredient),
      ),
    };
  }

  async createForBusiness(
    userId: string,
    businessId: string,
    dto: CreateIngredientDto,
  ) {
    await this.businessesService.assertMembership(userId, businessId);

    const name = dto.name.trim();
    const baseUnit = await this.getCompatibleUnits(
      dto.baseUnitId,
      dto.initialPrice.purchaseUnitId,
    );

    this.validatePurchase(dto.initialPrice);

    try {
      const ingredient = await this.prisma.ingredient.create({
        data: {
          businessId,
          name,
          normalizedName: name.toLowerCase(),
          description: dto.description?.trim() || null,
          baseUnitId: baseUnit.baseUnit.id,
          prices: {
            create: {
              purchaseQuantity: dto.initialPrice.purchaseQuantity,
              purchaseUnitId: baseUnit.purchaseUnit.id,
              totalPrice: dto.initialPrice.totalPrice,
            },
          },
        },
        include: ingredientInclude,
      });

      return this.serializeIngredient(ingredient);
    } catch (error: unknown) {
      if (this.isPrismaError(error, 'P2002')) {
        throw new ConflictException(
          'Ya existe un ingrediente con ese nombre en este negocio.',
        );
      }

      throw error;
    }
  }

  async findOneForBusiness(
    userId: string,
    businessId: string,
    ingredientId: string,
  ) {
    await this.businessesService.assertMembership(userId, businessId);

    const ingredient = await this.prisma.ingredient.findFirst({
      where: { id: ingredientId, businessId },
      include: {
        ...ingredientInclude,
        prices: {
          ...ingredientInclude.prices,
          take: 1,
        },
      },
    });

    if (!ingredient) {
      throw new NotFoundException('Ingrediente no encontrado.');
    }

    return this.serializeIngredient(ingredient);
  }

  async updateForBusiness(
    userId: string,
    businessId: string,
    ingredientId: string,
    dto: UpdateIngredientDto,
  ) {
    await this.businessesService.assertMembership(userId, businessId);

    const data: Prisma.IngredientUpdateManyMutationInput = {};

    if (dto.name !== undefined) {
      const name = dto.name.trim();

      Object.assign(data, {
        name,
        normalizedName: name.toLowerCase(),
      });
    }

    if (dto.description !== undefined) {
      data.description = dto.description.trim() || null;
    }

    if (dto.isActive !== undefined) {
      data.isActive = dto.isActive;
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException(
        'Debes proporcionar al menos un campo para actualizar.',
      );
    }

    try {
      const result = await this.prisma.ingredient.updateMany({
        where: { id: ingredientId, businessId },
        data,
      });

      if (result.count === 0) {
        throw new NotFoundException('Ingrediente no encontrado.');
      }

      return this.findOneForBusiness(userId, businessId, ingredientId);
    } catch (error: unknown) {
      if (this.isPrismaError(error, 'P2002')) {
        throw new ConflictException(
          'Ya existe un ingrediente con ese nombre en este negocio.',
        );
      }

      throw error;
    }
  }

  async addPrice(
    userId: string,
    businessId: string,
    ingredientId: string,
    dto: CreateIngredientPriceDto,
  ) {
    await this.businessesService.assertMembership(userId, businessId);

    const ingredient = await this.prisma.ingredient.findFirst({
      where: { id: ingredientId, businessId },
      select: { id: true, baseUnitId: true },
    });

    if (!ingredient) {
      throw new NotFoundException('Ingrediente no encontrado.');
    }

    const units = await this.getCompatibleUnits(
      ingredient.baseUnitId,
      dto.purchaseUnitId,
    );

    this.validatePurchase(dto);

    await this.prisma.ingredientPrice.create({
      data: {
        ingredientId,
        purchaseQuantity: dto.purchaseQuantity,
        purchaseUnitId: units.purchaseUnit.id,
        totalPrice: dto.totalPrice,
      },
    });

    return this.findOneForBusiness(userId, businessId, ingredientId);
  }

  async findPriceHistory(
    userId: string,
    businessId: string,
    ingredientId: string,
  ) {
    await this.businessesService.assertMembership(userId, businessId);

    const ingredient = await this.prisma.ingredient.findFirst({
      where: { id: ingredientId, businessId },
      include: { baseUnit: { select: { factorToBase: true } } },
    });

    if (!ingredient) {
      throw new NotFoundException('Ingrediente no encontrado.');
    }

    const prices = await this.prisma.ingredientPrice.findMany({
      where: { ingredientId },
      orderBy: [{ effectiveFrom: 'desc' }, { createdAt: 'desc' }],
      include: {
        purchaseUnit: { select: unitSelect },
      },
    });

    return {
      prices: prices.map((price) => ({
        id: price.id,
        purchaseQuantity: price.purchaseQuantity.toString(),
        purchaseUnit: {
          ...price.purchaseUnit,
          factorToBase: price.purchaseUnit.factorToBase.toString(),
        },
        totalPrice: price.totalPrice.toString(),
        costPerBaseUnit: this.calculateCostPerBaseUnit(
          price.totalPrice,
          price.purchaseQuantity,
          price.purchaseUnit.factorToBase,
          ingredient.baseUnit.factorToBase,
        ),
        effectiveFrom: price.effectiveFrom,
        createdAt: price.createdAt,
      })),
    };
  }

  private async getCompatibleUnits(baseUnitId: string, purchaseUnitId: string) {
    const units = await this.prisma.measurementUnit.findMany({
      where: {
        id: { in: [baseUnitId, purchaseUnitId] },
        isActive: true,
      },
      select: unitSelect,
    });

    const baseUnit = units.find((unit) => unit.id === baseUnitId);
    const purchaseUnit = units.find((unit) => unit.id === purchaseUnitId);

    if (!baseUnit || !purchaseUnit) {
      throw new BadRequestException(
        'La unidad base o la unidad de compra no existe o no está activa.',
      );
    }

    if (baseUnit.dimension !== purchaseUnit.dimension) {
      throw new BadRequestException(
        'La unidad de compra debe pertenecer a la misma dimensión que la unidad base.',
      );
    }

    return { baseUnit, purchaseUnit };
  }

  private validatePurchase(dto: CreateIngredientPriceDto): void {
    const quantity = Number(dto.purchaseQuantity);
    const price = Number(dto.totalPrice);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new BadRequestException(
        'La cantidad de compra debe ser mayor que cero.',
      );
    }

    if (!Number.isFinite(price) || price <= 0) {
      throw new BadRequestException('El precio total debe ser mayor que cero.');
    }
  }

  private serializeIngredient(ingredient: IngredientRecord) {
    const price = ingredient.prices[0] ?? null;

    return {
      id: ingredient.id,
      businessId: ingredient.businessId,
      name: ingredient.name,
      description: ingredient.description,
      isActive: ingredient.isActive,
      baseUnit: {
        ...ingredient.baseUnit,
        factorToBase: ingredient.baseUnit.factorToBase.toString(),
      },
      latestPrice: price
        ? {
            id: price.id,
            purchaseQuantity: price.purchaseQuantity.toString(),
            purchaseUnit: {
              ...price.purchaseUnit,
              factorToBase: price.purchaseUnit.factorToBase.toString(),
            },
            totalPrice: price.totalPrice.toString(),
            costPerBaseUnit: this.calculateCostPerBaseUnit(
              price.totalPrice,
              price.purchaseQuantity,
              price.purchaseUnit.factorToBase,
              ingredient.baseUnit.factorToBase,
            ),
            effectiveFrom: price.effectiveFrom,
          }
        : null,
      createdAt: ingredient.createdAt,
      updatedAt: ingredient.updatedAt,
    };
  }

  private calculateCostPerBaseUnit(
    totalPrice: Prisma.Decimal,
    purchaseQuantity: Prisma.Decimal,
    purchaseFactor: Prisma.Decimal,
    baseFactor: Prisma.Decimal,
  ): string {
    const quantityInBaseUnits = purchaseQuantity
      .mul(purchaseFactor)
      .div(baseFactor);

    return new Prisma.Decimal(totalPrice).div(quantityInBaseUnits).toString();
  }

  private isPrismaError(error: unknown, code: string): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === code
    );
  }
}
