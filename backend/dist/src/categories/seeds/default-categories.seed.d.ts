import { CategoryType } from '@prisma/client';
export interface CategorySeed {
    name: string;
    type: CategoryType;
    icon: string;
    color: string;
    isDefault: boolean;
    sortOrder: number;
}
export declare const DEFAULT_INCOME_CATEGORIES: CategorySeed[];
export declare const DEFAULT_EXPENSE_CATEGORIES: CategorySeed[];
export declare const ALL_DEFAULT_CATEGORIES: CategorySeed[];
