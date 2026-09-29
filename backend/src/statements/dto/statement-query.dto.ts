import { IsDateString, IsInt, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class StatementQueryDto {
  @IsInt()
  @Type(() => Number)
  accountId: number;

  // Omit for a combined statement of every wallet included in the total.
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  walletId?: number;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}
