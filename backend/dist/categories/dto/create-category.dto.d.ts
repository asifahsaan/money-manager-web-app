import { CategoryType } from '@prisma/client';
export declare class CreateCategoryDto {
    accountId: number;
    name: string;
    type: CategoryType;
    icon?: string;
    color?: string;
    parentCategoryId?: number;
    description?: string;
}
