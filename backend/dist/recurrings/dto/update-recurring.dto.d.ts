import { RecurringFrequency } from '@prisma/client';
export declare class UpdateRecurringDto {
    amount?: number;
    description?: string;
    memo?: string;
    categoryId?: number;
    frequency?: RecurringFrequency;
    endDate?: string;
    isActive?: boolean;
}
