import { IsNumber, IsString, IsDateString, IsOptional, Min, MaxLength, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateDebtDto {
  @IsOptional() @IsString() @MaxLength(100) personName?: string;
  @IsOptional() @IsString() @MaxLength(255) description?: string;
  @IsOptional() @IsString() @MaxLength(20) color?: string;
  @IsOptional() @IsDateString() date?: string;
  @IsOptional() @IsNumber() @Type(() => Number) @Min(0) totalAmount?: number;
  @IsOptional() @IsInt() @Type(() => Number) walletId?: number | null;
}
