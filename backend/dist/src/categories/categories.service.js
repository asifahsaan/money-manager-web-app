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
exports.CategoriesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const default_categories_seed_1 = require("./seeds/default-categories.seed");
let CategoriesService = class CategoriesService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async seedDefaultCategories(accountId) {
        const data = default_categories_seed_1.ALL_DEFAULT_CATEGORIES.map((cat) => ({ ...cat, accountId }));
        await this.prisma.category.createMany({ data });
    }
    async findAll(accountId, userId, type) {
        await this.verifyAccountOwnership(accountId, userId);
        const where = {
            accountId,
            parentCategoryId: null,
        };
        if (type)
            where.type = type;
        return this.prisma.category.findMany({
            where,
            include: {
                children: { orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] },
            },
            orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        });
    }
    async create(userId, dto) {
        await this.verifyAccountOwnership(dto.accountId, userId);
        if (dto.parentCategoryId) {
            const parent = await this.prisma.category.findUnique({
                where: { id: dto.parentCategoryId },
            });
            if (!parent || parent.accountId !== dto.accountId) {
                throw new common_1.BadRequestException('Parent category not found');
            }
            if (parent.parentCategoryId !== null) {
                throw new common_1.BadRequestException('Subcategories cannot have nested subcategories');
            }
        }
        return this.prisma.category.create({
            data: {
                accountId: dto.accountId,
                name: dto.name,
                type: dto.type,
                icon: dto.icon,
                color: dto.color,
                parentCategoryId: dto.parentCategoryId ?? null,
                description: dto.description,
                isDefault: false,
            },
        });
    }
    async update(id, userId, dto) {
        await this.findCategoryAndVerify(id, userId);
        return this.prisma.category.update({
            where: { id },
            data: {
                ...(dto.name !== undefined && { name: dto.name }),
                ...(dto.icon !== undefined && { icon: dto.icon }),
                ...(dto.color !== undefined && { color: dto.color }),
                ...(dto.description !== undefined && { description: dto.description }),
                ...(dto.parentCategoryId !== undefined && {
                    parentCategoryId: dto.parentCategoryId,
                }),
            },
        });
    }
    async delete(id, userId) {
        const category = await this.findCategoryAndVerify(id, userId);
        if (category.isDefault) {
            throw new common_1.BadRequestException('Cannot delete default categories');
        }
        await this.prisma.transaction.updateMany({
            where: { categoryId: id },
            data: { categoryId: null },
        });
        await this.prisma.category.deleteMany({ where: { parentCategoryId: id } });
        await this.prisma.category.delete({ where: { id } });
    }
    async findCategoryAndVerify(id, userId) {
        const category = await this.prisma.category.findUnique({ where: { id } });
        if (!category)
            throw new common_1.NotFoundException('Category not found');
        await this.verifyAccountOwnership(category.accountId, userId);
        return category;
    }
    async verifyAccountOwnership(accountId, userId) {
        const account = await this.prisma.account.findUnique({ where: { id: accountId } });
        if (!account)
            throw new common_1.NotFoundException('Account not found');
        if (account.userId !== userId)
            throw new common_1.ForbiddenException('Access denied');
    }
};
exports.CategoriesService = CategoriesService;
exports.CategoriesService = CategoriesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CategoriesService);
//# sourceMappingURL=categories.service.js.map