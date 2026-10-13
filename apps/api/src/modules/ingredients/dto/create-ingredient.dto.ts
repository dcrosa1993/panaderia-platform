
import { Transform, Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class CreateIngredientPriceDto {
  @Transform(({ value }) =>
    typeof value === 'string'
      ? value.trim().replace(',', '.')
      : value,
  )
  @IsString()
  @Matches(/^\d{1,12}(?:\.\d{1,6})?$/, {
    message: 'La cantidad debe ser un decimal positivo con hasta 6 decimales.',
  })
  purchaseQuantity!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  purchaseUnitId!: string;

  @Transform(({ value }) =>
    typeof value === 'string'
      ? value.trim().replace(',', '.')
      : value,
  )
  @IsString()
  @Matches(/^\d{1,14}(?:\.\d{1,4})?$/, {
    message: 'El precio debe tener como máximo 4 decimales.',
  })
  totalPrice!: string;
}

export class CreateIngredientDto {
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
  baseUnitId!: string;

  @ValidateNested()
  @Type(() => CreateIngredientPriceDto)
  initialPrice!: CreateIngredientPriceDto;
}
