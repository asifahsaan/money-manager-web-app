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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const bcrypt = require("bcrypt");
const prisma_service_1 = require("../prisma/prisma.service");
const SALT_ROUNDS = 10;
let UsersService = class UsersService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findById(id) {
        return this.prisma.user.findUnique({ where: { id } });
    }
    async updateProfile(id, data) {
        const user = await this.prisma.user.update({
            where: { id },
            data: { ...(data.name !== undefined && { name: data.name }) },
        });
        return this.sanitize(user);
    }
    async changePassword(id, currentPassword, newPassword) {
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        const matches = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!matches)
            throw new common_1.BadRequestException('Current password is incorrect');
        const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
        await this.prisma.user.update({ where: { id }, data: { passwordHash } });
    }
    async changeEmail(id, newEmail, password) {
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        const matches = await bcrypt.compare(password, user.passwordHash);
        if (!matches)
            throw new common_1.BadRequestException('Password is incorrect');
        const existing = await this.prisma.user.findUnique({ where: { email: newEmail } });
        if (existing)
            throw new common_1.BadRequestException('Email is already in use');
        const updated = await this.prisma.user.update({ where: { id }, data: { email: newEmail } });
        return this.sanitize(updated);
    }
    async findByEmail(email) {
        return this.prisma.user.findUnique({ where: { email } });
    }
    async create(data) {
        return this.prisma.user.create({ data });
    }
    sanitize(user) {
        const { passwordHash: _pw, ...safe } = user;
        return safe;
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map