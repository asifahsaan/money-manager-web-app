import { JwtUser } from '../common/decorators/current-user.decorator';
import { BudgetsService } from './budgets.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
export declare class BudgetsController {
    private readonly budgetsService;
    constructor(budgetsService: BudgetsService);
    findAll(accountId: number, startDate: string | undefined, endDate: string | undefined, user: JwtUser): Promise<{
        spent: number;
        remaining: number;
        percentage: number;
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
        };
        id: number;
        createdAt: Date;
        updatedAt: Date;
        accountId: number;
        categoryId: number;
        amount: import("@prisma/client/runtime/library").Decimal;
        startDate: Date;
        endDate: Date;
        periodType: import(".prisma/client").$Enums.PeriodType;
    }[]>;
    create(dto: CreateBudgetDto, user: JwtUser): Promise<{
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
        };
    } & {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        accountId: number;
        categoryId: number;
        amount: import("@prisma/client/runtime/library").Decimal;
        startDate: Date;
        endDate: Date;
        periodType: import(".prisma/client").$Enums.PeriodType;
    }>;
    update(id: number, dto: UpdateBudgetDto, user: JwtUser): Promise<{
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
        };
    } & {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        accountId: number;
        categoryId: number;
        amount: import("@prisma/client/runtime/library").Decimal;
        startDate: Date;
        endDate: Date;
        periodType: import(".prisma/client").$Enums.PeriodType;
    }>;
    delete(id: number, user: JwtUser): Promise<{
        deleted: boolean;
    }>;
}
