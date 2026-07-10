import { DebtType } from '@prisma/client';
export declare class CreateDebtDto {
    accountId: number;
    type: DebtType;
    personName: string;
    description?: string;
    totalAmount: number;
    walletId?: number;
    color?: string;
    date: string;
}
