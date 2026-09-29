import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TransactionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { assertWalletsInAccount } from '../common/utils/ownership';
import { StatementQueryDto } from './dto/statement-query.dto';

const D = Prisma.Decimal;
type Decimal = Prisma.Decimal;

export interface StatementRow {
  id: number;
  date: string; // YYYY-MM-DD
  time: string | null;
  description: string;
  category: string | null;
  wallet: string;
  type: TransactionType;
  debit: string; // money out, "0.00" when none
  credit: string; // money in
  balance: string; // running balance after this row
}

export interface Statement {
  accountName: string;
  currency: string;
  holderName: string;
  holderEmail: string;
  scope: { walletId: number | null; label: string; wallets: string[] };
  period: { startDate: string; endDate: string };
  openingBalance: string;
  totalDebit: string;
  totalCredit: string;
  closingBalance: string;
  rows: StatementRow[];
  generatedAt: string;
}

const TX_SELECT = {
  id: true,
  type: true,
  amount: true,
  feeAmount: true,
  date: true,
  time: true,
  description: true,
  isOpeningBalance: true,
  walletId: true,
  fromWalletId: true,
  toWalletId: true,
  category: { select: { name: true, parent: { select: { name: true } } } },
} satisfies Prisma.TransactionSelect;

type StatementTx = Prisma.TransactionGetPayload<{ select: typeof TX_SELECT }>;

@Injectable()
export class StatementsService {
  constructor(private readonly prisma: PrismaService) {}

  // Bank-style statement: every movement of money in or out of the selected
  // wallet(s) between two dates, with opening, running and closing balances.
  // Balances are rebuilt from transactions (not wallet.currentBalance) so the
  // statement always reconciles with its own rows.
  async getStatement(userId: number, q: StatementQueryDto): Promise<Statement> {
    if (q.startDate > q.endDate) throw new BadRequestException('startDate must be on or before endDate');

    const account = await this.prisma.account.findUnique({
      where: { id: q.accountId },
      include: { user: { select: { name: true, email: true } } },
    });
    if (!account) throw new NotFoundException('Account not found');
    if (account.userId !== userId) throw new ForbiddenException('Access denied');
    if (q.walletId) await assertWalletsInAccount(this.prisma, q.accountId, q.walletId);

    // A single wallet, or every wallet counted in the account total
    const wallets = await this.prisma.wallet.findMany({
      where: q.walletId ? { id: q.walletId } : { accountId: q.accountId, includedInTotal: true },
      select: { id: true, name: true },
      orderBy: { sortOrder: 'asc' },
    });
    const scope = new Set(wallets.map((w) => w.id));
    const allWallets = await this.prisma.wallet.findMany({ where: { accountId: q.accountId }, select: { id: true, name: true } });
    const walletName = new Map(allWallets.map((w) => [w.id, w.name]));

    const start = new Date(`${q.startDate}T00:00:00.000Z`);
    const end = new Date(`${q.endDate}T00:00:00.000Z`);
    const touchesScope: Prisma.TransactionWhereInput = {
      accountId: q.accountId,
      OR: [
        { walletId: { in: [...scope] } },
        { fromWalletId: { in: [...scope] } },
        { toWalletId: { in: [...scope] } },
      ],
    };

    const [before, inPeriod] = await Promise.all([
      this.prisma.transaction.findMany({ where: { ...touchesScope, date: { lt: start } }, select: TX_SELECT }),
      this.prisma.transaction.findMany({
        where: { ...touchesScope, date: { gte: start, lte: end } },
        select: TX_SELECT,
        orderBy: [{ date: 'asc' }, { datetime: 'asc' }, { id: 'asc' }],
      }),
    ]);

    const opening = before.reduce((sum, t) => {
      const { credit, debit } = this.effect(t, scope);
      return sum.plus(credit).minus(debit);
    }, new D(0));

    let running = opening;
    let totalDebit = new D(0);
    let totalCredit = new D(0);
    const rows: StatementRow[] = [];

    for (const t of inPeriod) {
      const { credit, debit, internal } = this.effect(t, scope);
      if (credit.isZero() && debit.isZero()) continue; // internal transfer without a fee
      running = running.plus(credit).minus(debit);
      totalDebit = totalDebit.plus(debit);
      totalCredit = totalCredit.plus(credit);
      rows.push({
        id: t.id,
        date: t.date.toISOString().slice(0, 10),
        time: t.time,
        description: internal ? `Transfer fee — ${this.label(t)}` : this.label(t),
        category: t.category ? (t.category.parent ? `${t.category.parent.name} › ${t.category.name}` : t.category.name) : null,
        wallet:
          t.type === TransactionType.TRANSFER
            ? `${walletName.get(t.fromWalletId ?? -1) ?? '?'} → ${walletName.get(t.toWalletId ?? -1) ?? '?'}`
            : walletName.get(t.walletId ?? -1) ?? '—',
        type: t.type,
        debit: debit.toFixed(2),
        credit: credit.toFixed(2),
        balance: running.toFixed(2),
      });
    }

    return {
      accountName: account.name,
      currency: account.currency,
      holderName: account.user.name,
      holderEmail: account.user.email,
      scope: {
        walletId: q.walletId ?? null,
        label: q.walletId ? wallets[0]?.name ?? 'Wallet' : 'All wallets',
        wallets: wallets.map((w) => w.name),
      },
      period: { startDate: q.startDate, endDate: q.endDate },
      openingBalance: opening.toFixed(2),
      totalDebit: totalDebit.toFixed(2),
      totalCredit: totalCredit.toFixed(2),
      closingBalance: opening.plus(totalCredit).minus(totalDebit).toFixed(2),
      rows,
      generatedAt: new Date().toISOString(),
    };
  }

  // Money in/out of the scoped wallets for one transaction. A transfer between
  // two scoped wallets only costs its fee; the amount itself stays inside.
  private effect(t: StatementTx, scope: Set<number>): { credit: Decimal; debit: Decimal; internal: boolean } {
    const zero = new D(0);
    const amount = new D(t.amount);
    const fee = new D(t.feeAmount);
    if (t.type === TransactionType.INCOME) {
      return { credit: t.walletId && scope.has(t.walletId) ? amount : zero, debit: zero, internal: false };
    }
    if (t.type === TransactionType.EXPENSE) {
      return { credit: zero, debit: t.walletId && scope.has(t.walletId) ? amount : zero, internal: false };
    }
    const fromIn = !!t.fromWalletId && scope.has(t.fromWalletId);
    const toIn = !!t.toWalletId && scope.has(t.toWalletId);
    if (fromIn && toIn) return { credit: zero, debit: fee, internal: true };
    return {
      credit: toIn ? amount : zero,
      debit: fromIn ? amount.plus(fee) : zero,
      internal: false,
    };
  }

  private label(t: StatementTx): string {
    if (t.isOpeningBalance) return 'Wallet opening balance';
    const desc = t.description?.trim();
    if (desc) return desc;
    if (t.category) return t.category.name;
    if (t.type === TransactionType.TRANSFER) return 'Transfer';
    return t.type === TransactionType.INCOME ? 'Income' : 'Expense';
  }
}
