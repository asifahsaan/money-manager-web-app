import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { auditMiddleware } from '../audit/audit-middleware';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    this.$use(auditMiddleware);
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
