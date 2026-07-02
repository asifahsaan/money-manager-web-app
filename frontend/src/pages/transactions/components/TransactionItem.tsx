import { Transaction } from '@/types';
import { cn, formatCurrency } from '@/lib/utils';
import { CategoryIcon } from './CategoryIcon';
import { ArrowLeftRight } from 'lucide-react';

interface Props {
  transaction: Transaction;
  currency: string;
  onClick: () => void;
}

export function TransactionItem({ transaction: tx, currency, onClick }: Props) {
  const isIncome = tx.type === 'INCOME';
  const isTransfer = tx.type === 'TRANSFER';

  // Build category display: "Transportation > UOL to Office" or just "Transportation"
  const categoryDisplay = tx.category
    ? tx.category.parent
      ? `${tx.category.parent.name} › ${tx.category.name}`
      : tx.category.name
    : null;

  const label =
    tx.description?.trim() ||
    categoryDisplay ||
    (isTransfer
      ? `${tx.fromWallet?.name ?? '?'} → ${tx.toWallet?.name ?? '?'}`
      : tx.type.charAt(0) + tx.type.slice(1).toLowerCase());

  const meta = isTransfer
    ? `${tx.fromWallet?.name ?? '?'} → ${tx.toWallet?.name ?? '?'}`
    : `${categoryDisplay ?? 'Uncategorized'} • ${tx.wallet?.name ?? ''}`;

  const amountDisplay = isIncome
    ? `+${formatCurrency(Number(tx.amount), currency)}`
    : isTransfer
    ? formatCurrency(Number(tx.amount), currency)
    : `-${formatCurrency(Number(tx.amount), currency)}`;

  return (
    <button onClick={onClick} className="tx-card">
      {/* Icon badge */}
      {isTransfer ? (
        <div
          className="flex items-center justify-center flex-shrink-0"
          style={{
            width: 42,
            height: 42,
            backgroundColor: '#6B7280',
            borderRadius: '15px',
            boxShadow: 'inset 0 -8px 18px rgba(0,0,0,0.08)',
          }}
        >
          <ArrowLeftRight size={18} color="white" />
        </div>
      ) : (
        <CategoryIcon
          name={tx.category?.icon ?? null}
          color={tx.category?.color ?? null}
          size={18}
        />
      )}

      {/* Details */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-800 truncate">{label}</p>
        <p className="text-xs text-gray-400 truncate mt-0.5">{meta}</p>
      </div>

      {/* Time + Amount */}
      <div className="text-right flex-shrink-0">
        <p
          className={cn(
            'text-sm font-black',
            isTransfer ? 'text-gray-500' : isIncome ? 'text-income' : 'text-expense',
          )}
        >
          {amountDisplay}
        </p>
        {tx.time && (
          <p className="text-[10px] text-gray-300 mt-0.5">{tx.time.substring(0, 5)}</p>
        )}
      </div>
    </button>
  );
}
