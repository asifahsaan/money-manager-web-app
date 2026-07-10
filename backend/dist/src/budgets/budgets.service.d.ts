import { PrismaService } from '../prisma/prisma.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
export declare class BudgetsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(accountId: number, userId: number, startDate?: string, endDate?: string): Promise<{
        spent: number;
        remaining: number;
        percentage: number;
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
        };
        id: number;
        accountId: number;
        amount: import("@prisma/client/runtime/library").Decimal;
        categoryId: number;
        createdAt: Date;
        updatedAt: Date;
        startDate: Date;
        endDate: Date;
        periodType: import(".prisma/client").$Enums.PeriodType;
    }[]>;
    create(userId: number, dto: CreateBudgetDto): Promise<{
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
        };
    } & {
        id: number;
        accountId: number;
        amount: import("@prisma/client/runtime/library").Decimal;
        categoryId: number;
        createdAt: Date;
        updatedAt: Date;
        startDate: Date;
        endDate: Date;
        periodType: import(".prisma/client").$Enums.PeriodType;
    }>;
    update(id: number, userId: number, dto: UpdateBudgetDto): Promise<{
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
        };
    } & {
        id: number;
        accountId: number;
        amount: import("@prisma/client/runtime/library").Decimal;
        categoryId: number;
        createdAt: Date;
        updatedAt: Date;
        startDate: Date;
        endDate: Date;
        periodType: import(".prisma/client").$Enums.PeriodType;
    }>;
    delete(id: number, userId: number): Promise<void>;
    private findAndVerify;
    private verifyOwnership;
}
