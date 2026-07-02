import { IsNumber, IsString, IsDateString, IsOptional, Min, MaxLength, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateGoalDto {
  @IsOptional() @IsString() @MaxLength(100) name?: string;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) @Type(() => Number) targetAmount?: number;
  @IsOptional() @IsDateString() goalDate?: string;
  @IsOptional() @IsInt() @Type(() => Number) walletId?: number;
  @IsOptional() @IsString() @MaxLength(100) icon?: string;
  @IsOptional() @IsString() @MaxLength(20) color?: string;
}
