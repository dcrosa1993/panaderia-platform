import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateRecipeVersionDto {
  @Transform(({ value }) =>
    typeof value === 'string'
      ? value.trim().replace(',', '.')
      : value,
  )
  @IsString()
  @Matches(/^\d{1,2}(?:\.\d{1,4})?$|^100(?:\.0{1,4})?$/, {
    message: 'La pérdida debe ser un porcentaje entre 0 y 100.',
  })
  expectedBakeLossPercent!: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;
}