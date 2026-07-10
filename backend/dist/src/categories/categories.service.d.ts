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
            id: number;
            accountId: number;
            type: import(".prisma/client").$Enums.CategoryType;
            description: string | null;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            icon: string | null;
            color: string | null;
            parentCategoryId: number | null;
            sortOrder: number;
            isDefault: boolean;
        }[];
    } & {
        id: number;
        accountId: number;
        type: import(".prisma/client").$Enums.CategoryType;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        icon: string | null;
        color: string | null;
        parentCategoryId: number | null;
        sortOrder: number;
        isDefault: boolean;
    })[]>;
    create(userId: number, dto: CreateCategoryDto): Promise<Category>;
    update(id: number, userId: number, dto: UpdateCategoryDto): Promise<Category>;
    delete(id: number, userId: number): Promise<void>;
    private findCategoryAndVerify;
    private verifyAccountOwnership;
}
