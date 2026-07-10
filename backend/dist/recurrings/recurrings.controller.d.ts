import { JwtUser } from '../common/decorators/current-user.decorator';
import { RecurringsService } from './recurrings.service';
import { CreateRecurringDto } from './dto/create-recurring.dto';
import { UpdateRecurringDto } from './dto/update-recurring.dto';
export declare class RecurringsController {
    private readonly recurringsService;
    constructor(recurringsService: RecurringsService);
    findAll(accountId: number, user: JwtUser): Promise<({
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
    create(dto: CreateRecurringDto, user: JwtUser): Promise<{
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
    update(id: number, dto: UpdateRecurringDto, user: JwtUser): Promise<{
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
    execute(id: number, user: JwtUser): Promise<{
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
    delete(id: number, user: JwtUser): Promise<{
        deleted: boolean;
    }>;
}
