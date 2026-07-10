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
exports.DebtsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let DebtsService = class DebtsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(accountId, userId) {
        await this.verifyOwnership(accountId, userId);
        return this.prisma.debt.findMany({
            where: { accountId },
            include: { entries: { orderBy: { date: 'desc' }, take: 5 } },
            orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        });
    }
    async findOne(id, userId) {
        const debt = await this.findAndVerify(id, userId);
        return this.prisma.debt.findUnique({
            where: { id: debt.id },
            include: { entries: { orderBy: { date: 'desc' } } },
        });
    }
    async create(userId, dto) {
        await this.verifyOwnership(dto.accountId, userId);
        const txDate = new Date(dto.date + 'T00:00:00');
        const categoryId = dto.walletId
            ? await this.findDebtCategory(dto.accountId, dto.type === 'RECEIVABLE' ? 'Loan' : 'Debt collection')
            : null;
        return this.prisma.$transaction(async (tx) => {
            const debt = await tx.debt.create({
                data: {
                    accountId: dto.accountId,
                    type: dto.type,
                    personName: dto.personName,
                    description: dto.description ?? null,
                    totalAmount: dto.totalAmount,
                    settledAmount: 0,
                    remainingAmount: dto.totalAmount,
                    walletId: dto.walletId ?? null,
                    color: dto.color ?? null,
                    date: txDate,
                },
            });
            if (dto.walletId) {
                const txType = dto.type === 'RECEIVABLE' ? 'EXPENSE' : 'INCOME';
                const description = dto.type === 'RECEIVABLE'
                    ? `Lent to ${dto.personName}${dto.description ? ` (${dto.description})` : ''}`
                    : `Borrowed from ${dto.personName}${dto.description ? ` (${dto.description})` : ''}`;
                await tx.transaction.create({
                    data: {
                        accountId: dto.accountId,
                        walletId: dto.walletId,
                        type: txType,
                        amount: dto.totalAmount,
                        description,
                        date: txDate,
                        datetime: txDate,
                        debtId: debt.id,
                        categoryId,
                    },
                });
                if (txType === 'EXPENSE') {
                    await tx.wallet.update({
                        where: { id: dto.walletId },
                        data: { currentBalance: { decrement: dto.totalAmount } },
                    });
                }
                else {
                    await tx.wallet.update({
                        where: { id: dto.walletId },
                        data: { currentBalance: { increment: dto.totalAmount } },
                    });
                }
            }
            return debt;
        }, { timeout: 20000 });
    }
    async update(id, userId, dto) {
        const debt = await this.findAndVerify(id, userId);
        let totalAmount;
        let remainingAmount;
        let status;
        if (dto.totalAmount !== undefined) {
            totalAmount = dto.totalAmount;
            const settled = Number(debt.settledAmount);
            remainingAmount = Math.max(0, totalAmount - settled);
            status = remainingAmount <= 0 ? client_1.DebtStatus.CLOSED : settled > 0 ? client_1.DebtStatus.PARTIAL : client_1.DebtStatus.OPEN;
        }
        return this.prisma.debt.update({
            where: { id: debt.id },
            data: {
                ...(dto.personName !== undefined && { personName: dto.personName }),
                ...(dto.description !== undefined && { description: dto.description }),
                ...(dto.color !== undefined && { color: dto.color }),
                ...(dto.date && { date: new Date(dto.date) }),
                ...(totalAmount !== undefined && { totalAmount, remainingAmount, status }),
                ...(dto.walletId !== undefined && { walletId: dto.walletId }),
            },
        });
    }
    async pay(id, userId, dto) {
        const debt = await this.findAndVerify(id, userId);
        if (debt.status === 'CLOSED')
            throw new common_1.BadRequestException('Debt is already closed');
        const amount = dto.amount;
        const remaining = Number(debt.remainingAmount);
        if (amount > remaining)
            throw new common_1.BadRequestException(`Amount exceeds remaining: ${remaining}`);
        const payCategoryId = await this.findDebtCategory(debt.accountId, debt.type === 'PAYABLE' ? 'Loan' : 'Debt collection');
        return this.prisma.$transaction(async (tx) => {
            const txType = debt.type === 'PAYABLE' ? 'EXPENSE' : 'INCOME';
            const txDate = new Date(dto.date + 'T00:00:00');
            const transaction = await tx.transaction.create({
                data: {
                    accountId: debt.accountId,
                    walletId: dto.walletId,
                    type: txType,
                    amount,
                    description: `${debt.type === 'PAYABLE' ? 'Debt payment' : 'Debt collection'}: ${debt.personName}`,
                    date: txDate,
                    datetime: txDate,
                    debtId: id,
                    categoryId: payCategoryId,
                },
            });
            if (txType === 'EXPENSE') {
                await tx.wallet.update({ where: { id: dto.walletId }, data: { currentBalance: { decrement: amount } } });
            }
            else {
                await tx.wallet.update({ where: { id: dto.walletId }, data: { currentBalance: { increment: amount } } });
            }
            const newSettled = Number(debt.settledAmount) + amount;
            const newRemaining = remaining - amount;
            const newStatus = newRemaining <= 0 ? 'CLOSED' : newSettled > 0 ? 'PARTIAL' : 'OPEN';
            await tx.debt.update({
                where: { id: debt.id },
                data: { settledAmount: newSettled, remainingAmount: newRemaining, status: newStatus },
            });
            const entryType = debt.type === 'PAYABLE' ? 'PAYMENT' : 'COLLECTION';
            await tx.debtEntry.create({
                data: {
                    debtId: id,
                    type: entryType,
                    amount,
                    walletId: dto.walletId,
                    transactionId: transaction.id,
                    date: new Date(dto.date),
                    note: dto.note ?? null,
                },
            });
            return tx.debt.findUnique({ where: { id: debt.id }, include: { entries: { orderBy: { date: 'desc' }, take: 5 } } });
        }, { timeout: 20000 });
    }
    async updateEntry(debtId, entryId, userId, dto) {
        const debt = await this.findAndVerify(debtId, userId);
        const entry = await this.prisma.debtEntry.findUnique({ where: { id: entryId } });
        if (!entry || entry.debtId !== debt.id)
            throw new common_1.NotFoundException('Entry not found');
        const walletChanged = dto.walletId !== undefined && dto.walletId !== entry.walletId;
        return this.prisma.$transaction(async (tx) => {
            if (walletChanged && entry.transactionId) {
                const oldTx = await tx.transaction.findUnique({ where: { id: entry.transactionId } });
                if (oldTx && oldTx.walletId) {
                    if (oldTx.type === 'INCOME') {
                        await tx.wallet.update({ where: { id: oldTx.walletId }, data: { currentBalance: { decrement: oldTx.amount } } });
                    }
                    else {
                        await tx.wallet.update({ where: { id: oldTx.walletId }, data: { currentBalance: { increment: oldTx.amount } } });
                    }
                    if (oldTx.type === 'INCOME') {
                        await tx.wallet.update({ where: { id: dto.walletId }, data: { currentBalance: { increment: oldTx.amount } } });
                    }
                    else {
                        await tx.wallet.update({ where: { id: dto.walletId }, data: { currentBalance: { decrement: oldTx.amount } } });
                    }
                    await tx.transaction.update({ where: { id: entry.transactionId }, data: { walletId: dto.walletId } });
                }
            }
            await tx.debtEntry.update({
                where: { id: entryId },
                data: {
                    ...(walletChanged && { walletId: dto.walletId }),
                    ...(dto.note !== undefined && { note: dto.note }),
                    ...(dto.date && { date: new Date(dto.date) }),
                },
            });
            return tx.debt.findUnique({
                where: { id: debt.id },
                include: { entries: { orderBy: { date: 'desc' }, take: 5 } },
            });
        }, { timeout: 20000 });
    }
    async delete(id, userId) {
        const debt = await this.findAndVerify(id, userId);
        await this.prisma.$transaction(async (tx) => {
            const linkedTxs = await tx.transaction.findMany({ where: { debtId: debt.id } });
            for (const t of linkedTxs) {
                if (t.type === 'INCOME' && t.walletId) {
                    await tx.wallet.update({ where: { id: t.walletId }, data: { currentBalance: { decrement: Number(t.amount) } } });
                }
                else if (t.type === 'EXPENSE' && t.walletId) {
                    await tx.wallet.update({ where: { id: t.walletId }, data: { currentBalance: { increment: Number(t.amount) } } });
                }
                await tx.transaction.delete({ where: { id: t.id } });
            }
            await tx.debtEntry.deleteMany({ where: { debtId: debt.id } });
            await tx.debt.delete({ where: { id: debt.id } });
        }, { timeout: 20000 });
    }
    async findDebtCategory(accountId, name) {
        const cat = await this.prisma.category.findFirst({ where: { accountId, name } });
        return cat?.id ?? null;
    }
    async findAndVerify(id, userId) {
        const debt = await this.prisma.debt.findUnique({ where: { id } });
        if (!debt)
            throw new common_1.NotFoundException('Debt not found');
        await this.verifyOwnership(debt.accountId, userId);
        return debt;
    }
    async verifyOwnership(accountId, userId) {
        const acc = await this.prisma.account.findUnique({ where: { id: accountId } });
        if (!acc || acc.userId !== userId)
            throw new common_1.ForbiddenException('Access denied');
    }
};
exports.DebtsService = DebtsService;
exports.DebtsService = DebtsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DebtsService);
//# sourceMappingURL=debts.service.js.map