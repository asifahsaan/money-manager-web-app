import { TransactionType } from '@prisma/client';
export declare class CreateTransactionDto {
    accountId: number;
    type: TransactionType;
    amount: number;
    date: string;
    time?: string;
    description?: string;
    memo?: string;
    walletId?: number;
    categoryId?: number;
    fromWalletId?: number;
    toWalletId?: number;
    feeAmount?: number;
}
