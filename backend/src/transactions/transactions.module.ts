import { Module } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';
import { AttachmentsService } from './attachments.service';
import { AttachmentsController } from './attachments.controller';

@Module({
  controllers: [TransactionsController, AttachmentsController],
  providers: [TransactionsService, AttachmentsService],
})
export class TransactionsModule {}
