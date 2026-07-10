import { JwtUser } from '../common/decorators/current-user.decorator';
import { DebtsService } from './debts.service';
import { CreateDebtDto } from './dto/create-debt.dto';
import { UpdateDebtDto } from './dto/update-debt.dto';
import { UpdateDebtEntryDto } from './dto/update-debt-entry.dto';
import { DebtPaymentDto } from './dto/debt-payment.dto';
export declare class DebtsController {
    private readonly debtsService;
    constructor(debtsService: DebtsService);
    findAll(accountId: number, user: JwtUser): Promise<({
        entries: {
            id: number;
            createdAt: Date;
            type: import(".prisma/client").$Enums.DebtEntryType;
            amount: import("@prisma/client/runtime/library").Decimal;
            date: Date;
            walletId: number | null;
            debtId: number;
            transactionId: number | null;
            note: string | null;
        }[];
    } & {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        accountId: number;
        type: import(".prisma/client").$Enums.DebtType;
        color: string | null;
        description: string | null;
        date: Date;
        walletId: number | null;
        personName: string;
        totalAmount: import("@prisma/client/runtime/library").Decimal;
        settledAmount: import("@prisma/client/runtime/library").Decimal;
        remainingAmount: import("@prisma/client/runtime/library").Decimal;
        status: import(".prisma/client").$Enums.DebtStatus;
    })[]>;
    findOne(id: number, user: JwtUser): Promise<({
        entries: {
            id: number;
            createdAt: Date;
            type: import(".prisma/client").$Enums.DebtEntryType;
            amount: import("@prisma/client/runtime/library").Decimal;
            date: Date;
            walletId: number | null;
            debtId: number;
            transactionId: number | null;
            note: string | null;
        }[];
    } & {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        accountId: number;
        type: import(".prisma/client").$Enums.DebtType;
        color: string | null;
        description: string | null;
        date: Date;
        walletId: number | null;
        personName: string;
        totalAmount: import("@prisma/client/runtime/library").Decimal;
        settledAmount: import("@prisma/client/runtime/library").Decimal;
        remainingAmount: import("@prisma/client/runtime/library").Decimal;
        status: import(".prisma/client").$Enums.DebtStatus;
    }) | null>;
    create(dto: CreateDebtDto, user: JwtUser): Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        accountId: number;
        type: import(".prisma/client").$Enums.DebtType;
        color: string | null;
        description: string | null;
        date: Date;
        walletId: number | null;
        personName: string;
        totalAmount: import("@prisma/client/runtime/library").Decimal;
        settledAmount: import("@prisma/client/runtime/library").Decimal;
        remainingAmount: import("@prisma/client/runtime/library").Decimal;
        status: import(".prisma/client").$Enums.DebtStatus;
    }>;
    update(id: number, dto: UpdateDebtDto, user: JwtUser): Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        accountId: number;
        type: import(".prisma/client").$Enums.DebtType;
        color: string | null;
        description: string | null;
        date: Date;
        walletId: number | null;
        personName: string;
        totalAmount: import("@prisma/client/runtime/library").Decimal;
        settledAmount: import("@prisma/client/runtime/library").Decimal;
        remainingAmount: import("@prisma/client/runtime/library").Decimal;
        status: import(".prisma/client").$Enums.DebtStatus;
    }>;
    pay(id: number, dto: DebtPaymentDto, user: JwtUser): Promise<({
        entries: {
            id: number;
            createdAt: Date;
            type: import(".prisma/client").$Enums.DebtEntryType;
            amount: import("@prisma/client/runtime/library").Decimal;
            date: Date;
            walletId: number | null;
            debtId: number;
            transactionId: number | null;
            note: string | null;
        }[];
    } & {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        accountId: number;
        type: import(".prisma/client").$Enums.DebtType;
        color: string | null;
        description: string | null;
        date: Date;
        walletId: number | null;
        personName: string;
        totalAmount: import("@prisma/client/runtime/library").Decimal;
        settledAmount: import("@prisma/client/runtime/library").Decimal;
        remainingAmount: import("@prisma/client/runtime/library").Decimal;
        status: import(".prisma/client").$Enums.DebtStatus;
    }) | null>;
    updateEntry(id: number, entryId: number, dto: UpdateDebtEntryDto, user: JwtUser): Promise<({
        entries: {
            id: number;
            createdAt: Date;
            type: import(".prisma/client").$Enums.DebtEntryType;
            amount: import("@prisma/client/runtime/library").Decimal;
            date: Date;
            walletId: number | null;
            debtId: number;
            transactionId: number | null;
            note: string | null;
        }[];
    } & {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        accountId: number;
        type: import(".prisma/client").$Enums.DebtType;
        color: string | null;
        description: string | null;
        date: Date;
        walletId: number | null;
        personName: string;
        totalAmount: import("@prisma/client/runtime/library").Decimal;
        settledAmount: import("@prisma/client/runtime/library").Decimal;
        remainingAmount: import("@prisma/client/runtime/library").Decimal;
        status: import(".prisma/client").$Enums.DebtStatus;
    }) | null>;
    delete(id: number, user: JwtUser): Promise<{
        deleted: boolean;
    }>;
}
