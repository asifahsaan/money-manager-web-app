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
exports.RecurringsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const recurrings_service_1 = require("./recurrings.service");
const create_recurring_dto_1 = require("./dto/create-recurring.dto");
const update_recurring_dto_1 = require("./dto/update-recurring.dto");
let RecurringsController = class RecurringsController {
    constructor(recurringsService) {
        this.recurringsService = recurringsService;
    }
    findAll(accountId, user) {
        return this.recurringsService.findAll(accountId, user.sub);
    }
    create(dto, user) {
        return this.recurringsService.create(user.sub, dto);
    }
    update(id, dto, user) {
        return this.recurringsService.update(id, user.sub, dto);
    }
    execute(id, user) {
        return this.recurringsService.execute(id, user.sub);
    }
    async delete(id, user) {
        await this.recurringsService.delete(id, user.sub);
        return { deleted: true };
    }
};
exports.RecurringsController = RecurringsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('accountId', common_1.ParseIntPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], RecurringsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_recurring_dto_1.CreateRecurringDto, Object]),
    __metadata("design:returntype", void 0)
], RecurringsController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, update_recurring_dto_1.UpdateRecurringDto, Object]),
    __metadata("design:returntype", void 0)
], RecurringsController.prototype, "update", null);
__decorate([
    (0, common_1.Post)(':id/execute'),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", void 0)
], RecurringsController.prototype, "execute", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Object]),
    __metadata("design:returntype", Promise)
], RecurringsController.prototype, "delete", null);
exports.RecurringsController = RecurringsController = __decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('recurrings'),
    __metadata("design:paramtypes", [recurrings_service_1.RecurringsService])
], RecurringsController);
//# sourceMappingURL=recurrings.controller.js.map