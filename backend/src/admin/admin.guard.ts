import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const userId = req.user?.sub ?? req.user?.userId;
    if (!userId) throw new ForbiddenException('Not authenticated');

    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true, isActive: true } });
    if (!user || !user.isActive) throw new ForbiddenException('Account inactive');
    if (user.role !== 'ADMIN' && user.role !== 'SUPERADMIN') throw new ForbiddenException('Admin access required');

    req.userRole = user.role;
    return true;
  }
}
