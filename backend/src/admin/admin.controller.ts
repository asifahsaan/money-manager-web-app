import { Controller, Get, Patch, Delete, Param, Query, Body, UseGuards, ParseIntPipe, Request } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from './admin.guard';
import { SuperAdminGuard } from './superadmin.guard';
import { UserRole } from '@prisma/client';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  getStats() {
    return this.adminService.getStats();
  }

  @Get('users')
  getUsers(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getUsers(search, Number(page ?? 1), Number(limit ?? 20));
  }

  @Get('users/:id')
  getUser(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.getUser(id);
  }

  @Patch('users/:id')
  updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { role?: UserRole; isActive?: boolean; name?: string },
  ) {
    return this.adminService.updateUser(id, body);
  }

  @Delete('users/:id')
  @UseGuards(SuperAdminGuard)
  deleteUser(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.deleteUser(id);
  }

  // SuperAdmin-only BI reports
  @Get('reports/growth')
  @UseGuards(SuperAdminGuard)
  getUserGrowth(@Query('months') months?: string) {
    return this.adminService.getUserGrowth(Number(months ?? 12));
  }

  @Get('reports/transactions')
  @UseGuards(SuperAdminGuard)
  getTransactionTrend(@Query('months') months?: string) {
    return this.adminService.getTransactionTrend(Number(months ?? 6));
  }

  @Get('reports/categories')
  @UseGuards(SuperAdminGuard)
  getTopCategories(@Query('limit') limit?: string) {
    return this.adminService.getTopCategories(Number(limit ?? 10));
  }
}
