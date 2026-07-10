import { JwtUser } from '../common/decorators/current-user.decorator';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
export declare class CategoriesController {
    private readonly categoriesService;
    constructor(categoriesService: CategoriesService);
    findAll(accountId: number, type: string | undefined, user: JwtUser): Promise<({
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
    create(dto: CreateCategoryDto, user: JwtUser): Promise<{
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
    }>;
    update(id: number, dto: UpdateCategoryDto, user: JwtUser): Promise<{
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
    }>;
    delete(id: number, user: JwtUser): Promise<{
        deleted: boolean;
    }>;
}
