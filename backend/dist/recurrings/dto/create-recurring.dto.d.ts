import { TransactionType, RecurringFrequency } from '@prisma/client';
export declare class CreateRecurringDto {
    accountId: number;
    transactionType: TransactionType;
    amount: number;
    description?: string;
    memo?: string;
    categoryId?: number;
    walletId?: number;
    fromWalletId?: number;
    toWalletId?: number;
    frequency: RecurringFrequency;
    startDate: string;
    endDate?: string;
}
