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
exports.StatisticsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const date_fns_1 = require("date-fns");
let StatisticsService = class StatisticsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getSummary(userId, accountId, startDate, endDate) {
        await this.verifyOwnership(accountId, userId);
        const start = new Date(startDate + 'T00:00:00');
        const end = new Date(endDate + 'T23:59:59');
        const txs = await this.prisma.transaction.findMany({
            where: {
                accountId,
                type: { in: ['INCOME', 'EXPENSE'] },
                date: { gte: start, lte: end },
                OR: [{ description: { not: 'Opening Balance' } }, { description: null }],
            },
            select: {
                id: true,
                type: true,
                amount: true,
                date: true,
                description: true,
                categoryId: true,
                category: {
                    select: {
                        id: true,
                        name: true,
                        icon: true,
                        color: true,
                        parentCategoryId: true,
                        parent: { select: { id: true, name: true, icon: true, color: true } },
                    },
                },
            },
        });
        const totalIncome = txs.filter((t) => t.type === 'INCOME').reduce((s, t) => s + Number(t.amount), 0);
        const totalExpense = txs.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + Number(t.amount), 0);
        const expenseBreakdown = this.buildBreakdown(txs.filter((t) => t.type === 'EXPENSE'), totalExpense);
        const incomeBreakdown = this.buildBreakdown(txs.filter((t) => t.type === 'INCOME'), totalIncome);
        return { totalIncome, totalExpense, balance: totalIncome - totalExpense, expenseBreakdown, incomeBreakdown };
    }
    buildBreakdown(txs, total) {
        const parentMap = new Map();
        for (const tx of txs) {
            const amt = Number(tx.amount);
            const cat = tx.category;
            const parent = cat?.parent ?? null;
            const parentId = parent ? parent.id : (cat ? cat.id : null);
            const parentName = parent ? parent.name : (cat ? cat.name : 'Uncategorized');
            const parentIcon = parent ? parent.icon : (cat ? cat.icon : null);
            const parentColor = parent ? parent.color : (cat ? cat.color : '#6B7280');
            const subId = parent ? (cat?.id ?? null) : null;
            const subName = parent ? (cat?.name ?? '') : null;
            const subIcon = parent ? (cat?.icon ?? null) : null;
            const subColor = parent ? (cat?.color ?? null) : null;
            if (!parentMap.has(parentId)) {
                parentMap.set(parentId, {
                    id: parentId,
                    name: parentName,
                    icon: parentIcon,
                    color: parentColor,
                    amount: 0,
                    percentage: 0,
                    subCategories: [],
                    transactions: [],
                });
            }
            const group = parentMap.get(parentId);
            group.amount += amt;
            const subcategoryName = parent ? (cat?.name ?? null) : null;
            group.transactions.push({ id: tx.id, date: tx.date, amount: amt, description: tx.description, subcategoryName });
            if (subId !== null && subName !== null) {
                const existing = group.subCategories.find((s) => s.id === subId);
                if (existing) {
                    existing.amount += amt;
                }
                else {
                    group.subCategories.push({ id: subId, name: subName, icon: subIcon, color: subColor, amount: amt, percentage: 0 });
                }
            }
        }
        return Array.from(parentMap.values())
            .map((g) => ({
            ...g,
            percentage: total > 0 ? (g.amount / total) * 100 : 0,
            subCategories: g.subCategories
                .map((s) => ({ ...s, percentage: g.amount > 0 ? (s.amount / g.amount) * 100 : 0 }))
                .sort((a, b) => b.amount - a.amount),
            transactions: g.transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        }))
            .sort((a, b) => b.amount - a.amount);
    }
    async getTrend(userId, accountId, months) {
        await this.verifyOwnership(accountId, userId);
        const now = new Date();
        const start = (0, date_fns_1.startOfMonth)((0, date_fns_1.subMonths)(now, months - 1));
        const end = (0, date_fns_1.endOfMonth)(now);
        const txs = await this.prisma.transaction.findMany({
            where: {
                accountId,
                type: { in: ['INCOME', 'EXPENSE'] },
                date: { gte: start, lte: end },
                OR: [{ description: { not: 'Opening Balance' } }, { description: null }],
            },
            select: { type: true, amount: true, date: true },
        });
        const monthMap = new Map();
        for (let i = months - 1; i >= 0; i--) {
            const key = (0, date_fns_1.format)((0, date_fns_1.subMonths)(now, i), 'yyyy-MM');
            monthMap.set(key, { month: key, income: 0, expense: 0 });
        }
        for (const tx of txs) {
            const key = (0, date_fns_1.format)(tx.date, 'yyyy-MM');
            if (monthMap.has(key)) {
                const entry = monthMap.get(key);
                if (tx.type === 'INCOME')
                    entry.income += Number(tx.amount);
                else
                    entry.expense += Number(tx.amount);
            }
        }
        return Array.from(monthMap.values());
    }
    async verifyOwnership(accountId, userId) {
        const account = await this.prisma.account.findUnique({ where: { id: accountId } });
        if (!account)
            throw new common_1.NotFoundException('Account not found');
        if (account.userId !== userId)
            throw new common_1.ForbiddenException('Access denied');
    }
};
exports.StatisticsService = StatisticsService;
exports.StatisticsService = StatisticsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], StatisticsService);
//# sourceMappingURL=statistics.service.js.map