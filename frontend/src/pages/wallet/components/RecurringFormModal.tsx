import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import { X } from 'lucide-react';
import { recurringService } from '@/services/recurring.service';
import { CategoryCombobox } from '@/components/shared/CategoryCombobox';
import { apiErrorMessage } from '@/lib/api-error';
import { refreshAfterRecurring } from '@/lib/use-auto-recurring';
import { cn } from '@/lib/utils';
import { WeekdayPicker } from '@/components/shared/WeekdayPicker';
import type { Category, Recurring, RecurringFrequency, TransactionType, Wallet } from '@/types';

/** "18:30" → "6:30 PM" */
export function formatTime(t: string): string {
  const [h, m] = t.split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

export const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
// Monday-first order for the chips (Pakistan's week)
const CHIP_ORDER = [1, 2, 3, 4, 5, 6, 0];

/** "Every Mon, Tue, Fri" / "Weekdays" / "Monthly" … */
export function scheduleLabel(r: Pick<Recurring, 'frequency' | 'weekdays'>): string {
  if (r.frequency === 'WEEKLY' && r.weekdays?.length) {
    const d = [...r.weekdays].sort((a, b) => a - b);
    if (d.length === 7) return 'Every day';
    if (d.join() === '1,2,3,4,5') return 'Weekdays (Mon–Fri)';
    if (d.join() === '0,6') return 'Weekends';
    return `Every ${CHIP_ORDER.filter((x) => d.includes(x)).map((x) => WEEKDAY_SHORT[x]).join(', ')}`;
  }
  return { DAILY: 'Daily', WEEKLY: 'Weekly', MONTHLY: 'Monthly', YEARLY: 'Yearly', CUSTOM: 'Custom' }[r.frequency];
}

const TYPES: { value: TransactionType; label: string; tone: string }[] = [
  { value: 'EXPENSE', label: 'Expense', tone: 'border-expense bg-expense-light text-expense' },
  { value: 'INCOME', label: 'Income', tone: 'border-income bg-income-light text-income' },
  { value: 'TRANSFER', label: 'Transfer', tone: 'border-blue-500 bg-blue-50 text-blue-600' },
];

type Schedule = 'DAILY' | 'WEEKLY' | 'DAYS' | 'MONTHLY' | 'YEARLY';
const SCHEDULES: { value: Schedule; label: string }[] = [
  { value: 'DAILY', label: 'Every day' },
  { value: 'DAYS', label: 'Specific weekdays' },
  { value: 'WEEKLY', label: 'Once a week' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'YEARLY', label: 'Yearly' },
];

interface Props {
  accountId: number;
  wallets: Wallet[];
  categories: Category[];
  editing?: Recurring | null;
  onClose: () => void;
}

const inputCls = 'h-10 w-full rounded-xl border border-line bg-surface px-3 text-sm text-ink focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100';
const labelCls = 'mb-1 block text-xs font-medium text-ink-muted';

export function RecurringFormModal({ accountId, wallets, categories, editing, onClose }: Props) {
  const qc = useQueryClient();
  const isEdit = !!editing;
  const today = format(new Date(), 'yyyy-MM-dd');

  const [type, setType] = useState<TransactionType>(editing?.transactionType ?? 'EXPENSE');
  const [amount, setAmount] = useState(editing ? String(Number(editing.amount)) : '');
  const [schedule, setSchedule] = useState<Schedule>(
    editing ? (editing.frequency === 'WEEKLY' && editing.weekdays?.length ? 'DAYS' : (editing.frequency as Schedule)) : 'MONTHLY',
  );
  const [days, setDays] = useState<number[]>(editing?.weekdays?.length ? editing.weekdays : [1, 2, 3, 4, 5]);
  const [description, setDescription] = useState(editing?.description ?? '');
  const [walletId, setWalletId] = useState<number | ''>(editing?.walletId ?? '');
  const [fromWalletId, setFromWalletId] = useState<number | ''>(editing?.fromWalletId ?? '');
  const [toWalletId, setToWalletId] = useState<number | ''>(editing?.toWalletId ?? '');
  const [categoryId, setCategoryId] = useState<number | ''>(editing?.categoryId ?? '');
  // Create: the first date. Edit: the next date it is due.
  const [date, setDate] = useState(editing ? editing.nextOccurrence.slice(0, 10) : today);
  const [endDate, setEndDate] = useState(editing?.endDate?.slice(0, 10) ?? '');
  const [time, setTime] = useState(editing?.time ?? '');
  const [error, setError] = useState<string | null>(null);


  const save = useMutation({
    mutationFn: async () => {
      const frequency: RecurringFrequency = schedule === 'DAYS' ? 'WEEKLY' : schedule;
      const weekdays = schedule === 'DAYS' ? [...days].sort((a, b) => a - b) : [];
      if (isEdit) {
        return recurringService.update(editing!.id, {
          amount: Number(amount),
          description: description.trim(),
          frequency,
          weekdays,
          nextOccurrence: date,
          time: time || null,
          endDate: endDate || (null as unknown as string),
          ...(type === 'TRANSFER'
            ? { fromWalletId: fromWalletId || null, toWalletId: toWalletId || null }
            : { walletId: walletId || null, categoryId: categoryId || null }),
        });
      }
      return recurringService.create({
        accountId,
        transactionType: type,
        amount: Number(amount),
        description: description.trim() || undefined,
        frequency,
        weekdays,
        startDate: date,
        time: time || undefined,
        endDate: endDate || undefined,
        ...(type === 'TRANSFER'
          ? { fromWalletId: fromWalletId || undefined, toWalletId: toWalletId || undefined }
          : { walletId: walletId || undefined, categoryId: categoryId || undefined }),
      });
    },
    onSuccess: async () => {
      // Add any dates that are already due (e.g. it started earlier this week)
      const { created } = await recurringService.processDue(accountId).catch(() => ({ created: 0 }));
      toast.success(
        `${isEdit ? 'Recurring updated' : 'Recurring created'}${created ? ` · added ${created} past entr${created === 1 ? 'y' : 'ies'}` : ''}`,
      );
      refreshAfterRecurring(qc);
      onClose();
    },
    onError: (err) => setError(apiErrorMessage(err, 'Could not save')),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!(Number(amount) > 0)) return setError('Enter an amount above 0.');
    if (schedule === 'DAYS' && days.length === 0) return setError('Pick at least one day of the week.');
    if (type === 'TRANSFER') {
      if (!fromWalletId || !toWalletId) return setError('Choose both wallets for the transfer.');
      if (fromWalletId === toWalletId) return setError('From and To must be different wallets.');
    } else if (!walletId) return setError('Choose a wallet.');
    if (endDate && endDate < date) return setError('End date must be after the start date.');
    save.mutate();
  }

  const walletOptions = wallets.filter((w) => !w.archived);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <form
        onSubmit={submit}
        className="relative flex max-h-[92vh] w-full max-w-xl flex-col rounded-t-2xl bg-surface shadow-2xl sm:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <span className="text-sm font-bold text-ink">{isEdit ? 'Edit recurring' : 'New recurring'}</span>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1 hover:bg-gray-100">
            <X size={16} className="text-ink-muted" />
          </button>
        </div>

        <div className="space-y-3 overflow-y-auto px-5 py-4">
          {/* Type */}
          <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-gray-100 p-1">
            {TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                disabled={isEdit && t.value !== type}
                onClick={() => setType(t.value)}
                title={isEdit && t.value !== type ? 'The type can’t be changed — create a new one instead' : undefined}
                className={cn(
                  'h-8 rounded-lg border text-sm font-semibold transition-colors disabled:opacity-40',
                  type === t.value ? t.tone : 'border-transparent text-ink-muted hover:text-ink',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Amount + description */}
          <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-2">
            <div>
              <label className={labelCls}>Amount</label>
              <input type="number" inputMode="decimal" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" className={inputCls} autoFocus={!isEdit} />
            </div>
            <div>
              <label className={labelCls}>Description</label>
              <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Rider to office" maxLength={255} className={inputCls} />
            </div>
          </div>

          {/* Wallet + category (or from → to) */}
          {type === 'TRANSFER' ? (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelCls}>From wallet</label>
                <select value={fromWalletId} onChange={(e) => setFromWalletId(e.target.value ? Number(e.target.value) : '')} className={inputCls}>
                  <option value="">Select</option>
                  {walletOptions.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>To wallet</label>
                <select value={toWalletId} onChange={(e) => setToWalletId(e.target.value ? Number(e.target.value) : '')} className={inputCls}>
                  <option value="">Select</option>
                  {walletOptions.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelCls}>Wallet</label>
                <select value={walletId} onChange={(e) => setWalletId(e.target.value ? Number(e.target.value) : '')} className={inputCls}>
                  <option value="">Select wallet</option>
                  {walletOptions.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Category</label>
                <CategoryCombobox
                  categories={categories}
                  type={type === 'INCOME' ? 'INCOME' : 'EXPENSE'}
                  value={categoryId}
                  onChange={setCategoryId}
                  emptyLabel="No category"
                />
              </div>
            </div>
          )}

          {/* Schedule */}
          <div className="rounded-xl border border-line p-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelCls}>Repeats</label>
                <select value={schedule} onChange={(e) => setSchedule(e.target.value as Schedule)} className={inputCls}>
                  {SCHEDULES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Time <span className="font-normal">(optional)</span></label>
                <div className="relative">
                  <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={cn(inputCls, 'px-2')} />
                  {time && (
                    <button type="button" onClick={() => setTime('')} aria-label="Clear time" className="absolute right-9 top-1/2 -translate-y-1/2 rounded p-0.5 text-ink-muted hover:bg-gray-100 hover:text-ink">
                      <X size={13} />
                    </button>
                  )}
                </div>
              </div>
              <div className="contents">
                <div>
                  <label className={labelCls}>{isEdit ? 'Next due' : 'Starts'}</label>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={cn(inputCls, 'px-2')} required />
                </div>
                <div>
                  <label className={labelCls}>Ends <span className="font-normal">(optional)</span></label>
                  <input type="date" value={endDate} min={date} onChange={(e) => setEndDate(e.target.value)} className={cn(inputCls, 'px-2')} />
                </div>
              </div>
            </div>

            <p className="mt-2 text-[11px] text-ink-muted">
              Added to your transactions automatically on each date{time ? ` at ${formatTime(time)}` : ''}{date < today && !isEdit ? ' — dates before today are added right away' : ''}. Skipped a day? Just delete or edit that entry.
            </p>

            {schedule === 'DAYS' && (
              <div className="mt-2.5">
                <WeekdayPicker value={days} onChange={setDays} presets={false} />
                <div className="mt-1.5 flex flex-wrap gap-x-3 text-[11px]">
                  <button type="button" onClick={() => setDays([1, 2, 3, 4, 5])} className="font-medium text-primary-600 hover:underline">Mon–Fri</button>
                  <button type="button" onClick={() => setDays([0, 6])} className="font-medium text-primary-600 hover:underline">Weekends</button>
                  <button type="button" onClick={() => setDays([])} className="font-medium text-ink-muted hover:underline">Clear</button>
                  <span className="text-ink-muted">
                    {days.length ? scheduleLabel({ frequency: 'WEEKLY', weekdays: days }) : 'No days picked'}
                    {days.length > 0 && date && ` · first on ${format(firstOnOrAfter(date, days), 'EEE d MMM')}`}
                  </span>
                </div>
              </div>
            )}
          </div>

          {error && <p className="rounded-lg bg-expense-light px-3 py-2 text-xs font-medium text-expense">{error}</p>}
        </div>

        <div className="border-t border-line px-5 py-3">
          <button
            type="submit"
            disabled={save.isPending}
            className="h-10 w-full rounded-xl text-sm font-bold text-white transition-all active:scale-[0.99] disabled:opacity-60"
            style={{ background: 'rgb(var(--c-brand-600))' }}
          >
            {save.isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Create recurring'}
          </button>
        </div>
      </form>
    </div>
  );
}

function firstOnOrAfter(ymd: string, days: number[]): Date {
  let d = parseISO(ymd);
  for (let i = 0; i < 7 && !days.includes(d.getDay()); i++) d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
  return d;
}
