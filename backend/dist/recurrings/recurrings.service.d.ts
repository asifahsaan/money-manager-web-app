import { PrismaService } from '../prisma/prisma.service';
import { CreateRecurringDto } from './dto/create-recurring.dto';
import { UpdateRecurringDto } from './dto/update-recurring.dto';
export declare class RecurringsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(accountId: number, userId: number): Promise<({
        category: {
            name: string;
            id: number;
            createdAt: Date;
            updatedAt: Date;
            accountId: number;
            type: import(".prisma/client").$Enums.CategoryType;
            icon: string | null;
            color: string | null;
            parentCategoryId: number | null;
            description: string | null;
            sortOrder: number;
            isDefault: boolean;
        } | null;
    } & {
        id: number;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        accountId: number;
        description: string | null;
        categoryId: number | null;
        amount: import("@prisma/client/runtime/library").Decimal;
        memo: string | null;
        walletId: number | null;
        fromWalletId: number | null;
        toWalletId: number | null;
        startDate: Date;
        endDate: Date | null;
        transactionType: import(".prisma/client").$Enums.TransactionType;
        frequency: import(".prisma/client").$Enums.RecurringFrequency;
        nextOccurrence: Date;
    })[]>;
    create(userId: number, dto: CreateRecurringDto): Promise<{
        category: {
            name: string;
            id: number;
            createdAt: Date;
            updatedAt: Date;
            accountId: number;
            type: import(".prisma/client").$Enums.CategoryType;
            icon: string | null;
            color: string | null;
            parentCategoryId: number | null;
            description: string | null;
            sortOrder: number;
            isDefault: boolean;
        } | null;
    } & {
        id: number;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        accountId: number;
        description: string | null;
        categoryId: number | null;
        amount: import("@prisma/client/runtime/library").Decimal;
        memo: string | null;
        walletId: number | null;
        fromWalletId: number | null;
        toWalletId: number | null;
        startDate: Date;
        endDate: Date | null;
        transactionType: import(".prisma/client").$Enums.TransactionType;
        frequency: import(".prisma/client").$Enums.RecurringFrequency;
        nextOccurrence: Date;
    }>;
    update(id: number, userId: number, dto: UpdateRecurringDto): Promise<{
        category: {
            name: string;
            id: number;
            createdAt: Date;
            updatedAt: Date;
            accountId: number;
            type: import(".prisma/client").$Enums.CategoryType;
            icon: string | null;
            color: string | null;
            parentCategoryId: number | null;
            description: string | null;
            sortOrder: number;
            isDefault: boolean;
        } | null;
    } & {
        id: number;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        accountId: number;
        description: string | null;
        categoryId: number | null;
        amount: import("@prisma/client/runtime/library").Decimal;
        memo: string | null;
        walletId: number | null;
        fromWalletId: number | null;
        toWalletId: number | null;
        startDate: Date;
        endDate: Date | null;
        transactionType: import(".prisma/client").$Enums.TransactionType;
        frequency: import(".prisma/client").$Enums.RecurringFrequency;
        nextOccurrence: Date;
    }>;
    execute(id: number, userId: number): Promise<{
        transaction: {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            accountId: number;
            type: import(".prisma/client").$Enums.TransactionType;
            description: string | null;
            categoryId: number | null;
            amount: import("@prisma/client/runtime/library").Decimal;
            date: Date;
            time: string | null;
            datetime: Date;
            memo: string | null;
            feeAmount: import("@prisma/client/runtime/library").Decimal;
            walletId: number | null;
            fromWalletId: number | null;
            toWalletId: number | null;
            recurringId: number | null;
            debtId: number | null;
            goalId: number | null;
        };
        nextOccurrence: Date;
    }>;
    delete(id: number, userId: number): Promise<void>;
    private calculateNext;
    private findAndVerify;
    private verifyOwnership;
}
