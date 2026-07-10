import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Category, CategoryType } from '@prisma/client';
export declare class CategoriesService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    seedDefaultCategories(accountId: number): Promise<void>;
    findAll(accountId: number, userId: number, type?: CategoryType): Promise<({
        children: {
            name: string;
            id: number;
            createdAt: Date;
            updatedAt: Date;
            accountId: number;
            type: import(".prisma/client").$Enums.CategoryType;
            icon: string | null;
            color: string | null;
            parentCategoryId: number | null;
            description: string | null;
            sortOrder: number;
            isDefault: boolean;
        }[];
    } & {
        name: string;
        id: number;
        createdAt: Date;
        updatedAt: Date;
        accountId: number;
        type: import(".prisma/client").$Enums.CategoryType;
        icon: string | null;
        color: string | null;
        parentCategoryId: number | null;
        description: string | null;
        sortOrder: number;
        isDefault: boolean;
    })[]>;
    create(userId: number, dto: CreateCategoryDto): Promise<Category>;
    update(id: number, userId: number, dto: UpdateCategoryDto): Promise<Category>;
    delete(id: number, userId: number): Promise<void>;
    private findCategoryAndVerify;
    private verifyAccountOwnership;
}
