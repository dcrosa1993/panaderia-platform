import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateIngredientDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name?: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().replace(',', '.') : value,
  )
  @IsOptional()
  @IsString()
  @Matches(/^\d{1,6}(?:\.\d{1,6})?$/)
  densityGramsPerMl?: string | null;
}
