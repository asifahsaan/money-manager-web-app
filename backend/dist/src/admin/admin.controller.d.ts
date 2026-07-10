import { AdminService } from './admin.service';
import { UserRole } from '@prisma/client';
export declare class AdminController {
    private readonly adminService;
    constructor(adminService: AdminService);
    getStats(): Promise<{
        totalUsers: number;
        activeUsers: number;
        inactiveUsers: number;
        newUsersThisMonth: number;
        newUsersLastMonth: number;
        userGrowthPct: number | null;
        totalTransactions: number;
        txThisMonth: number;
        totalExpenseVolume: number;
        expenseVolumeThisMonth: number;
        totalWallets: number;
        totalAccounts: number;
    }>;
    getUsers(search?: string, page?: string, limit?: string): Promise<{
        users: {
            txCount: number;
            lastActivity: Date | null;
            id: number;
            createdAt: Date;
            _count: {
                accounts: number;
            };
            name: string;
            email: string;
            defaultCurrency: string;
            role: import(".prisma/client").$Enums.UserRole;
            isActive: boolean;
        }[];
        total: number;
        page: number;
        pages: number;
    }>;
    getUser(id: number): Promise<{
        passwordHash: undefined;
        txCount: number;
        totalExpense: number;
        totalIncome: number;
        accounts: ({
            wallets: {
                id: number;
                accountId: number;
                type: import(".prisma/client").$Enums.WalletType;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                icon: string | null;
                color: string | null;
                sortOrder: number;
                initialBalance: import("@prisma/client/runtime/library").Decimal;
                currentBalance: import("@prisma/client/runtime/library").Decimal;
                includedInTotal: boolean;
                archived: boolean;
            }[];
        } & {
            id: number;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            userId: number;
            currency: string;
        })[];
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        email: string;
        defaultCurrency: string;
        role: import(".prisma/client").$Enums.UserRole;
        isActive: boolean;
    }>;
    updateUser(id: number, body: {
        role?: UserRole;
        isActive?: boolean;
        name?: string;
    }): Promise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        email: string;
        passwordHash: string;
        defaultCurrency: string;
        role: import(".prisma/client").$Enums.UserRole;
        isActive: boolean;
    }>;
    deleteUser(id: number): Promise<void>;
    getUserGrowth(months?: string): Promise<{
        month: string;
        users: number;
        cumulative: number;
    }[]>;
    getTransactionTrend(months?: string): Promise<{
        month: string;
        income: number;
        expense: number;
        count: number;
    }[]>;
    getTopCategories(limit?: string): Promise<{
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
        totalAmount: number;
        txCount: number;
    }[]>;
}
