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
exports.WalletsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let WalletsService = class WalletsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAllByAccount(accountId, userId) {
        await this.verifyAccountOwnership(accountId, userId);
        return this.prisma.wallet.findMany({
            where: { accountId },
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        });
    }
    async findOne(id, userId) {
        const wallet = await this.prisma.wallet.findUnique({ where: { id } });
        if (!wallet)
            throw new common_1.NotFoundException('Wallet not found');
        await this.verifyAccountOwnership(wallet.accountId, userId);
        return wallet;
    }
    async create(userId, dto) {
        await this.verifyAccountOwnership(dto.accountId, userId);
        const initial = Number(dto.initialBalance ?? 0);
        if (initial > 0) {
            return this.prisma.$transaction(async (tx) => {
                const wallet = await tx.wallet.create({
                    data: {
                        accountId: dto.accountId,
                        name: dto.name,
                        type: dto.type ?? client_1.WalletType.CASH,
                        icon: dto.icon,
                        color: dto.color,
                        initialBalance: initial,
                        currentBalance: 0,
                        includedInTotal: dto.includedInTotal ?? true,
                        sortOrder: dto.sortOrder ?? 0,
                    },
                });
                const now = new Date();
                const dateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                await tx.transaction.create({
                    data: {
                        accountId: dto.accountId,
                        type: client_1.TransactionType.INCOME,
                        amount: initial,
                        date: dateOnly,
                        datetime: now,
                        description: 'Opening Balance',
                        walletId: wallet.id,
                    },
                });
                return tx.wallet.update({
                    where: { id: wallet.id },
                    data: { currentBalance: { increment: initial } },
                });
            });
        }
        return this.prisma.wallet.create({
            data: {
                accountId: dto.accountId,
                name: dto.name,
                type: dto.type ?? client_1.WalletType.CASH,
                icon: dto.icon,
                color: dto.color,
                initialBalance: 0,
                currentBalance: 0,
                includedInTotal: dto.includedInTotal ?? true,
                sortOrder: dto.sortOrder ?? 0,
            },
        });
    }
    async createDefault(accountId) {
        return this.prisma.wallet.create({
            data: {
                accountId,
                name: 'Cash',
                type: client_1.WalletType.CASH,
                icon: 'Wallet',
                color: '#10B981',
                initialBalance: 0,
                currentBalance: 0,
                includedInTotal: true,
                sortOrder: 0,
            },
        });
    }
    async update(id, userId, dto) {
        const wallet = await this.findOne(id, userId);
        let currentBalanceDelta = 0;
        if (dto.initialBalance !== undefined) {
            const oldInitial = Number(wallet.initialBalance);
            currentBalanceDelta = dto.initialBalance - oldInitial;
        }
        return this.prisma.wallet.update({
            where: { id },
            data: {
                ...dto,
                ...(currentBalanceDelta !== 0 && {
                    currentBalance: { increment: currentBalanceDelta },
                }),
            },
        });
    }
    async delete(id, userId) {
        await this.findOne(id, userId);
        const txCount = await this.prisma.transaction.count({
            where: {
                OR: [
                    { walletId: id },
                    { fromWalletId: id },
                    { toWalletId: id },
                ],
            },
        });
        if (txCount > 0) {
            throw new common_1.BadRequestException('Cannot delete a wallet that has transactions. Archive it instead.');
        }
        await this.prisma.wallet.delete({ where: { id } });
    }
    async verifyAccountOwnership(accountId, userId) {
        const account = await this.prisma.account.findUnique({ where: { id: accountId } });
        if (!account)
            throw new common_1.NotFoundException('Account not found');
        if (account.userId !== userId)
            throw new common_1.ForbiddenException('Access denied');
    }
};
exports.WalletsService = WalletsService;
exports.WalletsService = WalletsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], WalletsService);
//# sourceMappingURL=wallets.service.js.map