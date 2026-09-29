import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { StatementsService } from './statements.service';
import { StatementQueryDto } from './dto/statement-query.dto';

@UseGuards(JwtAuthGuard)
@Controller('statements')
export class StatementsController {
  constructor(private readonly statementsService: StatementsService) {}

  @Get()
  get(@Query() query: StatementQueryDto, @CurrentUser() user: JwtUser) {
    return this.statementsService.getStatement(user.sub, query);
  }
}
