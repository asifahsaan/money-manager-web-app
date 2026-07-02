import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  IsBoolean,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { WalletType } from '@prisma/client';

export class CreateWalletDto {
  @IsInt()
  accountId: number;

  @IsString()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsEnum(WalletType)
  type?: WalletType;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  icon?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  color?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  initialBalance?: number;

  @IsOptional()
  @IsBoolean()
  includedInTotal?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
