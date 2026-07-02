import { IsInt, IsNumber, IsString, IsDateString, IsEnum, IsOptional, Min, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { DebtType } from '@prisma/client';

export class CreateDebtDto {
  @IsInt() @Type(() => Number) accountId: number;
  @IsEnum(DebtType) type: DebtType;
  @IsString() @MaxLength(100) personName: string;
  @IsOptional() @IsString() @MaxLength(255) description?: string;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) @Type(() => Number) totalAmount: number;
  @IsOptional() @IsInt() @Type(() => Number) walletId?: number;
  @IsOptional() @IsString() @MaxLength(20) color?: string;
  @IsDateString() date: string;
}
