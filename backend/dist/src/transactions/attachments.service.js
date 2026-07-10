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
exports.AttachmentsService = void 0;
const common_1 = require("@nestjs/common");
const promises_1 = require("fs/promises");
const path_1 = require("path");
const prisma_service_1 = require("../prisma/prisma.service");
let AttachmentsService = class AttachmentsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(transactionId, userId) {
        await this.verifyTransactionOwnership(transactionId, userId);
        return this.prisma.transactionAttachment.findMany({
            where: { transactionId },
            orderBy: { createdAt: 'desc' },
        });
    }
    async create(transactionId, userId, data) {
        await this.verifyTransactionOwnership(transactionId, userId);
        return this.prisma.transactionAttachment.create({
            data: { transactionId, ...data },
        });
    }
    async delete(transactionId, attachmentId, userId) {
        await this.verifyTransactionOwnership(transactionId, userId);
        const attachment = await this.prisma.transactionAttachment.findUnique({
            where: { id: attachmentId },
        });
        if (!attachment || attachment.transactionId !== transactionId) {
            throw new common_1.NotFoundException('Attachment not found');
        }
        await this.prisma.transactionAttachment.delete({ where: { id: attachmentId } });
        const filePath = (0, path_1.join)(process.cwd(), attachment.fileUrl.replace(/^\//, ''));
        await (0, promises_1.unlink)(filePath).catch(() => undefined);
    }
    async verifyTransactionOwnership(transactionId, userId) {
        const tx = await this.prisma.transaction.findUnique({
            where: { id: transactionId },
            include: { account: true },
        });
        if (!tx)
            throw new common_1.NotFoundException('Transaction not found');
        if (tx.account.userId !== userId)
            throw new common_1.ForbiddenException('Access denied');
    }
};
exports.AttachmentsService = AttachmentsService;
exports.AttachmentsService = AttachmentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AttachmentsService);
//# sourceMappingURL=attachments.service.js.map