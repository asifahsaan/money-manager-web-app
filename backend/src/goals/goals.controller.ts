import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, ParseIntPipe,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { GoalsService } from './goals.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { GoalEntryDto } from './dto/goal-entry.dto';

@UseGuards(JwtAuthGuard)
@Controller('goals')
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Get()
  findAll(@Query('accountId', ParseIntPipe) accountId: number, @CurrentUser() user: JwtUser) {
    return this.goalsService.findAll(accountId, user.sub);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: JwtUser) {
    return this.goalsService.findOne(id, user.sub);
  }

  @Post()
  create(@Body() dto: CreateGoalDto, @CurrentUser() user: JwtUser) {
    return this.goalsService.create(user.sub, dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateGoalDto, @CurrentUser() user: JwtUser) {
    return this.goalsService.update(id, user.sub, dto);
  }

  @Post(':id/deposit')
  deposit(@Param('id', ParseIntPipe) id: number, @Body() dto: GoalEntryDto, @CurrentUser() user: JwtUser) {
    return this.goalsService.deposit(id, user.sub, dto);
  }

  @Post(':id/withdraw')
  withdraw(@Param('id', ParseIntPipe) id: number, @Body() dto: GoalEntryDto, @CurrentUser() user: JwtUser) {
    return this.goalsService.withdraw(id, user.sub, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: JwtUser) {
    await this.goalsService.delete(id, user.sub);
    return { deleted: true };
  }
}
