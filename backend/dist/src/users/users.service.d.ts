import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';
export declare class UsersService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findById(id: number): Promise<User | null>;
    updateProfile(id: number, data: {
        name?: string;
    }): Promise<Omit<User, 'passwordHash'>>;
    changePassword(id: number, currentPassword: string, newPassword: string): Promise<void>;
    changeEmail(id: number, newEmail: string, password: string): Promise<Omit<User, 'passwordHash'>>;
    findByEmail(email: string): Promise<User | null>;
    create(data: {
        name: string;
        email: string;
        passwordHash: string;
        defaultCurrency?: string;
    }): Promise<User>;
    sanitize(user: User): Omit<User, 'passwordHash'>;
}
