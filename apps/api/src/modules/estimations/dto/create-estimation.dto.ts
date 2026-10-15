
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
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
}
