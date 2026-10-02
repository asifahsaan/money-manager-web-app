// Wallets whose initial balance was edited before the fix in WalletsService.update
// have the amount in currentBalance but no "Opening Balance" transaction, so
// balances rebuilt from transactions (statements, tax report) come out short.
//
//   npm run repair:opening-balances            dry run — shows what it would do
//   npm run repair:opening-balances -- --apply  creates the missing transactions
//
// Only touches a wallet when the gap between its stored balance and its
// transactions is exactly its initial balance, so nothing else is papered over.
import { Prisma, PrismaClient, TransactionType } from '@prisma/client';

const prisma = new PrismaClient();
const apply = process.argv.includes('--apply');

async function main() {
  const wallets = await prisma.wallet.findMany({ where: { initialBalance: { gt: 0 } } });
  let fixed = 0;
  for (const w of wallets) {
    const hasOpening = await prisma.transaction.count({ where: { walletId: w.id, isOpeningBalance: true } });
    if (hasOpening) continue;

    const txs = await prisma.transaction.findMany({
      where: { OR: [{ walletId: w.id }, { fromWalletId: w.id }, { toWalletId: w.id }] },
    });
    const rebuilt = txs.reduce((sum, t) => {
      if (t.type === TransactionType.INCOME && t.walletId === w.id) return sum.plus(t.amount);
      if (t.type === TransactionType.EXPENSE && t.walletId === w.id) return sum.minus(t.amount);
      let s = sum;
      if (t.fromWalletId === w.id) s = s.minus(t.amount).minus(t.feeAmount);
      if (t.toWalletId === w.id) s = s.plus(t.amount);
      return s;
    }, new Prisma.Decimal(0));
    const gap = new Prisma.Decimal(w.currentBalance).minus(rebuilt);
    const matches = gap.equals(w.initialBalance);

    console.log(
      `${matches ? 'FIX ' : 'SKIP'} wallet #${w.id} "${w.name}": stored ${w.currentBalance}, rebuilt ${rebuilt}, ` +
        `gap ${gap}, initial ${w.initialBalance}${matches ? '' : ' (gap ≠ initial balance — check manually)'}`,
    );
    if (!matches || !apply) continue;

    const c = w.createdAt;
    await prisma.transaction.create({
      data: {
        accountId: w.accountId,
        type: TransactionType.INCOME,
        amount: w.initialBalance,
        date: new Date(Date.UTC(c.getUTCFullYear(), c.getUTCMonth(), c.getUTCDate())),
        datetime: c,
        description: 'Opening Balance',
        isOpeningBalance: true,
        walletId: w.id,
      },
    });
    fixed++;
  }
  console.log(apply ? `\nCreated ${fixed} opening-balance transaction(s).` : '\nDry run — re-run with --apply to write.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
