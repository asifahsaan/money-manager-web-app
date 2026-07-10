import { IsOptional, IsInt, IsString, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateDebtEntryDto {
  @IsOptional() @IsInt() @Type(() => Number) walletId?: number;
  @IsOptional() @IsString() note?: string;
  @IsOptional() @IsDateString() date?: string;
}
