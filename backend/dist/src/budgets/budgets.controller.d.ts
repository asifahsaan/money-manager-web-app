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
    create(dto: CreateBudgetDto, user: JwtUser): Promise<{
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
    update(id: number, dto: UpdateBudgetDto, user: JwtUser): Promise<{
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
    delete(id: number, user: JwtUser): Promise<{
        deleted: boolean;
    }>;
}
