"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const debtTxs = await prisma.transaction.findMany({
        where: { debtId: { not: null }, categoryId: null },
        select: { id: true, type: true, accountId: true },
    });
    if (debtTxs.length === 0) {
        console.log('No uncategorized debt transactions found.');
        return;
    }
    console.log(`Found ${debtTxs.length} uncategorized debt transactions. Updating...`);
    const categoryCache = new Map();
    async function getCategoryId(accountId, name) {
        const key = `${accountId}:${name}`;
        if (categoryCache.has(key))
            return categoryCache.get(key);
        const cat = await prisma.category.findFirst({ where: { accountId, name } });
        categoryCache.set(key, cat?.id ?? null);
        return cat?.id ?? null;
    }
    let updated = 0;
    let skipped = 0;
    for (const tx of debtTxs) {
        const categoryName = tx.type === 'INCOME' ? 'Debt collection' : 'Loan';
        const categoryId = await getCategoryId(tx.accountId, categoryName);
        if (!categoryId) {
            console.warn(`  ⚠ No "${categoryName}" category for accountId=${tx.accountId} — skipping tx ${tx.id}`);
            skipped++;
            continue;
        }
        await prisma.transaction.update({ where: { id: tx.id }, data: { categoryId } });
        console.log(`  ✓ tx ${tx.id} → ${categoryName} (categoryId=${categoryId})`);
        updated++;
    }
    console.log(`\nDone. Updated: ${updated}, Skipped: ${skipped}`);
}
main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=backfill-debt-categories.js.map