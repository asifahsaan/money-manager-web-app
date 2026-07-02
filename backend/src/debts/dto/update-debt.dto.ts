import { IsNumber, IsString, IsDateString, IsOptional, Min, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateDebtDto {
  @IsOptional() @IsString() @MaxLength(100) personName?: string;
  @IsOptional() @IsString() @MaxLength(255) description?: string;
  @IsOptional() @IsString() @MaxLength(20) color?: string;
  @IsOptional() @IsDateString() date?: string;
}
