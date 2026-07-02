import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  IsNumber,
  Min,
  ValidateIf,
  IsDateString,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TransactionType } from '@prisma/client';

export class CreateTransactionDto {
  @IsInt()
  accountId: number;

  @IsEnum(TransactionType)
  type: TransactionType;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Type(() => Number)
  amount: number;

  @IsDateString()
  date: string; // YYYY-MM-DD

  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'time must be HH:MM' })
  time?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @IsOptional()
  @IsString()
  memo?: string;

  // Income / Expense
  @ValidateIf((o) => o.type !== TransactionType.TRANSFER)
  @IsInt()
  walletId?: number;

  @IsOptional()
  @IsInt()
  categoryId?: number;

  // Transfer
  @ValidateIf((o) => o.type === TransactionType.TRANSFER)
  @IsInt()
  fromWalletId?: number;

  @ValidateIf((o) => o.type === TransactionType.TRANSFER)
  @IsInt()
  toWalletId?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  feeAmount?: number;
}
