import { PeriodType } from '@prisma/client';
export declare class CreateBudgetDto {
    accountId: number;
    categoryId: number;
    amount: number;
    periodType: PeriodType;
    startDate: string;
    endDate: string;
}
