import { WalletType } from '@prisma/client';
export declare class CreateWalletDto {
    accountId: number;
    name: string;
    type?: WalletType;
    icon?: string;
    color?: string;
    initialBalance?: number;
    includedInTotal?: boolean;
    sortOrder?: number;
}
