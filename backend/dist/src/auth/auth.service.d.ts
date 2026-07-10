import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { AccountsService } from '../accounts/accounts.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
export declare class AuthService {
    private readonly usersService;
    private readonly accountsService;
    private readonly jwtService;
    constructor(usersService: UsersService, accountsService: AccountsService, jwtService: JwtService);
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
    me(userId: number): Promise<Omit<{
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
    private signToken;
}
