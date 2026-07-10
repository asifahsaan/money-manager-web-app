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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DebtsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const debts_service_1 = require("./debts.service");
const create_debt_dto_1 = require("./dto/create-debt.dto");
const update_debt_dto_1 = require("./dto/update-debt.dto");
const update_debt_entry_dto_1 = require("./dto/update-debt-entry.dto");
const debt_payment_dto_1 = require("./dto/debt-payment.dto");
let DebtsController = class DebtsController {
    constructor(debtsService) {
        this.debtsService = debtsService;
    }
    findAll(accountId, user) {
        return this.debtsService.findAll(accountId, user.sub);
    }
    findOne(id, user) {
        return this.debtsService.findOne(id, user.sub);
    }
    create(dto, user) {
        return this.debtsService.create(user.sub, dto);
    }
    update(id, dto, user) {
        return this.debtsService.update(id, user.sub, dto);
    }
    pay(id, dto, user) {
        return this.debtsService.pay(id, user.sub, dto);
    }
    updateEntry(id, entryId, dto, user) {
        return this.debtsService.updateEntry(id, entryId, user.sub, dto);
    }
    async delete(id, user) {
        await this.debtsService.delete(id, user.sub);
        return { deleted: true };
    }
};
exports.DebtsController = DebtsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('accountId', common_1.ParseIntPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], DebtsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], DebtsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_debt_dto_1.CreateDebtDto, Object]),
    __metadata("design:returntype", void 0)
], DebtsController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, update_debt_dto_1.UpdateDebtDto, Object]),
    __metadata("design:returntype", void 0)
], DebtsController.prototype, "update", null);
__decorate([
    (0, common_1.Post)(':id/pay'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, debt_payment_dto_1.DebtPaymentDto, Object]),
    __metadata("design:returntype", void 0)
], DebtsController.prototype, "pay", null);
__decorate([
    (0, common_1.Patch)(':id/entries/:entryId'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Param)('entryId', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, update_debt_entry_dto_1.UpdateDebtEntryDto, Object]),
    __metadata("design:returntype", void 0)
], DebtsController.prototype, "updateEntry", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], DebtsController.prototype, "delete", null);
exports.DebtsController = DebtsController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('debts'),
    __metadata("design:paramtypes", [debts_service_1.DebtsService])
], DebtsController);
//# sourceMappingURL=debts.controller.js.map