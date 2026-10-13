
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  MeasurementDimension,
  PrismaClient,
} from '../src/generated/prisma/client.js';

const connectionString = process.env['DATABASE_URL'];

if (!connectionString) {
  throw new Error('Falta la variable de entorno DATABASE_URL.');
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const units = [
  {
    code: 'g',
    name: 'Gramo',
    symbol: 'g',
    dimension: MeasurementDimension.MASS,
    factorToBase: '1',
    isBase: true,
  },
  {
    code: 'kg',
    name: 'Kilogramo',
    symbol: 'kg',
    dimension: MeasurementDimension.MASS,
    factorToBase: '1000',
    isBase: false,
  },
  {
    code: 'mg',
    name: 'Miligramo',
    symbol: 'mg',
    dimension: MeasurementDimension.MASS,
    factorToBase: '0.001',
    isBase: false,
  },
  {
    code: 'ml',
    name: 'Mililitro',
    symbol: 'ml',
    dimension: MeasurementDimension.VOLUME,
    factorToBase: '1',
    isBase: true,
  },
  {
    code: 'l',
    name: 'Litro',
    symbol: 'l',
    dimension: MeasurementDimension.VOLUME,
    factorToBase: '1000',
    isBase: false,
  },
  {
    code: 'unit',
    name: 'Unidad',
    symbol: 'u',
    dimension: MeasurementDimension.COUNT,
    factorToBase: '1',
    isBase: true,
  },
  {
    code: 'dozen',
    name: 'Docena',
    symbol: 'doc',
    dimension: MeasurementDimension.COUNT,
    factorToBase: '12',
    isBase: false,
  },
] as const;

async function main(): Promise<void> {
  for (const unit of units) {
    await prisma.measurementUnit.upsert({
      where: { code: unit.code },
      update: {
        name: unit.name,
        symbol: unit.symbol,
        dimension: unit.dimension,
        factorToBase: unit.factorToBase,
        isBase: unit.isBase,
        isActive: true,
      },
      create: unit,
    });
  }

  console.log(`Unidades de medida verificadas: ${units.length}`);
}

main()
  .catch((error: unknown) => {
    console.error('Error al inicializar las unidades de medida:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
