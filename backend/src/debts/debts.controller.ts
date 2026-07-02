import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, ParseIntPipe,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { DebtsService } from './debts.service';
import { CreateDebtDto } from './dto/create-debt.dto';
import { UpdateDebtDto } from './dto/update-debt.dto';
import { DebtPaymentDto } from './dto/debt-payment.dto';

@UseGuards(JwtAuthGuard)
@Controller('debts')
export class DebtsController {
  constructor(private readonly debtsService: DebtsService) {}

  @Get()
  findAll(@Query('accountId', ParseIntPipe) accountId: number, @CurrentUser() user: JwtUser) {
    return this.debtsService.findAll(accountId, user.sub);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: JwtUser) {
    return this.debtsService.findOne(id, user.sub);
  }

  @Post()
  create(@Body() dto: CreateDebtDto, @CurrentUser() user: JwtUser) {
    return this.debtsService.create(user.sub, dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDebtDto, @CurrentUser() user: JwtUser) {
    return this.debtsService.update(id, user.sub, dto);
  }

  @Post(':id/pay')
  pay(@Param('id', ParseIntPipe) id: number, @Body() dto: DebtPaymentDto, @CurrentUser() user: JwtUser) {
    return this.debtsService.pay(id, user.sub, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: JwtUser) {
    await this.debtsService.delete(id, user.sub);
    return { deleted: true };
  }
}
