import { IsNumber, IsDateString, IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class GoalEntryDto {
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) @Type(() => Number) amount: number;
  @IsInt() @Type(() => Number) walletId: number;
  @IsDateString() date: string;
  @IsOptional() @IsString() note?: string;
}
