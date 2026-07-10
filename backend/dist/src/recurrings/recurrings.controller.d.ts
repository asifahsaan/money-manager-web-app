import { JwtUser } from '../common/decorators/current-user.decorator';
import { RecurringsService } from './recurrings.service';
import { CreateRecurringDto } from './dto/create-recurring.dto';
import { UpdateRecurringDto } from './dto/update-recurring.dto';
export declare class RecurringsController {
    private readonly recurringsService;
    constructor(recurringsService: RecurringsService);
    findAll(accountId: number, user: JwtUser): Promise<({
        category: {
            id: number;
            accountId: number;
            type: import(".prisma/client").$Enums.CategoryType;
            description: string | null;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            icon: string | null;
            color: string | null;
            parentCategoryId: number | null;
            sortOrder: number;
            isDefault: boolean;
        } | null;
    } & {
        id: number;
        accountId: number;
        amount: import("@prisma/client/runtime/library").Decimal;
        description: string | null;
        memo: string | null;
        categoryId: number | null;
        walletId: number | null;
        fromWalletId: number | null;
        toWalletId: number | null;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        startDate: Date;
        endDate: Date | null;
        transactionType: import(".prisma/client").$Enums.TransactionType;
        frequency: import(".prisma/client").$Enums.RecurringFrequency;
        nextOccurrence: Date;
    })[]>;
    create(dto: CreateRecurringDto, user: JwtUser): Promise<{
        category: {
            id: number;
            accountId: number;
            type: import(".prisma/client").$Enums.CategoryType;
            description: string | null;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            icon: string | null;
            color: string | null;
            parentCategoryId: number | null;
            sortOrder: number;
            isDefault: boolean;
        } | null;
    } & {
        id: number;
        accountId: number;
        amount: import("@prisma/client/runtime/library").Decimal;
        description: string | null;
        memo: string | null;
        categoryId: number | null;
        walletId: number | null;
        fromWalletId: number | null;
        toWalletId: number | null;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        startDate: Date;
        endDate: Date | null;
        transactionType: import(".prisma/client").$Enums.TransactionType;
        frequency: import(".prisma/client").$Enums.RecurringFrequency;
        nextOccurrence: Date;
    }>;
    update(id: number, dto: UpdateRecurringDto, user: JwtUser): Promise<{
        category: {
            id: number;
            accountId: number;
            type: import(".prisma/client").$Enums.CategoryType;
            description: string | null;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            icon: string | null;
            color: string | null;
            parentCategoryId: number | null;
            sortOrder: number;
            isDefault: boolean;
        } | null;
    } & {
        id: number;
        accountId: number;
        amount: import("@prisma/client/runtime/library").Decimal;
        description: string | null;
        memo: string | null;
        categoryId: number | null;
        walletId: number | null;
        fromWalletId: number | null;
        toWalletId: number | null;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        startDate: Date;
        endDate: Date | null;
        transactionType: import(".prisma/client").$Enums.TransactionType;
        frequency: import(".prisma/client").$Enums.RecurringFrequency;
        nextOccurrence: Date;
    }>;
    execute(id: number, user: JwtUser): Promise<{
        transaction: {
            id: number;
            accountId: number;
            type: import(".prisma/client").$Enums.TransactionType;
            amount: import("@prisma/client/runtime/library").Decimal;
            date: Date;
            time: string | null;
            datetime: Date;
            description: string | null;
            memo: string | null;
            categoryId: number | null;
            walletId: number | null;
            fromWalletId: number | null;
            toWalletId: number | null;
            feeAmount: import("@prisma/client/runtime/library").Decimal;
            recurringId: number | null;
            debtId: number | null;
            goalId: number | null;
            createdAt: Date;
            updatedAt: Date;
        };
        nextOccurrence: Date;
    }>;
    delete(id: number, user: JwtUser): Promise<{
        deleted: boolean;
    }>;
}
