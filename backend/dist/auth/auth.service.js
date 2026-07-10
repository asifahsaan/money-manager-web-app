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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = require("bcrypt");
const users_service_1 = require("../users/users.service");
const accounts_service_1 = require("../accounts/accounts.service");
const SALT_ROUNDS = 10;
let AuthService = class AuthService {
    constructor(usersService, accountsService, jwtService) {
        this.usersService = usersService;
        this.accountsService = accountsService;
        this.jwtService = jwtService;
    }
    async register(dto) {
        const existing = await this.usersService.findByEmail(dto.email);
        if (existing) {
            throw new common_1.ConflictException('Email is already registered');
        }
        const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
        const user = await this.usersService.create({
            name: dto.name,
            email: dto.email,
            passwordHash,
        });
        const account = await this.accountsService.createDefault(user.id, dto.name);
        const token = this.signToken(user.id, user.email, user.name);
        return {
            success: true,
            data: {
                token,
                user: this.usersService.sanitize(user),
                defaultAccountId: account.id,
            },
            message: 'Registration successful',
        };
    }
    async login(dto) {
        const user = await this.usersService.findByEmail(dto.email);
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid email or password');
        }
        const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
        if (!passwordMatches) {
            throw new common_1.UnauthorizedException('Invalid email or password');
        }
        const token = this.signToken(user.id, user.email, user.name);
        return {
            success: true,
            data: {
                token,
                user: this.usersService.sanitize(user),
            },
            message: 'Login successful',
        };
    }
    async me(userId) {
        const user = await this.usersService.findById(userId);
        if (!user) {
            throw new common_1.UnauthorizedException('User not found');
        }
        return this.usersService.sanitize(user);
    }
    signToken(userId, email, name) {
        const payload = { sub: userId, email, name };
        return this.jwtService.sign(payload);
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        accounts_service_1.AccountsService,
        jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map