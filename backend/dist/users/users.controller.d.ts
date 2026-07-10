import { JwtUser } from '../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ChangeEmailDto } from './dto/change-email.dto';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    updateProfile(dto: UpdateProfileDto, user: JwtUser): Promise<Omit<{
        name: string;
        id: number;
        email: string;
        passwordHash: string;
        defaultCurrency: string;
        role: import(".prisma/client").$Enums.UserRole;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    }, "passwordHash">>;
    changePassword(dto: ChangePasswordDto, user: JwtUser): Promise<void>;
    changeEmail(dto: ChangeEmailDto, user: JwtUser): Promise<Omit<{
        name: string;
        id: number;
        email: string;
        passwordHash: string;
        defaultCurrency: string;
        role: import(".prisma/client").$Enums.UserRole;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    }, "passwordHash">>;
}
