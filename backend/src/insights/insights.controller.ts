import { Controller, Get, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { TransactionType } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { InsightsService } from './insights.service';

@UseGuards(JwtAuthGuard)
@Controller('insights')
export class InsightsController {
  constructor(private readonly insights: InsightsService) {}

  /** Month-end balance forecast per wallet. */
  @Get('forecast')
  forecast(@Query('accountId', ParseIntPipe) accountId: number, @CurrentUser() user: JwtUser) {
    return this.insights.forecast(accountId, user.sub);
  }

  /** Past entries matching a note, to fill category/wallet/amount. */
  @Get('suggestions')
  suggestions(
    @Query('accountId', ParseIntPipe) accountId: number,
    @Query('q') q: string | undefined,
    @Query('type') type: string | undefined,
    @CurrentUser() user: JwtUser,
  ) {
    const t = type === 'INCOME' || type === 'EXPENSE' ? (type as TransactionType) : undefined;
    return this.insights.suggestions(accountId, user.sub, (q ?? '').slice(0, 100), t);
  }
}
