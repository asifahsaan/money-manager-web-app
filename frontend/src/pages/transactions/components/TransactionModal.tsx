import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { X, Trash2, Paperclip, Loader2, ArrowLeftRight, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { invalidateMoneyQueries } from '@/lib/queries';
import { apiErrorMessage } from '@/lib/api-error';
import { cn, formatCurrency } from '@/lib/utils';
import { categoryService } from '@/services/category.service';
import { walletService } from '@/services/wallet.service';
import { transactionService } from '@/services/transaction.service';
import { attachmentService } from '@/services/attachment.service';
import { Transaction, TransactionType, Wallet, CategoryType } from '@/types';
import { CategoryChips } from './transaction-form/CategoryChips';
import { AttachmentThumbs, ACCEPTED_IMAGES } from './transaction-form/Attachments';
import { lastWallet, recordCategoryUse, rememberWallet } from './transaction-form/preferences';

const schema = z
  .object({
    type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']),
    amount: z.string().min(1, 'Enter an amount').refine((v) => Number(v) > 0, 'Must be more than 0'),
    date: z.string().min(1, 'Required'),
    time: z.string().optional(),
    description: z.string().max(255).optional(),
    categoryId: z.number().optional(),
    walletId: z.number().optional(),
    fromWalletId: z.number().optional(),
    toWalletId: z.number().optional(),
    feeAmount: z.string().optional(),
  })
  .superRefine((d, ctx) => {
    if (d.type !== 'TRANSFER' && !d.walletId) {
      ctx.addIssue({ code: 'custom', path: ['walletId'], message: 'Select a wallet' });
    }
    if (d.type === 'TRANSFER' && !d.fromWalletId) {
      ctx.addIssue({ code: 'custom', path: ['fromWalletId'], message: 'Select a wallet' });
    }
    if (d.type === 'TRANSFER' && !d.toWalletId) {
      ctx.addIssue({ code: 'custom', path: ['toWalletId'], message: 'Select a wallet' });
    }
    if (d.type === 'TRANSFER' && d.fromWalletId && d.fromWalletId === d.toWalletId) {
      ctx.addIssue({ code: 'custom', path: ['toWalletId'], message: 'Pick a different wallet' });
    }
  });

type FormData = z.infer<typeof schema>;

interface Props {
  accountId: number;
  currency: string;
  onClose: () => void;
  editing?: Transaction;
  defaultDate?: string; // 'yyyy-MM-dd' — pre-fills the date when adding
}

const TABS: TransactionType[] = ['EXPENSE', 'INCOME', 'TRANSFER'];
const TAB_LABELS: Record<TransactionType, string> = { EXPENSE: 'Expense', INCOME: 'Income', TRANSFER: 'Transfer' };
const TAB_COLORS: Record<TransactionType, string> = {
  EXPENSE: 'bg-expense text-white',
  INCOME: 'bg-income text-white',
  TRANSFER: 'bg-gray-500 text-white',
};

const LABEL = 'mb-1 block text-xs font-medium text-ink-muted';
const CONTROL =
  'h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20';
const ERROR = 'mt-1 text-xs text-expense';

function WalletSelect({
  wallets, value, onChange, currency, placeholder = 'Select wallet', id,
}: {
  wallets: Wallet[];
  value: number | undefined;
  onChange: (id: number | undefined) => void;
  currency: string;
  placeholder?: string;
  id?: string;
}) {
  return (
    <select
      id={id}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
      className={cn(CONTROL, !value && 'text-gray-400')}
    >
      <option value="">{placeholder}</option>
      {wallets.map((w) => (
        <option key={w.id} value={w.id}>
          {w.name} · {formatCurrency(Number(w.currentBalance), currency)}
        </option>
      ))}
    </select>
  );
}

export function TransactionModal({ accountId, currency, onClose, editing, defaultDate }: Props) {
  const queryClient = useQueryClient();
  const today = format(new Date(), 'yyyy-MM-dd');
  const amountRef = useRef<HTMLInputElement | null>(null);

  const {
    register, handleSubmit, control, watch, setValue, getValues, reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: (editing?.type as TransactionType) ?? 'EXPENSE',
      amount: editing ? String(Number(editing.amount)) : '',
      date: editing ? editing.date.substring(0, 10) : (defaultDate ?? today),
      time: editing?.time ? editing.time.substring(0, 5) : '',
      description: editing?.description ?? '',
      categoryId: editing?.categoryId ?? undefined,
      walletId: editing?.walletId ?? undefined,
      fromWalletId: editing?.fromWalletId ?? undefined,
      toWalletId: editing?.toWalletId ?? undefined,
      feeAmount: editing ? String(Number(editing.feeAmount)) : '',
    },
  });

  const type = watch('type');
  const accent = TAB_COLORS[type];

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', accountId, type],
    queryFn: () =>
      type !== 'TRANSFER' ? categoryService.list(accountId, type as CategoryType) : Promise.resolve([]),
    enabled: type !== 'TRANSFER',
  });

  const { data: wallets = [] } = useQuery({
    queryKey: ['wallets', accountId],
    queryFn: () => walletService.list(accountId),
  });
  const activeWallets = wallets.filter((w) => !w.archived || w.id === editing?.walletId);

  const { data: savedAttachments = [] } = useQuery({
    queryKey: ['attachments', editing?.id],
    queryFn: () => attachmentService.list(editing!.id),
    enabled: !!editing,
  });

  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showFee, setShowFee] = useState(() => !!editing && Number(editing.feeAmount) > 0);
  const [addAnother, setAddAnother] = useState(false);

  // New transaction: start from the wallet used last time
  useEffect(() => {
    if (editing || getValues('walletId') || !wallets.length) return;
    const remembered = lastWallet(accountId);
    const pick = wallets.find((w) => w.id === remembered && !w.archived) ?? wallets.find((w) => !w.archived);
    if (pick) setValue('walletId', pick.id);
  }, [wallets, editing, accountId, getValues, setValue]);

  // Category lists differ per type — clear the choice on a real type change
  // (not on first render, which would blank the category when editing)
  const prevType = useRef(type);
  useEffect(() => {
    if (prevType.current !== type) setValue('categoryId', undefined);
    prevType.current = type;
  }, [type, setValue]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const uploadSaved = useMutation({
    mutationFn: (file: File) => attachmentService.upload(editing!.id, file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['attachments', editing?.id] }),
    onError: (err) => toast.error(apiErrorMessage(err, 'Failed to upload photo')),
  });
  const deleteSaved = useMutation({
    mutationFn: (attachmentId: number) => attachmentService.delete(editing!.id, attachmentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['attachments', editing?.id] }),
    onError: () => toast.error('Failed to delete photo'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => transactionService.delete(editing!.id),
    onSuccess: () => {
      toast.success('Transaction deleted');
      void invalidateMoneyQueries(queryClient);
      onClose();
    },
    onError: () => toast.error('Failed to delete'),
  });

  function handleFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (editing) uploadSaved.mutate(file);
    else setPendingFiles((f) => [...f, file]);
  }

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    try {
      const shared = {
        type: data.type,
        amount: Number(data.amount),
        date: data.date,
        time: data.time ? data.time.substring(0, 5) : undefined,
        description: data.description || undefined,
        categoryId: data.type !== 'TRANSFER' ? data.categoryId : undefined,
        walletId: data.type !== 'TRANSFER' ? data.walletId : undefined,
        fromWalletId: data.type === 'TRANSFER' ? data.fromWalletId : undefined,
        toWalletId: data.type === 'TRANSFER' ? data.toWalletId : undefined,
        feeAmount: data.type === 'TRANSFER' && data.feeAmount ? Number(data.feeAmount) : undefined,
      };

      const tx = editing
        ? await transactionService.update(editing.id, shared)
        : await transactionService.create({ ...shared, accountId });

      if (pendingFiles.length > 0) {
        await Promise.all(pendingFiles.map((f) => attachmentService.upload(tx.id, f)));
      }

      recordCategoryUse(accountId, shared.categoryId);
      rememberWallet(accountId, shared.walletId ?? shared.fromWalletId);
      void invalidateMoneyQueries(queryClient);

      if (addAnother && !editing) {
        // Keep type, wallet, date and category — clear what changes per entry
        toast.success('Saved — add the next one');
        reset({ ...data, amount: '', description: '', time: '', feeAmount: '' });
        setPendingFiles([]);
        setShowFee(false);
        amountRef.current?.focus();
      } else {
        toast.success(editing ? 'Transaction updated' : 'Transaction added');
        onClose();
      }
    } catch (err: unknown) {
      toast.error(apiErrorMessage(err, 'Something went wrong'));
    } finally {
      setSaving(false);
      setAddAnother(false);
    }
  };

  const amountField = register('amount');
  const uploading = uploadSaved.isPending;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${editing ? 'Edit' : 'Add'} ${TAB_LABELS[type]}`}
        className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-surface-raised shadow-2xl sm:rounded-2xl"
      >
        {/* Header banner */}
        <div className={cn('flex flex-shrink-0 items-center justify-between px-5 py-3', accent)}>
          <h2 className="text-lg font-semibold">
            {editing ? 'Edit' : 'Add'} {TAB_LABELS[type]}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1 hover:bg-white/20">
            <X size={20} />
          </button>
        </div>

        {/* Type tabs */}
        <div className="flex flex-shrink-0 border-b border-line" role="tablist">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={type === t}
              onClick={() => setValue('type', t)}
              className={cn(
                'flex-1 py-2 text-sm font-medium transition-colors',
                type === t ? 'border-b-2 border-primary-500 text-primary-600' : 'text-ink-muted hover:text-ink',
              )}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
            {/* Amount */}
            <div>
              <div className="flex items-baseline gap-2 border-b-2 border-line pb-1 focus-within:border-primary-500">
                <span className="text-lg font-semibold text-ink-muted">{currency}</span>
                <input
                  {...amountField}
                  ref={(el) => {
                    amountField.ref(el);
                    amountRef.current = el;
                  }}
                  autoFocus={!editing}
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  aria-label="Amount"
                  className="w-full bg-transparent text-3xl font-bold tabular-nums text-ink outline-none placeholder:text-gray-300 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
              </div>
              {errors.amount && <p className={ERROR}>{errors.amount.message}</p>}
            </div>

            {/* Category */}
            {type !== 'TRANSFER' && (
              <div>
                <span className={LABEL}>Category</span>
                <Controller
                  name="categoryId"
                  control={control}
                  render={({ field }) => (
                    <CategoryChips
                      categories={categories}
                      value={field.value}
                      onChange={field.onChange}
                      accountId={accountId}
                      type={type as CategoryType}
                      onCreated={() => queryClient.invalidateQueries({ queryKey: ['categories', accountId, type] })}
                    />
                  )}
                />
              </div>
            )}

            {/* Wallet(s) + date + time */}
            {type !== 'TRANSFER' ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1.5fr_1fr_0.8fr]">
                <div className="col-span-2 sm:col-span-1">
                  <label htmlFor="tx-wallet" className={LABEL}>Wallet</label>
                  <Controller
                    name="walletId"
                    control={control}
                    render={({ field }) => (
                      <WalletSelect id="tx-wallet" wallets={activeWallets} value={field.value} onChange={field.onChange} currency={currency} />
                    )}
                  />
                  {errors.walletId && <p className={ERROR}>{errors.walletId.message}</p>}
                </div>
                <div>
                  <label htmlFor="tx-date" className={LABEL}>Date</label>
                  <input id="tx-date" {...register('date')} type="date" className={CONTROL} />
                  {errors.date && <p className={ERROR}>{errors.date.message}</p>}
                </div>
                <div>
                  <label htmlFor="tx-time" className={LABEL}>Time</label>
                  <input id="tx-time" {...register('time')} type="time" className={CONTROL} />
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
                  <div className="min-w-0">
                    <label htmlFor="tx-from" className={LABEL}>From</label>
                    <Controller
                      name="fromWalletId"
                      control={control}
                      render={({ field }) => (
                        <WalletSelect id="tx-from" wallets={activeWallets} value={field.value} onChange={field.onChange} currency={currency} placeholder="From" />
                      )}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const { fromWalletId, toWalletId } = getValues();
                      setValue('fromWalletId', toWalletId);
                      setValue('toWalletId', fromWalletId);
                    }}
                    aria-label="Swap wallets"
                    title="Swap"
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-line text-ink-muted transition-colors hover:bg-gray-100 hover:text-ink"
                  >
                    <ArrowLeftRight size={16} />
                  </button>
                  <div className="min-w-0">
                    <label htmlFor="tx-to" className={LABEL}>To</label>
                    <Controller
                      name="toWalletId"
                      control={control}
                      render={({ field }) => (
                        <WalletSelect id="tx-to" wallets={activeWallets} value={field.value} onChange={field.onChange} currency={currency} placeholder="To" />
                      )}
                    />
                  </div>
                </div>
                {(errors.fromWalletId || errors.toWalletId) && (
                  <p className={cn(ERROR, '-mt-2')}>{errors.fromWalletId?.message ?? errors.toWalletId?.message}</p>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="tx-date" className={LABEL}>Date</label>
                    <input id="tx-date" {...register('date')} type="date" className={CONTROL} />
                  </div>
                  <div>
                    <label htmlFor="tx-time" className={LABEL}>Time</label>
                    <input id="tx-time" {...register('time')} type="time" className={CONTROL} />
                  </div>
                </div>
                {showFee ? (
                  <div>
                    <label htmlFor="tx-fee" className={LABEL}>Transfer fee</label>
                    <input id="tx-fee" {...register('feeAmount')} type="number" inputMode="decimal" step="0.01" min="0" placeholder="0.00" className={CONTROL} />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowFee(true)}
                    className="-mt-1 flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700"
                  >
                    <Plus size={14} /> Add fee
                  </button>
                )}
              </>
            )}

            {/* Note + attachment */}
            <div>
              <div className="relative">
                <input
                  {...register('description')}
                  type="text"
                  placeholder="Add a note (optional)"
                  aria-label="Note"
                  className={cn(CONTROL, 'pr-11')}
                />
                <label
                  title="Attach a photo"
                  className={cn(
                    'absolute right-1 top-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-gray-100 hover:text-ink',
                    uploading && 'pointer-events-none opacity-60',
                  )}
                >
                  {uploading ? <Loader2 size={16} className="animate-spin" /> : <Paperclip size={16} />}
                  <span className="sr-only">Attach a photo</span>
                  <input type="file" accept={ACCEPTED_IMAGES} className="hidden" onChange={handleFilePicked} />
                </label>
              </div>
              <AttachmentThumbs
                saved={savedAttachments}
                onRemoveSaved={(id) => deleteSaved.mutate(id)}
                pending={pendingFiles}
                onRemovePending={(i) => setPendingFiles((f) => f.filter((_, idx) => idx !== i))}
              />
            </div>
          </div>

          {/* Footer — always visible */}
          <div
            className="flex flex-shrink-0 items-center gap-2 border-t border-line px-5 py-3"
            style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
          >
            {editing &&
              (confirmDelete ? (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => deleteMutation.mutate()}
                    disabled={deleteMutation.isPending}
                    className="h-10 rounded-lg bg-expense px-3 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {deleteMutation.isPending ? 'Deleting…' : 'Confirm delete'}
                  </button>
                  <button type="button" onClick={() => setConfirmDelete(false)} className="h-10 rounded-lg px-2 text-sm text-ink-muted hover:bg-gray-100">
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  aria-label="Delete transaction"
                  title="Delete transaction"
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-line text-expense transition-colors hover:bg-expense-light"
                >
                  <Trash2 size={16} />
                </button>
              ))}

            <div className="ml-auto flex items-center gap-2">
              {!editing && (
                <button
                  type="submit"
                  disabled={saving}
                  onClick={() => setAddAnother(true)}
                  className="h-10 rounded-lg border border-line px-3 text-sm font-semibold text-ink transition-colors hover:bg-gray-50 disabled:opacity-60"
                >
                  Save & add another
                </button>
              )}
              <button
                type="submit"
                disabled={saving}
                onClick={() => setAddAnother(false)}
                className={cn('h-10 min-w-[96px] rounded-lg px-5 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60', accent)}
              >
                {saving ? 'Saving…' : editing ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
