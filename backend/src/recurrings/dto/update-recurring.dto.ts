import { IsNumber, IsString, IsDateString, IsEnum, IsOptional, IsBoolean, Min, MaxLength, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { RecurringFrequency } from '@prisma/client';

export class UpdateRecurringDto {
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) @Type(() => Number) amount?: number;
  @IsOptional() @IsString() @MaxLength(255) description?: string;
  @IsOptional() @IsString() memo?: string;
  @IsOptional() @IsInt() @Type(() => Number) categoryId?: number;
  @IsOptional() @IsEnum(RecurringFrequency) frequency?: RecurringFrequency;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
