
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

import { EstimationMode } from '../../../generated/prisma/client.js';

export class CreateEstimationDto {
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @IsString()
  @IsNotEmpty()
  recipeVersionId!: string;

  @IsEnum(EstimationMode)
  mode!: EstimationMode;

  @ValidateIf((value: CreateEstimationDto) =>
    value.mode === EstimationMode.PRODUCT_COUNT,
  )
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  quantity?: number;

  @ValidateIf((value: CreateEstimationDto) =>
    value.mode === EstimationMode.FLOUR_QUANTITY,
  )
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 8 })
  @Min(0.00000001)
  flourQuantity?: number;

  @ValidateIf((value: CreateEstimationDto) =>
    value.mode === EstimationMode.FLOUR_QUANTITY,
  )
  @IsString()
  @IsNotEmpty()
  flourUnitId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 8 })
  @Min(0)
  laborCost?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 8 })
  @Min(0)
  energyCost?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 8 })
  @Min(0)
  packagingCost?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 8 })
  @Min(0)
  otherCost?: number;

  /**
   * Si se indica el margen, también debe indicarse la tasa de impuesto,
   * y viceversa. Ambos campos pueden omitirse para peticiones antiguas.
   */
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(99.9999)
  targetMarginPercent?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(999.9999)
  salesTaxRatePercent?: number;
}
