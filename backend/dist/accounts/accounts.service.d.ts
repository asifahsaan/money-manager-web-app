import { PrismaService } from '../prisma/prisma.service';
import { CategoriesService } from '../categories/categories.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { Account } from '@prisma/client';
export declare class AccountsService {
    private readonly prisma;
    private readonly categoriesService;
    constructor(prisma: PrismaService, categoriesService: CategoriesService);
    findAllByUser(userId: number): Promise<Account[]>;
    findOne(id: number, userId: number): Promise<Account>;
    create(userId: number, dto: CreateAccountDto): Promise<Account>;
    createDefault(userId: number, name: string): Promise<Account>;
    update(id: number, userId: number, dto: UpdateAccountDto): Promise<Account>;
    delete(id: number, userId: number): Promise<void>;
}
