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
exports.RecurringsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const date_fns_1 = require("date-fns");
let RecurringsService = class RecurringsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(accountId, userId) {
        await this.verifyOwnership(accountId, userId);
        return this.prisma.recurring.findMany({
            where: { accountId },
            include: { category: true },
            orderBy: { nextOccurrence: 'asc' },
        });
    }
    async create(userId, dto) {
        await this.verifyOwnership(dto.accountId, userId);
        const startDate = new Date(dto.startDate);
        return this.prisma.recurring.create({
            data: {
                accountId: dto.accountId,
                transactionType: dto.transactionType,
                amount: dto.amount,
                description: dto.description ?? null,
                memo: dto.memo ?? null,
                categoryId: dto.categoryId ?? null,
                walletId: dto.walletId ?? null,
                fromWalletId: dto.fromWalletId ?? null,
                toWalletId: dto.toWalletId ?? null,
                frequency: dto.frequency,
                startDate,
                nextOccurrence: startDate,
                endDate: dto.endDate ? new Date(dto.endDate) : null,
            },
            include: { category: true },
        });
    }
    async update(id, userId, dto) {
        const r = await this.findAndVerify(id, userId);
        return this.prisma.recurring.update({
            where: { id: r.id },
            data: {
                ...(dto.amount !== undefined && { amount: dto.amount }),
                ...(dto.description !== undefined && { description: dto.description }),
                ...(dto.memo !== undefined && { memo: dto.memo }),
                ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
                ...(dto.frequency !== undefined && { frequency: dto.frequency }),
                ...(dto.endDate !== undefined && { endDate: dto.endDate ? new Date(dto.endDate) : null }),
                ...(dto.isActive !== undefined && { isActive: dto.isActive }),
            },
            include: { category: true },
        });
    }
    async execute(id, userId) {
        const r = await this.findAndVerify(id, userId);
        return this.prisma.$transaction(async (tx) => {
            const txDate = r.nextOccurrence;
            const transaction = await tx.transaction.create({
                data: {
                    accountId: r.accountId,
                    type: r.transactionType,
                    amount: r.amount,
                    description: r.description ?? `Recurring: ${r.frequency}`,
                    date: txDate,
                    datetime: txDate,
                    categoryId: r.categoryId ?? null,
                    walletId: r.walletId ?? null,
                    fromWalletId: r.fromWalletId ?? null,
                    toWalletId: r.toWalletId ?? null,
                },
            });
            if (r.transactionType === 'INCOME' && r.walletId) {
                await tx.wallet.update({ where: { id: r.walletId }, data: { currentBalance: { increment: Number(r.amount) } } });
            }
            else if (r.transactionType === 'EXPENSE' && r.walletId) {
                await tx.wallet.update({ where: { id: r.walletId }, data: { currentBalance: { decrement: Number(r.amount) } } });
            }
            else if (r.transactionType === 'TRANSFER') {
                if (r.fromWalletId) {
                    await tx.wallet.update({ where: { id: r.fromWalletId }, data: { currentBalance: { decrement: Number(r.amount) } } });
                }
                if (r.toWalletId) {
                    await tx.wallet.update({ where: { id: r.toWalletId }, data: { currentBalance: { increment: Number(r.amount) } } });
                }
            }
            const nextOccurrence = this.calculateNext(r.nextOccurrence, r.frequency);
            await tx.recurring.update({ where: { id: r.id }, data: { nextOccurrence } });
            return { transaction, nextOccurrence };
        });
    }
    async delete(id, userId) {
        const r = await this.findAndVerify(id, userId);
        await this.prisma.recurring.delete({ where: { id: r.id } });
    }
    calculateNext(from, frequency) {
        switch (frequency) {
            case 'DAILY': return (0, date_fns_1.addDays)(from, 1);
            case 'WEEKLY': return (0, date_fns_1.addWeeks)(from, 1);
            case 'MONTHLY': return (0, date_fns_1.addMonths)(from, 1);
            case 'YEARLY': return (0, date_fns_1.addYears)(from, 1);
            default: return (0, date_fns_1.addMonths)(from, 1);
        }
    }
    async findAndVerify(id, userId) {
        const r = await this.prisma.recurring.findUnique({ where: { id } });
        if (!r)
            throw new common_1.NotFoundException('Recurring not found');
        await this.verifyOwnership(r.accountId, userId);
        return r;
    }
    async verifyOwnership(accountId, userId) {
        const acc = await this.prisma.account.findUnique({ where: { id: accountId } });
        if (!acc || acc.userId !== userId)
            throw new common_1.ForbiddenException('Access denied');
    }
};
exports.RecurringsService = RecurringsService;
exports.RecurringsService = RecurringsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], RecurringsService);
//# sourceMappingURL=recurrings.service.js.map