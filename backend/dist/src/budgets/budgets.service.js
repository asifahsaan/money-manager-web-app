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
exports.BudgetsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let BudgetsService = class BudgetsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(accountId, userId, startDate, endDate) {
        await this.verifyOwnership(accountId, userId);
        const budgets = await this.prisma.budget.findMany({
            where: { accountId },
            include: { category: true },
            orderBy: { createdAt: 'desc' },
        });
        return Promise.all(budgets.map(async (b) => {
            const start = startDate ? new Date(startDate) : b.startDate;
            const end = endDate ? new Date(endDate) : b.endDate;
            const children = await this.prisma.category.findMany({
                where: { parentCategoryId: b.categoryId },
                select: { id: true },
            });
            const categoryIds = [b.categoryId, ...children.map((c) => c.id)];
            const agg = await this.prisma.transaction.aggregate({
                where: {
                    accountId,
                    categoryId: { in: categoryIds },
                    type: 'EXPENSE',
                    goalId: null,
                    date: { gte: start, lte: end },
                },
                _sum: { amount: true },
            });
            const spent = Number(agg._sum.amount ?? 0);
            const budget = Number(b.amount);
            return {
                ...b,
                spent,
                remaining: Math.max(0, budget - spent),
                percentage: budget > 0 ? Math.min(100, (spent / budget) * 100) : 0,
            };
        }));
    }
    async create(userId, dto) {
        await this.verifyOwnership(dto.accountId, userId);
        return this.prisma.budget.create({
            data: {
                accountId: dto.accountId,
                categoryId: dto.categoryId,
                amount: dto.amount,
                periodType: dto.periodType,
                startDate: new Date(dto.startDate),
                endDate: new Date(dto.endDate),
            },
            include: { category: true },
        });
    }
    async update(id, userId, dto) {
        const b = await this.findAndVerify(id, userId);
        return this.prisma.budget.update({
            where: { id: b.id },
            data: {
                ...(dto.amount !== undefined && { amount: dto.amount }),
                ...(dto.startDate && { startDate: new Date(dto.startDate) }),
                ...(dto.endDate && { endDate: new Date(dto.endDate) }),
            },
            include: { category: true },
        });
    }
    async delete(id, userId) {
        const b = await this.findAndVerify(id, userId);
        await this.prisma.budget.delete({ where: { id: b.id } });
    }
    async findAndVerify(id, userId) {
        const b = await this.prisma.budget.findUnique({ where: { id } });
        if (!b)
            throw new common_1.NotFoundException('Budget not found');
        await this.verifyOwnership(b.accountId, userId);
        return b;
    }
    async verifyOwnership(accountId, userId) {
        const acc = await this.prisma.account.findUnique({ where: { id: accountId } });
        if (!acc || acc.userId !== userId)
            throw new common_1.ForbiddenException('Access denied');
    }
};
exports.BudgetsService = BudgetsService;
exports.BudgetsService = BudgetsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], BudgetsService);
//# sourceMappingURL=budgets.service.js.map