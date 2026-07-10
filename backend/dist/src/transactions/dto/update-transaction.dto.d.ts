import { TransactionType } from '@prisma/client';
export declare class UpdateTransactionDto {
    type?: TransactionType;
    amount?: number;
    date?: string;
    time?: string;
    description?: string;
    memo?: string;
    categoryId?: number;
    walletId?: number;
    fromWalletId?: number;
    toWalletId?: number;
    feeAmount?: number;
}
