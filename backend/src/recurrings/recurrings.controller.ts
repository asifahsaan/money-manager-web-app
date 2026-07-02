import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, ParseIntPipe,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { RecurringsService } from './recurrings.service';
import { CreateRecurringDto } from './dto/create-recurring.dto';
import { UpdateRecurringDto } from './dto/update-recurring.dto';

@UseGuards(JwtAuthGuard)
@Controller('recurrings')
export class RecurringsController {
  constructor(private readonly recurringsService: RecurringsService) {}

  @Get()
  findAll(@Query('accountId', ParseIntPipe) accountId: number, @CurrentUser() user: JwtUser) {
    return this.recurringsService.findAll(accountId, user.sub);
  }

  @Post()
  create(@Body() dto: CreateRecurringDto, @CurrentUser() user: JwtUser) {
    return this.recurringsService.create(user.sub, dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRecurringDto, @CurrentUser() user: JwtUser) {
    return this.recurringsService.update(id, user.sub, dto);
  }

  @Post(':id/execute')
  execute(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: JwtUser) {
    return this.recurringsService.execute(id, user.sub);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: JwtUser) {
    await this.recurringsService.delete(id, user.sub);
    return { deleted: true };
  }
}
