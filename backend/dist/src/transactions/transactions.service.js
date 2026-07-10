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
exports.TransactionsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
const TRANSACTION_INCLUDE = {
    category: { include: { parent: true } },
    wallet: true,
    fromWallet: true,
    toWallet: true,
};
let TransactionsService = class TransactionsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    buildWhere(query) {
        const where = {
            accountId: query.accountId,
            OR: [
                { description: { not: 'Opening Balance' } },
                { description: null },
            ],
        };
        if (query.type)
            where.type = query.type;
        if (query.categoryId)
            where.categoryId = query.categoryId;
        if (query.walletId) {
            where.OR = [
                { walletId: query.walletId },
                { fromWalletId: query.walletId },
                { toWalletId: query.walletId },
            ];
        }
        if (query.startDate || query.endDate) {
            where.date = {};
            if (query.startDate)
                where.date.gte = new Date(query.startDate + 'T00:00:00.000Z');
            if (query.endDate)
                where.date.lte = new Date(query.endDate + 'T23:59:59.999Z');
        }
        if (query.search) {
            where.AND = [
                ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
                {
                    OR: [
                        { description: { contains: query.search } },
                        { memo: { contains: query.search } },
                        { category: { name: { contains: query.search } } },
                    ],
                },
            ];
        }
        return where;
    }
    async findAll(userId, query) {
        await this.verifyAccountOwnership(query.accountId, userId);
        const page = query.page ?? 1;
        const limit = query.limit ?? 50;
        const skip = (page - 1) * limit;
        const where = this.buildWhere(query);
        const [data, total] = await Promise.all([
            this.prisma.transaction.findMany({
                where,
                include: TRANSACTION_INCLUDE,
                orderBy: [{ date: 'desc' }, { datetime: 'desc' }],
                skip,
                take: limit,
            }),
            this.prisma.transaction.count({ where }),
        ]);
        return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
    }
    async exportCsv(userId, query) {
        await this.verifyAccountOwnership(query.accountId, userId);
        const where = this.buildWhere(query);
        const txs = await this.prisma.transaction.findMany({
            where,
            include: TRANSACTION_INCLUDE,
            orderBy: [{ date: 'desc' }, { datetime: 'desc' }],
        });
        const escape = (v) => `"${v.replace(/"/g, '""')}"`;
        const header = ['Date', 'Time', 'Type', 'Category', 'Wallet', 'Description', 'Memo', 'Amount', 'Fee'];
        const rows = txs.map((t) => {
            const wallet = t.type === 'TRANSFER'
                ? `${t.fromWallet?.name ?? ''} -> ${t.toWallet?.name ?? ''}`
                : t.wallet?.name ?? '';
            return [
                t.date.toISOString().substring(0, 10),
                t.time ?? '',
                t.type,
                t.category?.name ?? '',
                wallet,
                t.description ?? '',
                t.memo ?? '',
                Number(t.amount).toString(),
                Number(t.feeAmount).toString(),
            ].map((v) => escape(String(v))).join(',');
        });
        return [header.map(escape).join(','), ...rows].join('\n');
    }
    async findOne(id, userId) {
        const tx = await this.prisma.transaction.findUnique({
            where: { id },
            include: TRANSACTION_INCLUDE,
        });
        if (!tx)
            throw new common_1.NotFoundException('Transaction not found');
        await this.verifyAccountOwnership(tx.accountId, userId);
        return tx;
    }
    async create(userId, dto) {
        await this.verifyAccountOwnership(dto.accountId, userId);
        await this.validateWallets(dto.accountId, dto);
        const { datetime, date } = this.buildDates(dto.date, dto.time);
        return this.prisma.$transaction(async (tx) => {
            const transaction = await tx.transaction.create({
                data: {
                    accountId: dto.accountId,
                    type: dto.type,
                    amount: dto.amount,
                    date,
                    time: dto.time,
                    datetime,
                    description: dto.description,
                    memo: dto.memo,
                    categoryId: dto.categoryId,
                    walletId: dto.type !== client_1.TransactionType.TRANSFER ? dto.walletId : null,
                    fromWalletId: dto.type === client_1.TransactionType.TRANSFER ? dto.fromWalletId : null,
                    toWalletId: dto.type === client_1.TransactionType.TRANSFER ? dto.toWalletId : null,
                    feeAmount: dto.feeAmount ?? 0,
                },
                include: TRANSACTION_INCLUDE,
            });
            await this.applyBalance(tx, transaction);
            return transaction;
        });
    }
    async update(id, userId, dto) {
        const existing = await this.findOne(id, userId);
        return this.prisma.$transaction(async (tx) => {
            await this.reverseBalance(tx, existing);
            const type = dto.type ?? existing.type;
            const { datetime, date } = this.buildDates(dto.date ?? existing.date.toISOString().substring(0, 10), dto.time !== undefined ? dto.time : existing.time ?? undefined);
            const updated = await tx.transaction.update({
                where: { id },
                data: {
                    type,
                    amount: dto.amount ?? existing.amount,
                    date,
                    time: dto.time !== undefined ? dto.time : existing.time,
                    datetime,
                    description: dto.description !== undefined ? dto.description : existing.description,
                    memo: dto.memo !== undefined ? dto.memo : existing.memo,
                    categoryId: dto.categoryId !== undefined ? dto.categoryId : existing.categoryId,
                    walletId: type !== client_1.TransactionType.TRANSFER
                        ? (dto.walletId !== undefined ? dto.walletId : existing.walletId)
                        : null,
                    fromWalletId: type === client_1.TransactionType.TRANSFER
                        ? (dto.fromWalletId !== undefined ? dto.fromWalletId : existing.fromWalletId)
                        : null,
                    toWalletId: type === client_1.TransactionType.TRANSFER
                        ? (dto.toWalletId !== undefined ? dto.toWalletId : existing.toWalletId)
                        : null,
                    feeAmount: dto.feeAmount !== undefined ? dto.feeAmount : existing.feeAmount,
                },
                include: TRANSACTION_INCLUDE,
            });
            await this.applyBalance(tx, updated);
            return updated;
        });
    }
    async delete(id, userId) {
        const existing = await this.findOne(id, userId);
        await this.prisma.$transaction(async (tx) => {
            await this.reverseBalance(tx, existing);
            if (existing.debtId) {
                const entry = await tx.debtEntry.findFirst({ where: { transactionId: id } });
                if (entry) {
                    const debt = await tx.debt.findUnique({ where: { id: existing.debtId } });
                    if (debt) {
                        const entryAmount = Number(entry.amount);
                        const newSettled = Math.max(0, Number(debt.settledAmount) - entryAmount);
                        const newRemaining = Number(debt.totalAmount) - newSettled;
                        const newStatus = newRemaining <= 0 ? 'CLOSED' : newSettled > 0 ? 'PARTIAL' : 'OPEN';
                        await tx.debt.update({
                            where: { id: debt.id },
                            data: { settledAmount: newSettled, remainingAmount: newRemaining, status: newStatus },
                        });
                    }
                    await tx.debtEntry.delete({ where: { id: entry.id } });
                }
            }
            await tx.transaction.delete({ where: { id } });
        }, { timeout: 20000 });
    }
    async applyBalance(tx, t) {
        const amount = Number(t.amount);
        const fee = Number(t.feeAmount);
        if (t.type === client_1.TransactionType.INCOME && t.walletId) {
            await tx.wallet.update({
                where: { id: t.walletId },
                data: { currentBalance: { increment: amount } },
            });
        }
        else if (t.type === client_1.TransactionType.EXPENSE && t.walletId) {
            await tx.wallet.update({
                where: { id: t.walletId },
                data: { currentBalance: { decrement: amount } },
            });
        }
        else if (t.type === client_1.TransactionType.TRANSFER) {
            if (t.fromWalletId) {
                await tx.wallet.update({
                    where: { id: t.fromWalletId },
                    data: { currentBalance: { decrement: amount + fee } },
                });
            }
            if (t.toWalletId) {
                await tx.wallet.update({
                    where: { id: t.toWalletId },
                    data: { currentBalance: { increment: amount } },
                });
            }
        }
    }
    async reverseBalance(tx, t) {
        const amount = Number(t.amount);
        const fee = Number(t.feeAmount);
        if (t.type === client_1.TransactionType.INCOME && t.walletId) {
            await tx.wallet.update({
                where: { id: t.walletId },
                data: { currentBalance: { decrement: amount } },
            });
        }
        else if (t.type === client_1.TransactionType.EXPENSE && t.walletId) {
            await tx.wallet.update({
                where: { id: t.walletId },
                data: { currentBalance: { increment: amount } },
            });
        }
        else if (t.type === client_1.TransactionType.TRANSFER) {
            if (t.fromWalletId) {
                await tx.wallet.update({
                    where: { id: t.fromWalletId },
                    data: { currentBalance: { increment: amount + fee } },
                });
            }
            if (t.toWalletId) {
                await tx.wallet.update({
                    where: { id: t.toWalletId },
                    data: { currentBalance: { decrement: amount } },
                });
            }
        }
    }
    buildDates(dateStr, time) {
        const datetimeStr = time ? `${dateStr}T${time}:00` : `${dateStr}T00:00:00`;
        return {
            datetime: new Date(datetimeStr + 'Z'),
            date: new Date(dateStr + 'T00:00:00.000Z'),
        };
    }
    async validateWallets(accountId, dto) {
        const walletIds = [
            dto.walletId,
            dto.fromWalletId,
            dto.toWalletId,
        ].filter((id) => id !== undefined && id !== null);
        for (const wid of walletIds) {
            const wallet = await this.prisma.wallet.findUnique({ where: { id: wid } });
            if (!wallet || wallet.accountId !== accountId) {
                throw new common_1.BadRequestException(`Wallet ${wid} not found in this account`);
            }
        }
    }
    async verifyAccountOwnership(accountId, userId) {
        const account = await this.prisma.account.findUnique({ where: { id: accountId } });
        if (!account)
            throw new common_1.NotFoundException('Account not found');
        if (account.userId !== userId)
            throw new common_1.ForbiddenException('Access denied');
    }
};
exports.TransactionsService = TransactionsService;
exports.TransactionsService = TransactionsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TransactionsService);
//# sourceMappingURL=transactions.service.js.map