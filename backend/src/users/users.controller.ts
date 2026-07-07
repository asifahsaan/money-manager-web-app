import { Controller, Patch, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ChangeEmailDto } from './dto/change-email.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('me')
  updateProfile(@Body() dto: UpdateProfileDto, @CurrentUser() user: JwtUser) {
    return this.usersService.updateProfile(user.sub, dto);
  }

  @Post('me/change-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  changePassword(@Body() dto: ChangePasswordDto, @CurrentUser() user: JwtUser) {
    return this.usersService.changePassword(user.sub, dto.currentPassword, dto.newPassword);
  }

  @Post('me/change-email')
  changeEmail(@Body() dto: ChangeEmailDto, @CurrentUser() user: JwtUser) {
    return this.usersService.changeEmail(user.sub, dto.newEmail, dto.password);
  }
}
