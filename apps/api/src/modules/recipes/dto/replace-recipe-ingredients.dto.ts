import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class RecipeIngredientInputDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  ingredientId!: string;

  @Transform(({ value }) =>
    typeof value === 'string'
      ? value.trim().replace(',', '.')
      : value,
  )
  @IsString()
  @Matches(/^\d{1,5}(?:\.\d{1,4})?$/, {
    message: 'El porcentaje debe ser un decimal positivo.',
  })
  bakerPercentage!: string;

  @IsBoolean()
  isFlourBase!: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class ReplaceRecipeIngredientsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => RecipeIngredientInputDto)
  ingredients!: RecipeIngredientInputDto[];
}