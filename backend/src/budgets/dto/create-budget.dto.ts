import { IsInt, IsNumber, IsEnum, IsDateString, Min, Max, IsOptional, IsArray, ArrayMaxSize } from 'class-validator';
import { Type } from 'class-transformer';
import { PeriodType } from '@prisma/client';

export class CreateBudgetDto {
  @IsInt()
  @Type(() => Number)
  accountId: number;

  @IsInt()
  @Type(() => Number)
  categoryId: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Type(() => Number)
  amount: number;

  @IsEnum(PeriodType)
  periodType: PeriodType;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  /** 0 = Sunday … 6 = Saturday; empty = every day */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(7)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  activeWeekdays?: number[];
}
