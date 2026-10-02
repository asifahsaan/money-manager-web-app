import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsDateString, Max, Min } from 'class-validator';

export const DEBT_ACTIVITY_KINDS = ['LENT', 'BORROWED', 'COLLECTED', 'REPAID'] as const;
export type DebtActivityKind = (typeof DEBT_ACTIVITY_KINDS)[number];

export class DebtActivityQueryDto {
  @Type(() => Number)
  @IsInt()
  accountId: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  debtId?: number;

  @IsOptional()
  @IsIn(DEBT_ACTIVITY_KINDS)
  kind?: DebtActivityKind;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
