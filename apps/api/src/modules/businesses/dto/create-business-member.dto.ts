
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsOptional,
  MaxLength,
} from 'class-validator';

export class CreateBusinessMemberDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsOptional()
  @IsIn(['ADMIN', 'MEMBER'])
  role?: 'ADMIN' | 'MEMBER';
}
