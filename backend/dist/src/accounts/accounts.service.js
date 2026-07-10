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
exports.AccountsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const categories_service_1 = require("../categories/categories.service");
let AccountsService = class AccountsService {
    constructor(prisma, categoriesService) {
        this.prisma = prisma;
        this.categoriesService = categoriesService;
    }
    async findAllByUser(userId) {
        return this.prisma.account.findMany({
            where: { userId },
            orderBy: { createdAt: 'asc' },
        });
    }
    async findOne(id, userId) {
        const account = await this.prisma.account.findUnique({ where: { id } });
        if (!account)
            throw new common_1.NotFoundException('Account not found');
        if (account.userId !== userId)
            throw new common_1.ForbiddenException('Access denied');
        return account;
    }
    async create(userId, dto) {
        const account = await this.prisma.account.create({
            data: {
                userId,
                name: dto.name,
                currency: dto.currency ?? 'Rs.',
            },
        });
        await Promise.all([
            this.categoriesService.seedDefaultCategories(account.id),
            this.prisma.wallet.create({
                data: {
                    accountId: account.id,
                    name: 'Cash',
                    type: 'CASH',
                    icon: 'Wallet',
                    color: '#10B981',
                    initialBalance: 0,
                    currentBalance: 0,
                    includedInTotal: true,
                    sortOrder: 0,
                },
            }),
        ]);
        return account;
    }
    async createDefault(userId, name) {
        return this.create(userId, { name, currency: 'Rs.' });
    }
    async update(id, userId, dto) {
        await this.findOne(id, userId);
        return this.prisma.account.update({
            where: { id },
            data: dto,
        });
    }
    async delete(id, userId) {
        await this.findOne(id, userId);
        await this.prisma.account.delete({ where: { id } });
    }
};
exports.AccountsService = AccountsService;
exports.AccountsService = AccountsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        categories_service_1.CategoriesService])
], AccountsService);
//# sourceMappingURL=accounts.service.js.map