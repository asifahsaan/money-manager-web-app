import { IsNumber, IsString, IsDateString, IsOptional, Min, MaxLength, IsInt, Matches, IsEmail } from 'class-validator';
import { Type } from 'class-transformer';

// Digits with optional +, spaces or dashes: 0300-1234567, +92 300 1234567
const PHONE = /^\+?[\d\s-]{7,20}$/;

export class UpdateDebtDto {
  @IsOptional() @IsString() @MaxLength(100) personName?: string;
  @IsOptional() @IsString() @MaxLength(255) description?: string;
  @IsOptional() @IsString() @MaxLength(20) color?: string;
  @IsOptional() @IsDateString() date?: string;
  @IsOptional() @IsNumber() @Type(() => Number) @Min(0) totalAmount?: number;
  @IsOptional() @IsInt() @Type(() => Number) walletId?: number | null;
  @IsOptional() @IsDateString() dueDate?: string | null;
  @IsOptional() @IsString() @Matches(PHONE, { message: 'Enter a valid phone number' }) contactPhone?: string | null;
  @IsOptional() @IsEmail({}, { message: 'Enter a valid email' }) @MaxLength(150) contactEmail?: string | null;
}
