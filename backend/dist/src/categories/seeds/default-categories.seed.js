"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALL_DEFAULT_CATEGORIES = exports.DEFAULT_EXPENSE_CATEGORIES = exports.DEFAULT_INCOME_CATEGORIES = void 0;
exports.DEFAULT_INCOME_CATEGORIES = [
    { name: 'Salary', type: 'INCOME', icon: 'wallet-2', color: '#8B5CF6', isDefault: true, sortOrder: 1 },
    { name: 'Tips', type: 'INCOME', icon: 'lightbulb', color: '#7C3AED', isDefault: true, sortOrder: 2 },
    { name: 'Bonus', type: 'INCOME', icon: 'gift', color: '#EC4899', isDefault: true, sortOrder: 3 },
    { name: 'Allowance', type: 'INCOME', icon: 'banknote', color: '#3B82F6', isDefault: true, sortOrder: 4 },
    { name: 'Investment', type: 'INCOME', icon: 'trending-up', color: '#10B981', isDefault: true, sortOrder: 5 },
    { name: 'Award', type: 'INCOME', icon: 'award', color: '#F59E0B', isDefault: true, sortOrder: 6 },
    { name: 'Dividend', type: 'INCOME', icon: 'bar-chart-2', color: '#14B8A6', isDefault: true, sortOrder: 7 },
    { name: 'Lottery', type: 'INCOME', icon: 'star', color: '#EF4444', isDefault: true, sortOrder: 8 },
    { name: 'Debt collection', type: 'INCOME', icon: 'hand-coins', color: '#3B82F6', isDefault: true, sortOrder: 9 },
    { name: 'Others', type: 'INCOME', icon: 'grid-2x2', color: '#6B7280', isDefault: true, sortOrder: 10 },
];
exports.DEFAULT_EXPENSE_CATEGORIES = [
    { name: 'Transportation', type: 'EXPENSE', icon: 'bus', color: '#F97316', isDefault: true, sortOrder: 1 },
    { name: 'Food', type: 'EXPENSE', icon: 'utensils', color: '#EAB308', isDefault: true, sortOrder: 2 },
    { name: 'Bills/Net payment', type: 'EXPENSE', icon: 'zap', color: '#3B82F6', isDefault: true, sortOrder: 3 },
    { name: 'Home expenses', type: 'EXPENSE', icon: 'home', color: '#10B981', isDefault: true, sortOrder: 4 },
    { name: 'Shopping', type: 'EXPENSE', icon: 'shopping-cart', color: '#8B5CF6', isDefault: true, sortOrder: 5 },
    { name: 'Loan', type: 'EXPENSE', icon: 'credit-card', color: '#EF4444', isDefault: true, sortOrder: 6 },
    { name: 'Clothing', type: 'EXPENSE', icon: 'shirt', color: '#06B6D4', isDefault: true, sortOrder: 7 },
    { name: 'Education', type: 'EXPENSE', icon: 'graduation-cap', color: '#3B82F6', isDefault: true, sortOrder: 8 },
    { name: 'Entertainment', type: 'EXPENSE', icon: 'gamepad-2', color: '#EC4899', isDefault: true, sortOrder: 9 },
    { name: 'Fitness', type: 'EXPENSE', icon: 'dumbbell', color: '#10B981', isDefault: true, sortOrder: 10 },
    { name: 'Gifts', type: 'EXPENSE', icon: 'gift', color: '#F59E0B', isDefault: true, sortOrder: 11 },
    { name: 'Health', type: 'EXPENSE', icon: 'heart-pulse', color: '#EF4444', isDefault: true, sortOrder: 12 },
    { name: 'Furniture', type: 'EXPENSE', icon: 'sofa', color: '#8B5CF6', isDefault: true, sortOrder: 13 },
    { name: 'Others', type: 'EXPENSE', icon: 'grid-2x2', color: '#6B7280', isDefault: true, sortOrder: 14 },
];
exports.ALL_DEFAULT_CATEGORIES = [
    ...exports.DEFAULT_INCOME_CATEGORIES,
    ...exports.DEFAULT_EXPENSE_CATEGORIES,
];
//# sourceMappingURL=default-categories.seed.js.map