import { TransactionType } from '@prisma/client';
export declare class QueryTransactionDto {
    accountId: number;
    type?: TransactionType;
    categoryId?: number;
    walletId?: number;
    search?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
}
