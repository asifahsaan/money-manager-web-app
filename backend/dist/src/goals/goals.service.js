"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoalsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let GoalsService = class GoalsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(accountId, userId) {
        await this.verifyOwnership(accountId, userId);
        return this.prisma.goal.findMany({
            where: { accountId },
            include: { entries: { orderBy: { date: 'desc' }, take: 5 } },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findOne(id, userId) {
        const goal = await this.findAndVerify(id, userId);
        return this.prisma.goal.findUnique({
            where: { id: goal.id },
            include: { entries: { orderBy: { date: 'desc' } } },
        });
    }
    async create(userId, dto) {
        await this.verifyOwnership(dto.accountId, userId);
        return this.prisma.goal.create({
            data: {
                accountId: dto.accountId,
                name: dto.name,
                targetAmount: dto.targetAmount,
                goalDate: new Date(dto.goalDate),
                walletId: dto.walletId ?? null,
                icon: dto.icon ?? null,
                color: dto.color ?? null,
            },
        });
    }
    async update(id, userId, dto) {
        const goal = await this.findAndVerify(id, userId);
        return this.prisma.goal.update({
            where: { id: goal.id },
            data: {
                ...(dto.name !== undefined && { name: dto.name }),
                ...(dto.targetAmount !== undefined && { targetAmount: dto.targetAmount }),
                ...(dto.goalDate && { goalDate: new Date(dto.goalDate) }),
                ...(dto.walletId !== undefined && { walletId: dto.walletId }),
                ...(dto.icon !== undefined && { icon: dto.icon }),
                ...(dto.color !== undefined && { color: dto.color }),
            },
        });
    }
    async deposit(id, userId, dto) {
        const goal = await this.findAndVerify(id, userId);
        const amount = dto.amount;
        return this.prisma.$transaction(async (tx) => {
            const wallet = await tx.wallet.findUnique({ where: { id: dto.walletId } });
            if (!wallet)
                throw new common_1.NotFoundException('Wallet not found');
            if (Number(wallet.currentBalance) < amount)
                throw new common_1.BadRequestException('Insufficient wallet balance');
            const txDate = new Date(dto.date + 'T00:00:00');
            const transaction = await tx.transaction.create({
                data: {
                    accountId: goal.accountId,
                    walletId: dto.walletId,
                    type: 'EXPENSE',
                    amount,
                    description: `Goal deposit: ${goal.name}`,
                    date: txDate,
                    datetime: txDate,
                    goalId: id,
                },
            });
            await tx.wallet.update({
                where: { id: dto.walletId },
                data: { currentBalance: { decrement: amount } },
            });
            await tx.goal.update({
                where: { id: goal.id },
                data: { savedAmount: { increment: amount } },
            });
            await tx.goalEntry.create({
                data: {
                    goalId: id,
                    type: 'DEPOSIT',
                    amount,
                    walletId: dto.walletId,
                    transactionId: transaction.id,
                    date: new Date(dto.date),
                    note: dto.note ?? null,
                },
            });
            return tx.goal.findUnique({ where: { id: goal.id }, include: { entries: { orderBy: { date: 'desc' }, take: 5 } } });
        });
    }
    async withdraw(id, userId, dto) {
        const goal = await this.findAndVerify(id, userId);
        const amount = dto.amount;
        if (Number(goal.savedAmount) < amount)
            throw new common_1.BadRequestException('Insufficient saved amount');
        return this.prisma.$transaction(async (tx) => {
            const txDate = new Date(dto.date + 'T00:00:00');
            const transaction = await tx.transaction.create({
                data: {
                    accountId: goal.accountId,
                    walletId: dto.walletId,
                    type: 'INCOME',
                    amount,
                    description: `Goal withdrawal: ${goal.name}`,
                    date: txDate,
                    datetime: txDate,
                    goalId: id,
                },
            });
            await tx.wallet.update({
                where: { id: dto.walletId },
                data: { currentBalance: { increment: amount } },
            });
            await tx.goal.update({
                where: { id: goal.id },
                data: { savedAmount: { decrement: amount } },
            });
            await tx.goalEntry.create({
                data: {
                    goalId: id,
                    type: 'WITHDRAW',
                    amount,
                    walletId: dto.walletId,
                    transactionId: transaction.id,
                    date: new Date(dto.date),
                    note: dto.note ?? null,
                },
            });
            return tx.goal.findUnique({ where: { id: goal.id }, include: { entries: { orderBy: { date: 'desc' }, take: 5 } } });
        });
    }
    async delete(id, userId) {
        const goal = await this.findAndVerify(id, userId);
        await this.prisma.goal.delete({ where: { id: goal.id } });
    }
    async findAndVerify(id, userId) {
        const goal = await this.prisma.goal.findUnique({ where: { id } });
        if (!goal)
            throw new common_1.NotFoundException('Goal not found');
        await this.verifyOwnership(goal.accountId, userId);
        return goal;
    }
    async verifyOwnership(accountId, userId) {
        const acc = await this.prisma.account.findUnique({ where: { id: accountId } });
        if (!acc || acc.userId !== userId)
            throw new common_1.ForbiddenException('Access denied');
    }
};
exports.GoalsService = GoalsService;
exports.GoalsService = GoalsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], GoalsService);
//# sourceMappingURL=goals.service.js.map