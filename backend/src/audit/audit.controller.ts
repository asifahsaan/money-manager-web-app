import { Controller, DefaultValuePipe, Get, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { TRACKED_MODELS } from './audit-middleware';
import { AuditService } from './audit.service';

const ACTIONS = new Set(['created', 'updated', 'deleted']);

@UseGuards(JwtAuthGuard)
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  /** Every change on the account, newest first: what, when, before and after. */
  @Get()
  list(
    @Query('accountId', ParseIntPipe) accountId: number,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(25), ParseIntPipe) limit: number,
    @Query('entity') entity: string | undefined,
    @Query('action') action: string | undefined,
    @CurrentUser() user: JwtUser,
  ) {
    return this.audit.list(user.sub, {
      accountId,
      page: Math.max(1, page),
      limit: Math.min(100, Math.max(1, limit)),
      entity: entity && TRACKED_MODELS.has(entity) ? entity : undefined,
      action: action && ACTIONS.has(action) ? action : undefined,
    });
  }
}
