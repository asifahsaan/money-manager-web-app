import { IsNumber, IsString, IsDateString, IsEnum, IsOptional, IsBoolean, Min, Max, MaxLength, IsInt, IsArray, ArrayMaxSize, Matches } from 'class-validator';
import { Type } from 'class-transformer';
import { RecurringFrequency } from '@prisma/client';

export class UpdateRecurringDto {
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) @Type(() => Number) amount?: number;
  @IsOptional() @IsString() @MaxLength(255) description?: string;
  @IsOptional() @IsString() memo?: string;
  @IsOptional() @IsInt() @Type(() => Number) categoryId?: number | null;
  @IsOptional() @IsEnum(RecurringFrequency) frequency?: RecurringFrequency;
  /** "HH:MM" (24h); null clears it */
  @IsOptional() @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'time must be HH:MM' }) time?: string | null;
  @IsOptional() @IsArray() @ArrayMaxSize(7) @IsInt({ each: true }) @Min(0, { each: true }) @Max(6, { each: true }) weekdays?: number[];
  @IsOptional() @IsInt() @Type(() => Number) walletId?: number | null;
  @IsOptional() @IsInt() @Type(() => Number) fromWalletId?: number | null;
  @IsOptional() @IsInt() @Type(() => Number) toWalletId?: number | null;
  /** Moves the next due date (e.g. after changing the schedule) */
  @IsOptional() @IsDateString() nextOccurrence?: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
