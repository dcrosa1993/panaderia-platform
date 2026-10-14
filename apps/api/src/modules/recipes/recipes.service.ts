import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../database/prisma.service.js';
import { BusinessesService } from '../businesses/businesses.service.js';
import { CreateRecipeVersionDto } from './dto/create-recipe-version.dto.js';
import { UpdateRecipeVersionDto } from './dto/update-recipe-version.dto.js';
import { ReplaceRecipeIngredientsDto } from './dto/replace-recipe-ingredients.dto.js';

const unitSelect = {
  id: true,
  code: true,
  name: true,
  symbol: true,
  dimension: true,
  factorToBase: true,
  isBase: true,
} satisfies Prisma.MeasurementUnitSelect;

const recipeVersionInclude = {
  product: {
    select: {
      id: true,
      name: true,
      businessId: true,
      productionUnit: { select: unitSelect },
      targetFinishedWeight: true,
      targetWeightUnit: { select: unitSelect },
    },
  },
  ingredients: {
    orderBy: [{ sortOrder: 'asc' }, { ingredientId: 'asc' }],
    include: {
      ingredient: {
        select: {
          id: true,
          name: true,
          description: true,
          isActive: true,
          baseUnit: { select: unitSelect },
          densityGramsPerMl: true,
          prices: {
            take: 1,
            orderBy: [{ effectiveFrom: 'desc' }, { createdAt: 'desc' }],
            select: {
              purchaseQuantity: true,
              totalPrice: true,
              effectiveFrom: true,
              purchaseUnit: { select: unitSelect },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.RecipeVersionInclude;

type RecipeVersionDetails = Prisma.RecipeVersionGetPayload<{
  include: typeof recipeVersionInclude;
}>;

@Injectable()
export class RecipesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly businessesService: BusinessesService,
  ) {}

  async findVersions(userId: string, businessId: string, productId: string) {
    await this.ensureProduct(userId, businessId, productId);

    const versions = await this.prisma.recipeVersion.findMany({
      where: { productId },
      orderBy: { versionNumber: 'desc' },
      include: recipeVersionInclude,
    });

    return {
      versions: versions.map((version) => this.serializeVersion(version)),
    };
  }

  async createDraft(
    userId: string,
    businessId: string,
    productId: string,
    dto: CreateRecipeVersionDto,
  ) {
    await this.ensureProduct(userId, businessId, productId, true);

    this.validateBakeLoss(dto.expectedBakeLossPercent);

    const latest = await this.prisma.recipeVersion.findFirst({
      where: { productId },
      orderBy: { versionNumber: 'desc' },
      select: { versionNumber: true },
    });

    const nextVersion = (latest?.versionNumber ?? 0) + 1;

    try {
      const version = await this.prisma.recipeVersion.create({
        data: {
          productId,
          versionNumber: nextVersion,
          status: 'DRAFT',
          expectedBakeLossPercent: new Prisma.Decimal(
            dto.expectedBakeLossPercent,
          ),
          notes: dto.notes?.trim() || null,
        },
        include: recipeVersionInclude,
      });

      return this.serializeVersion(version);
    } catch (error: unknown) {
      if (this.isPrismaError(error, 'P2002')) {
        throw new ConflictException(
          'Se ha creado otra versión de esta receta al mismo tiempo. Vuelve a intentarlo.',
        );
      }

      throw error;
    }
  }

  async findVersion(
    userId: string,
    businessId: string,
    productId: string,
    versionId: string,
  ) {
    await this.ensureProduct(userId, businessId, productId);

    const version = await this.prisma.recipeVersion.findFirst({
      where: { id: versionId, productId },
      include: recipeVersionInclude,
    });

    if (!version) {
      throw new NotFoundException('Versión de receta no encontrada.');
    }

    return this.serializeVersion(version);
  }

  async updateDraft(
    userId: string,
    businessId: string,
    productId: string,
    versionId: string,
    dto: UpdateRecipeVersionDto,
  ) {
    await this.ensureProduct(userId, businessId, productId);

    const current = await this.getVersionRecord(productId, versionId);

    this.assertDraft(current.status);

    const data: Prisma.RecipeVersionUpdateManyMutationInput = {};

    if (dto.expectedBakeLossPercent !== undefined) {
      this.validateBakeLoss(dto.expectedBakeLossPercent);
      data.expectedBakeLossPercent = new Prisma.Decimal(
        dto.expectedBakeLossPercent,
      );
    }

    if (dto.notes !== undefined) {
      data.notes = dto.notes?.trim() || null;
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException(
        'Debes proporcionar al menos un campo para actualizar.',
      );
    }

    await this.prisma.recipeVersion.updateMany({
      where: {
        id: versionId,
        productId,
        status: 'DRAFT',
      },
      data,
    });

    return this.findVersion(userId, businessId, productId, versionId);
  }

  async replaceIngredients(
    userId: string,
    businessId: string,
    productId: string,
    versionId: string,
    dto: ReplaceRecipeIngredientsDto,
  ) {
    await this.ensureProduct(userId, businessId, productId);

    const version = await this.getVersionRecord(productId, versionId);

    this.assertDraft(version.status);

    const ingredientIds = dto.ingredients.map((line) => line.ingredientId);

    if (new Set(ingredientIds).size !== ingredientIds.length) {
      throw new BadRequestException(
        'No puedes incluir el mismo ingrediente más de una vez en una receta.',
      );
    }

    for (const line of dto.ingredients) {
      const percentage = Number(line.bakerPercentage);

      if (!Number.isFinite(percentage) || percentage <= 0) {
        throw new BadRequestException(
          'Todos los porcentajes deben ser mayores que cero.',
        );
      }
    }

    const ingredients = await this.prisma.ingredient.findMany({
      where: {
        id: { in: ingredientIds },
        businessId,
        isActive: true,
      },
      select: {
        id: true,
        baseUnit: {
          select: { dimension: true },
        },
        densityGramsPerMl: true,
      },
    });

    if (ingredients.length !== ingredientIds.length) {
      throw new BadRequestException(
        'Uno o más ingredientes no existen, están inactivos o no pertenecen a este negocio.',
      );
    }

    if (
      ingredients.some((ingredient) => {
        if (ingredient.baseUnit.dimension === 'MASS') {
          return false;
        }

        if (ingredient.baseUnit.dimension !== 'VOLUME') {
          return true;
        }

        return (
          !ingredient.densityGramsPerMl ||
          !ingredient.densityGramsPerMl.greaterThan(0)
        );
      })
    ) {
      throw new BadRequestException(
        'Cada ingrediente debe tener unidad base de masa o de volumen con densidad positiva registrada.',
      );
    }

    const savedVersionId = await this.prisma.$transaction(async (tx) => {
      const current = await tx.recipeVersion.findFirst({
        where: { id: versionId, productId },
        select: { id: true, status: true },
      });

      if (!current) {
        throw new NotFoundException('Versión de receta no encontrada.');
      }

      this.assertDraft(current.status);

      await tx.recipeIngredient.deleteMany({
        where: { recipeVersionId: versionId },
      });

      await tx.recipeIngredient.createMany({
        data: dto.ingredients.map((line, index) => ({
          recipeVersionId: versionId,
          ingredientId: line.ingredientId,
          bakerPercentage: new Prisma.Decimal(line.bakerPercentage),
          isFlourBase: line.isFlourBase,
          sortOrder: line.sortOrder ?? index,
        })),
      });

      return current.id;
    });

    const updated = await this.prisma.recipeVersion.findUnique({
      where: { id: savedVersionId },
      include: recipeVersionInclude,
    });

    if (!updated) {
      throw new NotFoundException(
        'No se pudo recuperar la versión de receta actualizada.',
      );
    }

    return this.serializeVersion(updated);
  }

  async publish(
    userId: string,
    businessId: string,
    productId: string,
    versionId: string,
  ) {
    await this.ensureProduct(userId, businessId, productId);

    const published = await this.prisma.$transaction(async (tx) => {
      const version = await tx.recipeVersion.findFirst({
        where: { id: versionId, productId },
        include: recipeVersionInclude,
      });

      if (!version) {
        throw new NotFoundException('Versión de receta no encontrada.');
      }

      this.assertDraft(version.status);
      this.validateFormulaForPublication(version);

      await tx.recipeVersion.updateMany({
        where: {
          productId,
          status: 'PUBLISHED',
          id: { not: versionId },
        },
        data: { status: 'SUPERSEDED' },
      });

      return tx.recipeVersion.update({
        where: { id: versionId },
        data: {
          status: 'PUBLISHED',
          publishedAt: new Date(),
        },
        include: recipeVersionInclude,
      });
    });

    return this.serializeVersion(published);
  }

  private async ensureProduct(
    userId: string,
    businessId: string,
    productId: string,
    requireActive = false,
  ) {
    await this.businessesService.assertMembership(userId, businessId);

    const product = await this.prisma.product.findFirst({
      where: { id: productId, businessId },
      select: {
        id: true,
        isActive: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado.');
    }

    if (requireActive && !product.isActive) {
      throw new BadRequestException(
        'No se puede crear una nueva receta para un producto inactivo.',
      );
    }

    return product;
  }

  private async getVersionRecord(productId: string, versionId: string) {
    const version = await this.prisma.recipeVersion.findFirst({
      where: { id: versionId, productId },
      select: { id: true, status: true },
    });

    if (!version) {
      throw new NotFoundException('Versión de receta no encontrada.');
    }

    return version;
  }

  private assertDraft(status: string): void {
    if (status !== 'DRAFT') {
      throw new ConflictException(
        'Solo se pueden modificar versiones en estado DRAFT. Crea una nueva versión para realizar cambios.',
      );
    }
  }

  private validateBakeLoss(value: string): void {
    const loss = new Prisma.Decimal(value);

    if (loss.isNegative() || loss.greaterThanOrEqualTo(100)) {
      throw new BadRequestException(
        'La pérdida de horneado debe estar entre 0 y menos de 100 %. ',
      );
    }
  }

  private validateFormulaForPublication(version: RecipeVersionDetails): void {
    if (version.ingredients.length === 0) {
      throw new BadRequestException(
        'Añade ingredientes antes de publicar la receta.',
      );
    }

    const flourLines = version.ingredients.filter((line) => line.isFlourBase);

    if (flourLines.length === 0) {
      throw new BadRequestException(
        'Marca al menos un ingrediente como harina base.',
      );
    }

    const flourTotal = flourLines.reduce(
      (sum, line) => sum.add(line.bakerPercentage),
      new Prisma.Decimal(0),
    );

    if (!flourTotal.equals(new Prisma.Decimal(100))) {
      throw new BadRequestException(
        `Los ingredientes marcados como harina base deben sumar 100 %. Actualmente suman ${flourTotal.toString()} %.`,
      );
    }

    for (const line of version.ingredients) {
      if (!line.bakerPercentage.greaterThan(0)) {
        throw new BadRequestException(
          'Todos los porcentajes deben ser mayores que cero.',
        );
      }

      if (!line.ingredient.isActive) {
        throw new BadRequestException(
          `El ingrediente "${line.ingredient.name}" está inactivo. Sustitúyelo antes de publicar.`,
        );
      }

      const dimension = line.ingredient.baseUnit.dimension;

      if (dimension === 'VOLUME') {
        if (
          !line.ingredient.densityGramsPerMl ||
          !line.ingredient.densityGramsPerMl.greaterThan(0)
        ) {
          throw new BadRequestException(
            `El ingrediente "${line.ingredient.name}" tiene unidad base de volumen, pero no tiene una densidad válida.`,
          );
        }
      } else if (dimension !== 'MASS') {
        throw new BadRequestException(
          `El ingrediente "${line.ingredient.name}" no tiene una unidad compatible con las fórmulas por peso.`,
        );
      }
    }
  }

  private serializeVersion(version: RecipeVersionDetails) {
    return {
      id: version.id,
      productId: version.productId,
      versionNumber: version.versionNumber,
      status: version.status,
      expectedBakeLossPercent: version.expectedBakeLossPercent.toString(),
      notes: version.notes,
      publishedAt: version.publishedAt,
      createdAt: version.createdAt,
      updatedAt: version.updatedAt,
      product: {
        id: version.product.id,
        name: version.product.name,
        businessId: version.product.businessId,
        productionUnit: {
          ...version.product.productionUnit,
          factorToBase: version.product.productionUnit.factorToBase.toString(),
        },
        targetFinishedWeight:
          version.product.targetFinishedWeight?.toString() ?? null,
        targetWeightUnit: version.product.targetWeightUnit
          ? {
              ...version.product.targetWeightUnit,
              factorToBase:
                version.product.targetWeightUnit.factorToBase.toString(),
            }
          : null,
      },
      ingredients: version.ingredients.map((line) => {
        const latestPrice = line.ingredient.prices[0] ?? null;

        let serializedPrice = null;

        if (latestPrice) {
          const quantityInBase = latestPrice.purchaseQuantity
            .mul(latestPrice.purchaseUnit.factorToBase)
            .div(line.ingredient.baseUnit.factorToBase);

          serializedPrice = {
            purchaseQuantity: latestPrice.purchaseQuantity.toString(),
            purchaseUnit: {
              ...latestPrice.purchaseUnit,
              factorToBase: latestPrice.purchaseUnit.factorToBase.toString(),
            },
            totalPrice: latestPrice.totalPrice.toString(),
            costPerBaseUnit: new Prisma.Decimal(latestPrice.totalPrice)
              .div(quantityInBase)
              .toString(),
            effectiveFrom: latestPrice.effectiveFrom,
          };
        }

        return {
          id: line.id,
          ingredientId: line.ingredientId,
          bakerPercentage: line.bakerPercentage.toString(),
          isFlourBase: line.isFlourBase,
          sortOrder: line.sortOrder,
          ingredient: {
            id: line.ingredient.id,
            name: line.ingredient.name,
            description: line.ingredient.description,
            isActive: line.ingredient.isActive,
            baseUnit: {
              ...line.ingredient.baseUnit,
              factorToBase: line.ingredient.baseUnit.factorToBase.toString(),
            },
            densityGramsPerMl:
              line.ingredient.densityGramsPerMl?.toString() ?? null,
            latestPrice: serializedPrice,
          },
        };
      }),
    };
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
