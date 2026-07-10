import { CanActivate, ExecutionContext } from '@nestjs/common';
export declare class SuperAdminGuard implements CanActivate {
    canActivate(ctx: ExecutionContext): boolean;
}
