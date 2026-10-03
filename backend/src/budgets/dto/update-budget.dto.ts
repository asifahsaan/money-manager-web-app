import { IsNumber, IsDateString, IsOptional, Min, Max, IsInt, IsArray, ArrayMaxSize } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateBudgetDto {
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Type(() => Number)
  amount?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  /** 0 = Sunday … 6 = Saturday; empty = every day */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(7)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  activeWeekdays?: number[];
}
