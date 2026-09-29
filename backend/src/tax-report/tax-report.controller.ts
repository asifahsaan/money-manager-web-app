import { Body, Controller, Get, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { TaxReportService } from './tax-report.service';
import { SaveTaxMappingDto, TaxMappingQueryDto, TaxReportQueryDto } from './dto/tax-report.dto';

@UseGuards(JwtAuthGuard)
@Controller('tax-report')
export class TaxReportController {
  constructor(private readonly taxReportService: TaxReportService) {}

  @Get()
  get(@Query() q: TaxReportQueryDto, @CurrentUser() user: JwtUser) {
    return this.taxReportService.getReport(user.sub, q.accountId, q.period, q.year);
  }

  @Get('mapping')
  mapping(@Query() q: TaxMappingQueryDto, @CurrentUser() user: JwtUser) {
    return this.taxReportService.getMapping(user.sub, q.accountId);
  }

  @Put('mapping')
  saveMapping(@Body() dto: SaveTaxMappingDto, @CurrentUser() user: JwtUser) {
    return this.taxReportService.saveMapping(user.sub, dto.accountId, dto.heads);
  }
}
