import { JwtUser } from '../common/decorators/current-user.decorator';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
export declare class CategoriesController {
    private readonly categoriesService;
    constructor(categoriesService: CategoriesService);
    findAll(accountId: number, type: string | undefined, user: JwtUser): Promise<({
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
    create(dto: CreateCategoryDto, user: JwtUser): Promise<{
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
    }>;
    update(id: number, dto: UpdateCategoryDto, user: JwtUser): Promise<{
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
    }>;
    delete(id: number, user: JwtUser): Promise<{
        deleted: boolean;
    }>;
}
