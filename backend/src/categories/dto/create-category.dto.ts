import { IsString, IsEnum, IsOptional, IsInt, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { CategoryType } from '@prisma/client';

export class CreateCategoryDto {
  @IsInt()
  @Type(() => Number)
  accountId: number;

  @IsString()
  @MaxLength(100)
  name: string;

  @IsEnum(CategoryType)
  type: CategoryType;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  icon?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  color?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  parentCategoryId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
