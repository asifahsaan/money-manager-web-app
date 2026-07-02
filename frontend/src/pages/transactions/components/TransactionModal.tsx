import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { X, ChevronDown, Search, Plus, Check, Trash2, Paperclip, Loader2, Tag } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { categoryService, CreateCategoryData } from '@/services/category.service';
import { walletService } from '@/services/wallet.service';
import { transactionService } from '@/services/transaction.service';
import { attachmentService } from '@/services/attachment.service';
import { Transaction, TransactionType, Wallet, Category, CategoryType } from '@/types';
import { CategoryIcon } from './CategoryIcon';

const schema = z
  .object({
    type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']),
    amount: z.string().min(1, 'Required').refine((v) => Number(v) > 0, 'Must be > 0'),
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
      ctx.addIssue({ code: 'custom', path: ['fromWalletId'], message: 'Select from-wallet' });
    }
    if (d.type === 'TRANSFER' && !d.toWalletId) {
      ctx.addIssue({ code: 'custom', path: ['toWalletId'], message: 'Select to-wallet' });
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
const TAB_LABELS: Record<TransactionType, string> = {
  EXPENSE: 'Expense',
  INCOME: 'Income',
  TRANSFER: 'Transfer',
};
const TAB_COLORS: Record<TransactionType, string> = {
  EXPENSE: 'bg-expense text-white',
  INCOME: 'bg-income text-white',
  TRANSFER: 'bg-gray-500 text-white',
};

export function TransactionModal({ accountId, currency, onClose, editing, defaultDate }: Props) {
  const queryClient = useQueryClient();
  const today = format(new Date(), 'yyyy-MM-dd');

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
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
      feeAmount: editing ? String(Number(editing.feeAmount)) : '0',
    },
  });

  const type = watch('type');

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

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [savedTx, setSavedTx] = useState<Transaction | undefined>(editing);

  const deleteMutation = useMutation({
    mutationFn: () => transactionService.delete(editing!.id),
    onSuccess: () => {
      toast.success('Transaction deleted');
      queryClient.invalidateQueries({ queryKey: ['transactions', accountId] });
      queryClient.invalidateQueries({ queryKey: ['wallets', accountId] });
      onClose();
    },
    onError: () => toast.error('Failed to delete'),
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) => {
      const shared = {
        type: data.type,
        amount: Number(data.amount),
        date: data.date,
        time: data.time ? data.time.substring(0, 5) : undefined,
        description: data.description || undefined,
        categoryId: data.categoryId,
        walletId: data.type !== 'TRANSFER' ? data.walletId : undefined,
        fromWalletId: data.type === 'TRANSFER' ? data.fromWalletId : undefined,
        toWalletId: data.type === 'TRANSFER' ? data.toWalletId : undefined,
        feeAmount: data.feeAmount ? Number(data.feeAmount) : undefined,
      };
      return editing
        ? transactionService.update(editing.id, shared)
        : transactionService.create({ ...shared, accountId });
    },
    onSuccess: (data) => {
      toast.success(editing ? 'Transaction updated' : 'Transaction added');
      queryClient.invalidateQueries({ queryKey: ['transactions', accountId] });
      queryClient.invalidateQueries({ queryKey: ['wallets', accountId] });
      if (editing) {
        onClose();
      } else {
        // Keep the modal open so a photo attachment can be added to the new transaction.
        setSavedTx(data);
      }
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? 'Something went wrong');
    },
  });

  const onSubmit = (data: FormData) => {
    if (!editing && savedTx) {
      onClose();
      return;
    }
    mutation.mutate(data);
  };

  // Reset category when type changes
  useEffect(() => {
    setValue('categoryId', undefined);
  }, [type, setValue]);

  const activeTabStyle = TAB_COLORS[type];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[92vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className={cn('flex items-center justify-between px-5 py-4', activeTabStyle)}>
          <h2 className="text-lg font-semibold">
            {editing ? 'Edit' : 'Add'} {TAB_LABELS[type]}
          </h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-white/20">
            <X size={20} />
          </button>
        </div>

        {/* Type tabs */}
        <div className="flex border-b border-gray-100">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setValue('type', t)}
              className={cn(
                'flex-1 py-2.5 text-sm font-medium transition-colors',
                type === t
                  ? 'border-b-2 border-primary-500 text-primary-600'
                  : 'text-gray-500 hover:text-gray-700',
              )}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          {/* Amount */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Amount ({currency})
            </label>
            <input
              {...register('amount')}
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              className="w-full text-3xl font-bold text-gray-800 border-0 border-b-2 border-gray-200 focus:border-primary-500 outline-none pb-1 bg-transparent"
            />
            {errors.amount && (
              <p className="text-xs text-expense mt-1">{errors.amount.message}</p>
            )}
          </div>

          {/* Category (Income/Expense only) */}
          {type !== 'TRANSFER' && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2">Category</label>
              <Controller
                name="categoryId"
                control={control}
                render={({ field }) => (
                  <CategoryPicker
                    categories={categories}
                    value={field.value}
                    onChange={field.onChange}
                    accountId={accountId}
                    type={type as CategoryType}
                    onCreated={() =>
                      queryClient.invalidateQueries({ queryKey: ['categories', accountId, type] })
                    }
                  />
                )}
              />
            </div>
          )}

          {/* Wallet selectors */}
          {type !== 'TRANSFER' ? (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Wallet</label>
              <Controller
                name="walletId"
                control={control}
                render={({ field }) => (
                  <WalletSelect wallets={wallets} value={field.value} onChange={field.onChange} />
                )}
              />
              {errors.walletId && (
                <p className="text-xs text-expense mt-1">{errors.walletId.message}</p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
                <Controller
                  name="fromWalletId"
                  control={control}
                  render={({ field }) => (
                    <WalletSelect wallets={wallets} value={field.value} onChange={field.onChange} />
                  )}
                />
                {errors.fromWalletId && (
                  <p className="text-xs text-expense mt-1">{errors.fromWalletId.message}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
                <Controller
                  name="toWalletId"
                  control={control}
                  render={({ field }) => (
                    <WalletSelect wallets={wallets} value={field.value} onChange={field.onChange} />
                  )}
                />
                {errors.toWalletId && (
                  <p className="text-xs text-expense mt-1">{errors.toWalletId.message}</p>
                )}
              </div>
            </div>
          )}

          {/* Transfer fee */}
          {type === 'TRANSFER' && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Fee (optional)</label>
              <input
                {...register('feeAmount')}
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary-500"
              />
            </div>
          )}

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
              <input
                {...register('date')}
                type="date"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary-500"
              />
              {errors.date && (
                <p className="text-xs text-expense mt-1">{errors.date.message}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Time (optional)</label>
              <input
                {...register('time')}
                type="time"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary-500"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Description (optional)
            </label>
            <input
              {...register('description')}
              type="text"
              placeholder="Add a note..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary-500"
            />
          </div>

          {/* Attachments (available once the transaction has been saved) */}
          {savedTx && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2">
                Photo attachment (optional)
              </label>
              <AttachmentsSection transactionId={savedTx.id} />
            </div>
          )}

          {/* Delete (edit mode only) */}
          {editing && (
            <div>
              {!confirmDelete ? (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-200 text-red-500 text-sm font-medium hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={15} />
                  Delete Transaction
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-500 text-sm hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteMutation.mutate()}
                    disabled={deleteMutation.isPending}
                    className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 disabled:opacity-60"
                  >
                    {deleteMutation.isPending ? 'Deleting...' : 'Confirm Delete'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={mutation.isPending}
            className={cn(
              'w-full py-3.5 rounded-xl font-semibold text-white transition-opacity',
              mutation.isPending ? 'opacity-60 cursor-not-allowed' : 'hover:opacity-90',
              activeTabStyle,
            )}
          >
            {mutation.isPending ? 'Saving...' : editing ? 'Update' : savedTx ? 'Done' : 'Save'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Category Picker ──────────────────────────────────────────────────────────

const ICON_OPTIONS = [
  'tag', 'bus', 'utensils', 'zap', 'home', 'shopping-cart', 'credit-card',
  'shirt', 'graduation-cap', 'gamepad-2', 'dumbbell', 'gift', 'heart-pulse',
  'sofa', 'wallet-2', 'lightbulb', 'banknote', 'trending-up', 'award',
  'bar-chart-2', 'star', 'hand-coins', 'grid-2x2', 'car', 'plane', 'coffee',
  'pizza', 'book', 'music', 'camera', 'phone', 'tv', 'wifi', 'shield',
];

const COLOR_OPTIONS = [
  '#F97316', '#EAB308', '#3B82F6', '#10B981', '#8B5CF6',
  '#EC4899', '#06B6D4', '#EF4444', '#6B7280', '#F59E0B',
];

function CategoryPicker({
  categories,
  value,
  onChange,
  accountId,
  type,
  onCreated,
}: {
  categories: Category[];
  value: number | undefined;
  onChange: (id: number) => void;
  accountId: number;
  type: CategoryType;
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [createAsChildOf, setCreateAsChildOf] = useState<number | undefined>();

  const allFlat: Category[] = categories.flatMap((c) => [c, ...(c.children ?? [])]);
  const selected = allFlat.find((c) => c.id === value);
  const searchResults = search.trim()
    ? allFlat.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    : null;

  function selectCategory(id: number) {
    onChange(id);
    setOpen(false);
    setSearch('');
  }

  return (
    <div>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); setShowCreate(false); }}
        className="w-full flex items-center gap-3 border border-gray-200 rounded-xl px-3 py-2.5 hover:border-amber-400 transition-colors bg-white"
      >
        {selected ? (
          <CategoryIcon name={selected.icon} color={selected.color} size={14} containerSize={32} />
        ) : (
          <div
            className="flex items-center justify-center flex-shrink-0 bg-gray-100"
            style={{ width: 32, height: 32, borderRadius: 10 }}
          >
            <Tag size={14} className="text-gray-400" />
          </div>
        )}
        <span className={cn('flex-1 text-left text-sm', selected ? 'text-gray-800' : 'text-gray-400')}>
          {selected
            ? selected.parentCategoryId
              ? (() => {
                  const par = categories.find((c) => c.id === selected.parentCategoryId);
                  return par ? `${par.name} › ${selected.name}` : selected.name;
                })()
              : selected.name
            : 'Select category'}
        </span>
        <ChevronDown
          size={16}
          className={cn('text-gray-400 transition-transform', open && !showCreate && 'rotate-180')}
        />
      </button>

      {/* Inline dropdown */}
      {open && !showCreate && (
        <div className="mt-1.5 border border-gray-200 rounded-2xl bg-white shadow-md overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-gray-100">
            <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
              <Search size={13} className="text-gray-400 flex-shrink-0" />
              <input
                autoFocus
                type="text"
                placeholder="Search categories..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-transparent text-xs outline-none text-gray-700 placeholder-gray-400"
              />
              {search && (
                <button type="button" onClick={() => setSearch('')}>
                  <X size={12} className="text-gray-400" />
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="max-h-44 overflow-y-auto">
            {searchResults ? (
              searchResults.length === 0 ? (
                <p className="px-4 py-3 text-xs text-gray-400">No categories found</p>
              ) : (
                searchResults.map((cat) => (
                  <CategoryDropdownRow
                    key={cat.id}
                    cat={cat}
                    selected={value === cat.id}
                    onClick={() => selectCategory(cat.id)}
                  />
                ))
              )
            ) : categories.length === 0 ? (
              <p className="px-4 py-3 text-xs text-gray-400">No categories yet — add one below</p>
            ) : (
              categories.map((cat) => (
                <div key={cat.id}>
                  <CategoryDropdownRow
                    cat={cat}
                    selected={value === cat.id}
                    onClick={() => selectCategory(cat.id)}
                  />
                  {(cat.children ?? []).map((child) => (
                    <CategoryDropdownRow
                      key={child.id}
                      cat={child}
                      selected={value === child.id}
                      onClick={() => selectCategory(child.id)}
                      isChild
                    />
                  ))}
                </div>
              ))
            )}
          </div>

          {/* Footer actions */}
          <div className="border-t border-gray-100 p-2 flex gap-2">
            <button
              type="button"
              onClick={() => { setCreateAsChildOf(undefined); setShowCreate(true); }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors"
            >
              <Plus size={13} />
              Add Category
            </button>
            {value && (
              <button
                type="button"
                onClick={() => { setCreateAsChildOf(value); setShowCreate(true); }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-gray-600 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <Plus size={13} />
                Add Sub-category
              </button>
            )}
          </div>
        </div>
      )}

      {/* Create category form */}
      {showCreate && (
        <div className="mt-1.5">
          <CreateCategoryInline
            accountId={accountId}
            type={type}
            categories={categories}
            defaultParentId={createAsChildOf}
            onCreated={(newCat) => {
              onCreated();
              onChange(newCat.id);
              setShowCreate(false);
              setOpen(false);
            }}
            onCancel={() => setShowCreate(false)}
          />
        </div>
      )}
    </div>
  );
}

function CategoryDropdownRow({
  cat,
  selected,
  onClick,
  isChild = false,
}: {
  cat: Category;
  selected: boolean;
  onClick: () => void;
  isChild?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2 transition-colors',
        isChild && 'pl-8',
        selected ? 'bg-amber-50 text-amber-800' : 'hover:bg-gray-50 text-gray-700',
      )}
    >
      <CategoryIcon name={cat.icon} color={cat.color} size={13} containerSize={30} />
      <span className="flex-1 text-sm text-left truncate">{cat.name}</span>
      {isChild && !selected && (
        <span className="text-[10px] text-gray-300">sub</span>
      )}
      {selected && <Check size={14} className="text-amber-500 flex-shrink-0" />}
    </button>
  );
}

function CreateCategoryInline({
  accountId,
  type,
  categories,
  defaultParentId,
  onCreated,
  onCancel,
}: {
  accountId: number;
  type: CategoryType;
  categories: Category[];
  defaultParentId?: number;
  onCreated: (cat: Category) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('tag');
  const [color, setColor] = useState(COLOR_OPTIONS[0]);
  const [parentId, setParentId] = useState<number | undefined>(defaultParentId);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const payload: CreateCategoryData = {
        accountId,
        name: name.trim(),
        type,
        icon,
        color,
        parentCategoryId: parentId,
      };
      const created = await categoryService.create(payload);
      onCreated(created);
    } catch {
      toast.error('Failed to create category');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border border-gray-200 rounded-xl p-3 space-y-3 bg-gray-50">
      <p className="text-xs font-semibold text-gray-600">New Category</p>

      <input
        autoFocus
        type="text"
        placeholder="Category name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-primary-500 bg-white"
      />

      {/* Parent (optional) */}
      {categories.length > 0 && (
        <div>
          <p className="text-[10px] text-gray-400 mb-1">Under (optional)</p>
          <select
            value={parentId ?? ''}
            onChange={(e) => setParentId(e.target.value ? Number(e.target.value) : undefined)}
            className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-primary-500 bg-white"
          >
            <option value="">— None (top-level) —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Icon picker */}
      <div>
        <p className="text-[10px] text-gray-400 mb-1">Icon</p>
        <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
          {ICON_OPTIONS.map((ic) => (
            <button
              key={ic}
              type="button"
              onClick={() => setIcon(ic)}
              className={cn(
                'w-7 h-7 rounded-lg flex items-center justify-center transition-all',
                icon === ic ? 'ring-2 ring-primary-500 bg-primary-50' : 'bg-white border border-gray-100',
              )}
            >
              <CategoryIcon name={ic} color={color} size={12} />
            </button>
          ))}
        </div>
      </div>

      {/* Color picker */}
      <div>
        <p className="text-[10px] text-gray-400 mb-1">Color</p>
        <div className="flex gap-1.5 flex-wrap">
          {COLOR_OPTIONS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={cn(
                'w-6 h-6 rounded-full border-2 transition-transform',
                color === c ? 'border-gray-700 scale-110' : 'border-transparent',
              )}
              style={{ backgroundColor: c }}
            />
          ))}
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-6 h-6 rounded-full border-0 p-0 cursor-pointer"
            title="Custom color"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-500 hover:bg-gray-100"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!name.trim() || saving}
          className="flex-1 py-1.5 rounded-lg bg-primary-500 text-white text-xs font-medium hover:bg-primary-600 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Create'}
        </button>
      </div>
    </div>
  );
}

// ─── Wallet Select ────────────────────────────────────────────────────────────

function WalletSelect({
  wallets,
  value,
  onChange,
}: {
  wallets: Wallet[];
  value: number | undefined;
  onChange: (id: number) => void;
}) {
  const selected = wallets.find((w) => w.id === value);
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none hover:border-primary-400 bg-white"
      >
        <span className={selected ? 'text-gray-800' : 'text-gray-400'}>
          {selected ? selected.name : 'Select wallet'}
        </span>
        <ChevronDown size={16} className="text-gray-400" />
      </button>
      {open && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          {wallets.map((w) => (
            <button
              key={w.id}
              type="button"
              onClick={() => {
                onChange(w.id);
                setOpen(false);
              }}
              className={cn(
                'w-full text-left px-3 py-2.5 text-sm hover:bg-gray-50 flex items-center justify-between',
                value === w.id && 'bg-primary-50 text-primary-700',
              )}
            >
              <span>{w.name}</span>
              <span className="text-xs text-gray-400">
                {Number(w.currentBalance).toLocaleString()}
              </span>
            </button>
          ))}
          {wallets.length === 0 && (
            <p className="px-3 py-2.5 text-sm text-gray-400">No wallets yet</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Attachments ──────────────────────────────────────────────────────────────

function AttachmentsSection({ transactionId }: { transactionId: number }) {
  const queryClient = useQueryClient();

  const { data: attachments = [] } = useQuery({
    queryKey: ['attachments', transactionId],
    queryFn: () => attachmentService.list(transactionId),
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => attachmentService.upload(transactionId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attachments', transactionId] });
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? 'Failed to upload photo');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (attachmentId: number) => attachmentService.delete(transactionId, attachmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attachments', transactionId] });
    },
    onError: () => toast.error('Failed to delete photo'),
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadMutation.mutate(file);
    e.target.value = '';
  }

  return (
    <div className="flex flex-wrap gap-2">
      {attachments.map((att) => (
        <div
          key={att.id}
          className="relative w-16 h-16 rounded-xl overflow-hidden border border-gray-200 group"
        >
          <img src={att.fileUrl} alt={att.fileName} className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={() => deleteMutation.mutate(att.id)}
            className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X size={10} />
          </button>
        </div>
      ))}

      <label
        className={cn(
          'w-16 h-16 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-primary-400 transition-colors',
          uploadMutation.isPending && 'pointer-events-none opacity-60',
        )}
      >
        {uploadMutation.isPending ? (
          <Loader2 size={16} className="text-gray-400 animate-spin" />
        ) : (
          <Paperclip size={16} className="text-gray-400" />
        )}
        <span className="text-[9px] text-gray-400">Add</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleFileChange}
        />
      </label>
    </div>
  );
}
