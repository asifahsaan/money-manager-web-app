import { Module } from '@nestjs/common';
import { RecurringsController } from './recurrings.controller';
import { RecurringsService } from './recurrings.service';

@Module({
  controllers: [RecurringsController],
  providers: [RecurringsService],
})
export class RecurringsModule {}
