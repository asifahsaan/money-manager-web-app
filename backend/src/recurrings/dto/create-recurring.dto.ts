import { IsInt, IsNumber, IsString, IsDateString, IsEnum, IsOptional, IsBoolean, Min, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { TransactionType, RecurringFrequency } from '@prisma/client';

export class CreateRecurringDto {
  @IsInt() @Type(() => Number) accountId: number;
  @IsEnum(TransactionType) transactionType: TransactionType;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) @Type(() => Number) amount: number;
  @IsOptional() @IsString() @MaxLength(255) description?: string;
  @IsOptional() @IsString() memo?: string;
  @IsOptional() @IsInt() @Type(() => Number) categoryId?: number;
  @IsOptional() @IsInt() @Type(() => Number) walletId?: number;
  @IsOptional() @IsInt() @Type(() => Number) fromWalletId?: number;
  @IsOptional() @IsInt() @Type(() => Number) toWalletId?: number;
  @IsEnum(RecurringFrequency) frequency: RecurringFrequency;
  @IsDateString() startDate: string;
  @IsOptional() @IsDateString() endDate?: string;
}
