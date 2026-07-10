import { PrismaService } from '../prisma/prisma.service';
import { CreateDebtDto } from './dto/create-debt.dto';
import { UpdateDebtDto } from './dto/update-debt.dto';
import { UpdateDebtEntryDto } from './dto/update-debt-entry.dto';
import { DebtPaymentDto } from './dto/debt-payment.dto';
export declare class DebtsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(accountId: number, userId: number): Promise<({
        entries: {
            id: number;
            type: import(".prisma/client").$Enums.DebtEntryType;
            amount: import("@prisma/client/runtime/library").Decimal;
            date: Date;
            walletId: number | null;
            debtId: number;
            createdAt: Date;
            transactionId: number | null;
            note: string | null;
        }[];
    } & {
        id: number;
        accountId: number;
        type: import(".prisma/client").$Enums.DebtType;
        date: Date;
        description: string | null;
        walletId: number | null;
        createdAt: Date;
        updatedAt: Date;
        color: string | null;
        personName: string;
        totalAmount: import("@prisma/client/runtime/library").Decimal;
        settledAmount: import("@prisma/client/runtime/library").Decimal;
        remainingAmount: import("@prisma/client/runtime/library").Decimal;
        status: import(".prisma/client").$Enums.DebtStatus;
    })[]>;
    findOne(id: number, userId: number): Promise<({
        entries: {
            id: number;
            type: import(".prisma/client").$Enums.DebtEntryType;
            amount: import("@prisma/client/runtime/library").Decimal;
            date: Date;
            walletId: number | null;
            debtId: number;
            createdAt: Date;
            transactionId: number | null;
            note: string | null;
        }[];
    } & {
        id: number;
        accountId: number;
        type: import(".prisma/client").$Enums.DebtType;
        date: Date;
        description: string | null;
        walletId: number | null;
        createdAt: Date;
        updatedAt: Date;
        color: string | null;
        personName: string;
        totalAmount: import("@prisma/client/runtime/library").Decimal;
        settledAmount: import("@prisma/client/runtime/library").Decimal;
        remainingAmount: import("@prisma/client/runtime/library").Decimal;
        status: import(".prisma/client").$Enums.DebtStatus;
    }) | null>;
    create(userId: number, dto: CreateDebtDto): Promise<{
        id: number;
        accountId: number;
        type: import(".prisma/client").$Enums.DebtType;
        date: Date;
        description: string | null;
        walletId: number | null;
        createdAt: Date;
        updatedAt: Date;
        color: string | null;
        personName: string;
        totalAmount: import("@prisma/client/runtime/library").Decimal;
        settledAmount: import("@prisma/client/runtime/library").Decimal;
        remainingAmount: import("@prisma/client/runtime/library").Decimal;
        status: import(".prisma/client").$Enums.DebtStatus;
    }>;
    update(id: number, userId: number, dto: UpdateDebtDto): Promise<{
        id: number;
        accountId: number;
        type: import(".prisma/client").$Enums.DebtType;
        date: Date;
        description: string | null;
        walletId: number | null;
        createdAt: Date;
        updatedAt: Date;
        color: string | null;
        personName: string;
        totalAmount: import("@prisma/client/runtime/library").Decimal;
        settledAmount: import("@prisma/client/runtime/library").Decimal;
        remainingAmount: import("@prisma/client/runtime/library").Decimal;
        status: import(".prisma/client").$Enums.DebtStatus;
    }>;
    pay(id: number, userId: number, dto: DebtPaymentDto): Promise<({
        entries: {
            id: number;
            type: import(".prisma/client").$Enums.DebtEntryType;
            amount: import("@prisma/client/runtime/library").Decimal;
            date: Date;
            walletId: number | null;
            debtId: number;
            createdAt: Date;
            transactionId: number | null;
            note: string | null;
        }[];
    } & {
        id: number;
        accountId: number;
        type: import(".prisma/client").$Enums.DebtType;
        date: Date;
        description: string | null;
        walletId: number | null;
        createdAt: Date;
        updatedAt: Date;
        color: string | null;
        personName: string;
        totalAmount: import("@prisma/client/runtime/library").Decimal;
        settledAmount: import("@prisma/client/runtime/library").Decimal;
        remainingAmount: import("@prisma/client/runtime/library").Decimal;
        status: import(".prisma/client").$Enums.DebtStatus;
    }) | null>;
    updateEntry(debtId: number, entryId: number, userId: number, dto: UpdateDebtEntryDto): Promise<({
        entries: {
            id: number;
            type: import(".prisma/client").$Enums.DebtEntryType;
            amount: import("@prisma/client/runtime/library").Decimal;
            date: Date;
            walletId: number | null;
            debtId: number;
            createdAt: Date;
            transactionId: number | null;
            note: string | null;
        }[];
    } & {
        id: number;
        accountId: number;
        type: import(".prisma/client").$Enums.DebtType;
        date: Date;
        description: string | null;
        walletId: number | null;
        createdAt: Date;
        updatedAt: Date;
        color: string | null;
        personName: string;
        totalAmount: import("@prisma/client/runtime/library").Decimal;
        settledAmount: import("@prisma/client/runtime/library").Decimal;
        remainingAmount: import("@prisma/client/runtime/library").Decimal;
        status: import(".prisma/client").$Enums.DebtStatus;
    }) | null>;
    delete(id: number, userId: number): Promise<void>;
    private findDebtCategory;
    private findAndVerify;
    private verifyOwnership;
}
