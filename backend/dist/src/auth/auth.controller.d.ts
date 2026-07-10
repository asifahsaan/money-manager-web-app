import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtUser } from '../common/decorators/current-user.decorator';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    register(dto: RegisterDto): Promise<{
        success: boolean;
        data: {
            token: string;
            user: Omit<{
                id: number;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                email: string;
                passwordHash: string;
                defaultCurrency: string;
                role: import(".prisma/client").$Enums.UserRole;
                isActive: boolean;
            }, "passwordHash">;
            defaultAccountId: number;
        };
        message: string;
    }>;
    login(dto: LoginDto): Promise<{
        success: boolean;
        data: {
            token: string;
            user: Omit<{
                id: number;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                email: string;
                passwordHash: string;
                defaultCurrency: string;
                role: import(".prisma/client").$Enums.UserRole;
                isActive: boolean;
            }, "passwordHash">;
        };
        message: string;
    }>;
    me(user: JwtUser): Promise<Omit<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        email: string;
        passwordHash: string;
        defaultCurrency: string;
        role: import(".prisma/client").$Enums.UserRole;
        isActive: boolean;
    }, "passwordHash">>;
}
