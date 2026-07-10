import { PrismaService } from '../prisma/prisma.service';
export interface CategoryGroup {
    id: number | null;
    name: string;
    icon: string | null;
    color: string | null;
    amount: number;
    percentage: number;
    subCategories: {
        id: number | null;
        name: string;
        icon: string | null;
        color: string | null;
        amount: number;
        percentage: number;
    }[];
    transactions: {
        id: number;
        date: Date;
        amount: number;
        description: string | null;
        subcategoryName: string | null;
    }[];
}
export declare class StatisticsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getSummary(userId: number, accountId: number, startDate: string, endDate: string): Promise<{
        totalIncome: number;
        totalExpense: number;
        balance: number;
        expenseBreakdown: CategoryGroup[];
        incomeBreakdown: CategoryGroup[];
    }>;
    private buildBreakdown;
    getTrend(userId: number, accountId: number, months: number): Promise<{
        month: string;
        income: number;
        expense: number;
    }[]>;
    private verifyOwnership;
}
