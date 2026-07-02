import { Controller, Get, Query, ParseIntPipe, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { StatisticsService } from './statistics.service';
import { IsDateString, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

class SummaryQueryDto {
  @IsInt()
  @Type(() => Number)
  accountId: number;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}

class TrendQueryDto {
  @IsInt()
  @Type(() => Number)
  accountId: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(24)
  @Type(() => Number)
  months?: number;
}

@UseGuards(JwtAuthGuard)
@Controller('statistics')
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get('summary')
  getSummary(@Query() query: SummaryQueryDto, @CurrentUser() user: JwtUser) {
    return this.statisticsService.getSummary(
      user.sub,
      query.accountId,
      query.startDate,
      query.endDate,
    );
  }

  @Get('trend')
  getTrend(@Query() query: TrendQueryDto, @CurrentUser() user: JwtUser) {
    return this.statisticsService.getTrend(user.sub, query.accountId, query.months ?? 6);
  }
}
