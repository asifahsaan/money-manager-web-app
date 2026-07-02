import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Query,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryType } from '@prisma/client';

@UseGuards(JwtAuthGuard)
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  findAll(
    @Query('accountId', ParseIntPipe) accountId: number,
    @Query('type') type: string | undefined,
    @CurrentUser() user: JwtUser,
  ) {
    const categoryType =
      type === 'INCOME' || type === 'EXPENSE' ? (type as CategoryType) : undefined;
    return this.categoriesService.findAll(accountId, user.sub, categoryType);
  }

  @Post()
  create(@Body() dto: CreateCategoryDto, @CurrentUser() user: JwtUser) {
    return this.categoriesService.create(user.sub, dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCategoryDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.categoriesService.update(id, user.sub, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: JwtUser) {
    await this.categoriesService.delete(id, user.sub);
    return { deleted: true };
  }
}
