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
            createdAt: Date;
            type: import(".prisma/client").$Enums.GoalEntryType;
            amount: import("@prisma/client/runtime/library").Decimal;
            date: Date;
            walletId: number | null;
            goalId: number;
            transactionId: number | null;
            note: string | null;
        }[];
    } & {
        name: string;
        id: number;
        createdAt: Date;
        updatedAt: Date;
        accountId: number;
        icon: string | null;
        color: string | null;
        walletId: number | null;
        targetAmount: import("@prisma/client/runtime/library").Decimal;
        savedAmount: import("@prisma/client/runtime/library").Decimal;
        goalDate: Date;
    })[]>;
    findOne(id: number, userId: number): Promise<({
        entries: {
            id: number;
            createdAt: Date;
            type: import(".prisma/client").$Enums.GoalEntryType;
            amount: import("@prisma/client/runtime/library").Decimal;
            date: Date;
            walletId: number | null;
            goalId: number;
            transactionId: number | null;
            note: string | null;
        }[];
    } & {
        name: string;
        id: number;
        createdAt: Date;
        updatedAt: Date;
        accountId: number;
        icon: string | null;
        color: string | null;
        walletId: number | null;
        targetAmount: import("@prisma/client/runtime/library").Decimal;
        savedAmount: import("@prisma/client/runtime/library").Decimal;
        goalDate: Date;
    }) | null>;
    create(userId: number, dto: CreateGoalDto): Promise<{
        name: string;
        id: number;
        createdAt: Date;
        updatedAt: Date;
        accountId: number;
        icon: string | null;
        color: string | null;
        walletId: number | null;
        targetAmount: import("@prisma/client/runtime/library").Decimal;
        savedAmount: import("@prisma/client/runtime/library").Decimal;
        goalDate: Date;
    }>;
    update(id: number, userId: number, dto: UpdateGoalDto): Promise<{
        name: string;
        id: number;
        createdAt: Date;
        updatedAt: Date;
        accountId: number;
        icon: string | null;
        color: string | null;
        walletId: number | null;
        targetAmount: import("@prisma/client/runtime/library").Decimal;
        savedAmount: import("@prisma/client/runtime/library").Decimal;
        goalDate: Date;
    }>;
    deposit(id: number, userId: number, dto: GoalEntryDto): Promise<({
        entries: {
            id: number;
            createdAt: Date;
            type: import(".prisma/client").$Enums.GoalEntryType;
            amount: import("@prisma/client/runtime/library").Decimal;
            date: Date;
            walletId: number | null;
            goalId: number;
            transactionId: number | null;
            note: string | null;
        }[];
    } & {
        name: string;
        id: number;
        createdAt: Date;
        updatedAt: Date;
        accountId: number;
        icon: string | null;
        color: string | null;
        walletId: number | null;
        targetAmount: import("@prisma/client/runtime/library").Decimal;
        savedAmount: import("@prisma/client/runtime/library").Decimal;
        goalDate: Date;
    }) | null>;
    withdraw(id: number, userId: number, dto: GoalEntryDto): Promise<({
        entries: {
            id: number;
            createdAt: Date;
            type: import(".prisma/client").$Enums.GoalEntryType;
            amount: import("@prisma/client/runtime/library").Decimal;
            date: Date;
            walletId: number | null;
            goalId: number;
            transactionId: number | null;
            note: string | null;
        }[];
    } & {
        name: string;
        id: number;
        createdAt: Date;
        updatedAt: Date;
        accountId: number;
        icon: string | null;
        color: string | null;
        walletId: number | null;
        targetAmount: import("@prisma/client/runtime/library").Decimal;
        savedAmount: import("@prisma/client/runtime/library").Decimal;
        goalDate: Date;
    }) | null>;
    delete(id: number, userId: number): Promise<void>;
    private findAndVerify;
    private verifyOwnership;
}
