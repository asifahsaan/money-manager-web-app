import { IsInt, IsNumber, IsString, IsDateString, IsEnum, IsOptional, Min, MaxLength, Matches, IsEmail } from 'class-validator';
import { Type } from 'class-transformer';
import { DebtType } from '@prisma/client';

// Digits with optional +, spaces or dashes: 0300-1234567, +92 300 1234567
const PHONE = /^\+?[\d\s-]{7,20}$/;

export class CreateDebtDto {
  @IsInt() @Type(() => Number) accountId: number;
  @IsEnum(DebtType) type: DebtType;
  @IsString() @MaxLength(100) personName: string;
  @IsOptional() @IsString() @MaxLength(255) description?: string;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) @Type(() => Number) totalAmount: number;
  @IsOptional() @IsInt() @Type(() => Number) walletId?: number;
  @IsOptional() @IsString() @MaxLength(20) color?: string;
  @IsDateString() date: string;
  @IsOptional() @IsDateString() dueDate?: string | null;
  @IsOptional() @IsString() @Matches(PHONE, { message: 'Enter a valid phone number' }) contactPhone?: string | null;
  @IsOptional() @IsEmail({}, { message: 'Enter a valid email' }) @MaxLength(150) contactEmail?: string | null;
}
