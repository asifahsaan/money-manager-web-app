import { IsInt, IsNumber, IsString, IsDateString, IsEnum, IsOptional, IsBoolean, Min, Max, MaxLength, IsArray, ArrayMaxSize, Matches } from 'class-validator';
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
  /** "HH:MM" (24h); null clears it */
  @IsOptional() @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'time must be HH:MM' }) time?: string;
  /** WEEKLY only: 0 = Sunday … 6 = Saturday */
  @IsOptional() @IsArray() @ArrayMaxSize(7) @IsInt({ each: true }) @Min(0, { each: true }) @Max(6, { each: true }) weekdays?: number[];
  @IsDateString() startDate: string;
  @IsOptional() @IsDateString() endDate?: string;
}
