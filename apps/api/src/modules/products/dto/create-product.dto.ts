
import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateProductDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name!: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  productionUnitId!: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().replace(',', '.') : value,
  )
  @IsOptional()
  @IsString()
  @Matches(/^\d{1,12}(?:\.\d{1,6})?$/)
  targetFinishedWeight?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  targetWeightUnitId?: string | null;
}
