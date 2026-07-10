import { PrismaService } from '../prisma/prisma.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { GoalEntryDto } from './dto/goal-entry.dto';
export declare class GoalsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(accountId: number, userId: number): Promise<({
        entries: {
            id: number;
            type: import(".prisma/client").$Enums.GoalEntryType;
            amount: import("@prisma/client/runtime/library").Decimal;
            date: Date;
            walletId: number | null;
            goalId: number;
            createdAt: Date;
            transactionId: number | null;
            note: string | null;
        }[];
    } & {
        id: number;
        accountId: number;
        walletId: number | null;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        icon: string | null;
        color: string | null;
        targetAmount: import("@prisma/client/runtime/library").Decimal;
        savedAmount: import("@prisma/client/runtime/library").Decimal;
        goalDate: Date;
    })[]>;
    findOne(id: number, userId: number): Promise<({
        entries: {
            id: number;
            type: import(".prisma/client").$Enums.GoalEntryType;
            amount: import("@prisma/client/runtime/library").Decimal;
            date: Date;
            walletId: number | null;
            goalId: number;
            createdAt: Date;
            transactionId: number | null;
            note: string | null;
        }[];
    } & {
        id: number;
        accountId: number;
        walletId: number | null;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        icon: string | null;
        color: string | null;
        targetAmount: import("@prisma/client/runtime/library").Decimal;
        savedAmount: import("@prisma/client/runtime/library").Decimal;
        goalDate: Date;
    }) | null>;
    create(userId: number, dto: CreateGoalDto): Promise<{
        id: number;
        accountId: number;
        walletId: number | null;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        icon: string | null;
        color: string | null;
        targetAmount: import("@prisma/client/runtime/library").Decimal;
        savedAmount: import("@prisma/client/runtime/library").Decimal;
        goalDate: Date;
    }>;
    update(id: number, userId: number, dto: UpdateGoalDto): Promise<{
        id: number;
        accountId: number;
        walletId: number | null;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        icon: string | null;
        color: string | null;
        targetAmount: import("@prisma/client/runtime/library").Decimal;
        savedAmount: import("@prisma/client/runtime/library").Decimal;
        goalDate: Date;
    }>;
    deposit(id: number, userId: number, dto: GoalEntryDto): Promise<({
        entries: {
            id: number;
            type: import(".prisma/client").$Enums.GoalEntryType;
            amount: import("@prisma/client/runtime/library").Decimal;
            date: Date;
            walletId: number | null;
            goalId: number;
            createdAt: Date;
            transactionId: number | null;
            note: string | null;
        }[];
    } & {
        id: number;
        accountId: number;
        walletId: number | null;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        icon: string | null;
        color: string | null;
        targetAmount: import("@prisma/client/runtime/library").Decimal;
        savedAmount: import("@prisma/client/runtime/library").Decimal;
        goalDate: Date;
    }) | null>;
    withdraw(id: number, userId: number, dto: GoalEntryDto): Promise<({
        entries: {
            id: number;
            type: import(".prisma/client").$Enums.GoalEntryType;
            amount: import("@prisma/client/runtime/library").Decimal;
            date: Date;
            walletId: number | null;
            goalId: number;
            createdAt: Date;
            transactionId: number | null;
            note: string | null;
        }[];
    } & {
        id: number;
        accountId: number;
        walletId: number | null;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        icon: string | null;
        color: string | null;
        targetAmount: import("@prisma/client/runtime/library").Decimal;
        savedAmount: import("@prisma/client/runtime/library").Decimal;
        goalDate: Date;
    }) | null>;
    delete(id: number, userId: number): Promise<void>;
    private findAndVerify;
    private verifyOwnership;
}
