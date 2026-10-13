
import { BadRequestException, Injectable } from '@nestjs/common';
import { MeasurementDimension } from '../../generated/prisma/client.js';
import { PrismaService } from '../../database/prisma.service.js';

@Injectable()
export class MeasurementUnitsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(dimension?: string) {
    let selectedDimension: MeasurementDimension | undefined;

    if (dimension !== undefined && dimension !== '') {
      const normalized = dimension.toUpperCase();

      if (
        !Object.values(MeasurementDimension).includes(
          normalized as MeasurementDimension,
        )
      ) {
        throw new BadRequestException(
          'La dimensión debe ser MASS, VOLUME o COUNT.',
        );
      }

      selectedDimension = normalized as MeasurementDimension;
    }

    const units = await this.prisma.measurementUnit.findMany({
      where: {
        isActive: true,
        ...(selectedDimension ? { dimension: selectedDimension } : {}),
      },
      orderBy: [
        { dimension: 'asc' },
        { factorToBase: 'asc' },
      ],
      select: {
        id: true,
        code: true,
        name: true,
        symbol: true,
        dimension: true,
        factorToBase: true,
        isBase: true,
      },
    });

    return units.map((unit) => ({
      ...unit,
      factorToBase: unit.factorToBase.toString(),
    }));
  }
}
