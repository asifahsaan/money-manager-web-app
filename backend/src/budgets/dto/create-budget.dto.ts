import { IsInt, IsNumber, IsEnum, IsDateString, Min } from 'class-validator';
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
}
