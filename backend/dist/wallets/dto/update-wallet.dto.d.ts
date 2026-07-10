import { WalletType } from '@prisma/client';
export declare class UpdateWalletDto {
    name?: string;
    type?: WalletType;
    icon?: string;
    color?: string;
    initialBalance?: number;
    includedInTotal?: boolean;
    archived?: boolean;
    sortOrder?: number;
}
