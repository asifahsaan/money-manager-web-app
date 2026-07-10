import { JwtUser } from '../common/decorators/current-user.decorator';
import { GoalsService } from './goals.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { GoalEntryDto } from './dto/goal-entry.dto';
export declare class GoalsController {
    private readonly goalsService;
    constructor(goalsService: GoalsService);
    findAll(accountId: number, user: JwtUser): Promise<({
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
    findOne(id: number, user: JwtUser): Promise<({
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
    create(dto: CreateGoalDto, user: JwtUser): Promise<{
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
    update(id: number, dto: UpdateGoalDto, user: JwtUser): Promise<{
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
    deposit(id: number, dto: GoalEntryDto, user: JwtUser): Promise<({
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
    withdraw(id: number, dto: GoalEntryDto, user: JwtUser): Promise<({
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
    delete(id: number, user: JwtUser): Promise<{
        deleted: boolean;
    }>;
}
