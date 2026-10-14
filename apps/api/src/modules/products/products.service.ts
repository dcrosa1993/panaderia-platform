
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../database/prisma.service.js';
import { BusinessesService } from '../businesses/businesses.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';

const unitSelect = {
  id: true,
  code: true,
  name: true,
  symbol: true,
  dimension: true,
  factorToBase: true,
  isBase: true,
} satisfies Prisma.MeasurementUnitSelect;

const productInclude = {
  productionUnit: { select: unitSelect },
  targetWeightUnit: { select: unitSelect },
} satisfies Prisma.ProductInclude;

type ProductRecord = Prisma.ProductGetPayload<{
  include: typeof productInclude;
}>;

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly businessesService: BusinessesService,
  ) {}

  async findForBusiness(
    userId: string,
    businessId: string,
    search?: string,
  ) {
    await this.businessesService.assertMembership(userId, businessId);

    const term = search?.trim().slice(0, 100);

    const products = await this.prisma.product.findMany({
      where: {
        businessId,
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
      include: productInclude,
    });

    return {
      products: products.map((product) =>
        this.serializeProduct(product),
      ),
    };
  }

  async createForBusiness(
    userId: string,
    businessId: string,
    dto: CreateProductDto,
  ) {
    await this.businessesService.assertMembership(userId, businessId);

    const name = dto.name.trim();
    const targetWeight = dto.targetFinishedWeight ?? null;
    const targetWeightUnitId = dto.targetWeightUnitId ?? null;

    this.validateWeightPair(targetWeight, targetWeightUnitId);

    if (targetWeight !== null && Number(targetWeight) <= 0) {
      throw new BadRequestException(
        'El peso terminado debe ser mayor que cero.',
      );
    }

    await this.validateProductUnits(
      dto.productionUnitId,
      targetWeightUnitId,
      targetWeight !== null,
    );

    try {
      const product = await this.prisma.product.create({
        data: {
          businessId,
          name,
          normalizedName: this.normalizeName(name),
          description: dto.description?.trim() || null,
          productionUnitId: dto.productionUnitId,
          targetFinishedWeight:
            targetWeight !== null
              ? new Prisma.Decimal(targetWeight)
              : null,
          targetWeightUnitId,
        },
        include: productInclude,
      });

      return this.serializeProduct(product);
    } catch (error: unknown) {
      if (this.isPrismaError(error, 'P2002')) {
        throw new ConflictException(
          'Ya existe un producto con ese nombre en este negocio.',
        );
      }

      throw error;
    }
  }

  async findOneForBusiness(
    userId: string,
    businessId: string,
    productId: string,
  ) {
    await this.businessesService.assertMembership(userId, businessId);

    const product = await this.prisma.product.findFirst({
      where: { id: productId, businessId },
      include: productInclude,
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado.');
    }

    return this.serializeProduct(product);
  }

  async updateForBusiness(
    userId: string,
    businessId: string,
    productId: string,
    dto: UpdateProductDto,
  ) {
    await this.businessesService.assertMembership(userId, businessId);

    const existing = await this.prisma.product.findFirst({
      where: { id: productId, businessId },
      include: productInclude,
    });

    if (!existing) {
      throw new NotFoundException('Producto no encontrado.');
    }

    const nextProductionUnitId =
      dto.productionUnitId ?? existing.productionUnitId;

    const nextWeight =
      dto.targetFinishedWeight !== undefined
        ? dto.targetFinishedWeight
        : existing.targetFinishedWeight?.toString() ?? null;

    const nextWeightUnitId =
      dto.targetWeightUnitId !== undefined
        ? dto.targetWeightUnitId
        : existing.targetWeightUnitId;

    this.validateWeightPair(nextWeight, nextWeightUnitId);

    if (nextWeight !== null && Number(nextWeight) <= 0) {
      throw new BadRequestException(
        'El peso terminado debe ser mayor que cero.',
      );
    }

    await this.validateProductUnits(
      nextProductionUnitId,
      nextWeightUnitId,
      nextWeight !== null,
    );

    const data: Prisma.ProductUncheckedUpdateManyInput = {};

    if (dto.name !== undefined) {
      const name = dto.name.trim();

      data.name = name;
      data.normalizedName = this.normalizeName(name);
    }

    if (dto.description !== undefined) {
      data.description = dto.description?.trim() || null;
    }

    if (dto.productionUnitId !== undefined) {
      data.productionUnitId = nextProductionUnitId;
    }

    if (
      dto.targetFinishedWeight !== undefined ||
      dto.targetWeightUnitId !== undefined
    ) {
      data.targetFinishedWeight =
        nextWeight !== null
          ? new Prisma.Decimal(nextWeight)
          : null;

      data.targetWeightUnitId = nextWeightUnitId;
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
      const result = await this.prisma.product.updateMany({
        where: { id: productId, businessId },
        data,
      });

      if (result.count === 0) {
        throw new NotFoundException('Producto no encontrado.');
      }

      return this.findOneForBusiness(
        userId,
        businessId,
        productId,
      );
    } catch (error: unknown) {
      if (this.isPrismaError(error, 'P2002')) {
        throw new ConflictException(
          'Ya existe un producto con ese nombre en este negocio.',
        );
      }

      throw error;
    }
  }

  private async validateProductUnits(
    productionUnitId: string,
    targetWeightUnitId: string | null,
    hasTargetWeight: boolean,
  ): Promise<void> {
    const ids = [
      productionUnitId,
      ...(targetWeightUnitId ? [targetWeightUnitId] : []),
    ];

    const units = await this.prisma.measurementUnit.findMany({
      where: {
        id: { in: [...new Set(ids)] },
        isActive: true,
      },
      select: unitSelect,
    });

    const productionUnit = units.find(
      (unit) => unit.id === productionUnitId,
    );

    if (!productionUnit) {
      throw new BadRequestException(
        'La unidad de producción no existe o no está activa.',
      );
    }

    if (
      productionUnit.dimension !== 'COUNT' &&
      productionUnit.dimension !== 'MASS'
    ) {
      throw new BadRequestException(
        'La unidad de producción debe medir unidades o masa.',
      );
    }

    if (!hasTargetWeight) {
      return;
    }

    if (productionUnit.dimension !== 'COUNT') {
      throw new BadRequestException(
        'El peso objetivo por pieza requiere una unidad de producción de tipo COUNT.',
      );
    }

    const weightUnit = units.find(
      (unit) => unit.id === targetWeightUnitId,
    );

    if (!weightUnit || weightUnit.dimension !== 'MASS') {
      throw new BadRequestException(
        'La unidad del peso objetivo debe ser una unidad de masa activa.',
      );
    }
  }

  private validateWeightPair(
    weight: string | null,
    weightUnitId: string | null,
  ): void {
    const hasWeight = weight !== null && weight !== '';
    const hasUnit = weightUnitId !== null && weightUnitId !== '';

    if (hasWeight !== hasUnit) {
      throw new BadRequestException(
        'Para definir el peso terminado debes indicar tanto el peso como su unidad.',
      );
    }
  }

  private normalizeName(name: string): string {
    return name.trim().toLocaleLowerCase();
  }

  private serializeProduct(product: ProductRecord) {
    return {
      id: product.id,
      businessId: product.businessId,
      name: product.name,
      description: product.description,
      isActive: product.isActive,
      productionUnit: {
        ...product.productionUnit,
        factorToBase: product.productionUnit.factorToBase.toString(),
      },
      targetFinishedWeight:
        product.targetFinishedWeight?.toString() ?? null,
      targetWeightUnit: product.targetWeightUnit
        ? {
            ...product.targetWeightUnit,
            factorToBase:
              product.targetWeightUnit.factorToBase.toString(),
          }
        : null,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }

  private isPrismaError(
    error: unknown,
    code: string,
  ): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === code
    );
  }
}
