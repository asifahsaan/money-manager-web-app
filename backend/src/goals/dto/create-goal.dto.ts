import { IsInt, IsNumber, IsString, IsDateString, IsOptional, Min, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateGoalDto {
  @IsInt() @Type(() => Number) accountId: number;
  @IsString() @MaxLength(100) name: string;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) @Type(() => Number) targetAmount: number;
  @IsDateString() goalDate: string;
  @IsOptional() @IsInt() @Type(() => Number) walletId?: number;
  @IsOptional() @IsString() @MaxLength(100) icon?: string;
  @IsOptional() @IsString() @MaxLength(20) color?: string;
}
