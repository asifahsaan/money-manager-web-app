import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ChevronDown, ChevronRight, Pencil, Plus, Search, Tags, Trash2, X } from 'lucide-react';
import { categoryService } from '@/services/category.service';
import { CATEGORY_ICONS, CATEGORY_ICON_NAMES } from '@/lib/category-icons';
import { apiErrorMessage } from '@/lib/api-error';
import { cn } from '@/lib/utils';
import type { Category, CategoryType } from '@/types';
import { CategoryIcon } from '@/pages/transactions/components/CategoryIcon';

const COLORS = [
  '#F97316', '#EAB308', '#22C55E', '#10B981', '#06B6D4', '#3B82F6',
  '#6366F1', '#8B5CF6', '#EC4899', '#EF4444', '#64748B', '#A16207',
];

type Draft = {
  id?: number;
  name: string;
  icon: string;
  color: string;
  parentCategoryId: number | null;
  /** Parent being edited: also give its sub-categories still on the default tag icon this icon */
  applyToChildren: boolean;
};

/** Settings → Categories: rename, re-icon, recolour, add and delete categories and sub-categories. */
export function CategoryManager({ accountId }: { accountId: number }) {
  const qc = useQueryClient();
  const [type, setType] = useState<CategoryType>('EXPENSE');
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const [draft, setDraft] = useState<Draft | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Category | null>(null);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories', accountId],
    queryFn: () => categoryService.list(accountId),
  });

  const parents = useMemo(() => categories.filter((c) => !c.parentCategoryId && c.type === type), [categories, type]);
  const q = query.trim().toLowerCase();
  const visible = parents
    .map((p) => {
      const kids = p.children ?? [];
      if (!q) return { p, kids };
      const parentHit = p.name.toLowerCase().includes(q);
      const kidHits = kids.filter((k) => k.name.toLowerCase().includes(q));
      return parentHit || kidHits.length ? { p, kids: parentHit ? kids : kidHits } : null;
    })
    .filter(Boolean) as { p: Category; kids: Category[] }[];
  const tagCount = parents.flatMap((p) => [p, ...(p.children ?? [])]).filter((c) => !c.icon || c.icon === 'tag').length;

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['categories', accountId] });
    // names/icons/colours show up everywhere
    qc.invalidateQueries({ queryKey: ['transactions'] });
    qc.invalidateQueries({ queryKey: ['budgets', accountId] });
    qc.invalidateQueries({ queryKey: ['recurrings', accountId] });
    qc.invalidateQueries({ queryKey: ['stats-summary'] });
  };

  const save = useMutation({
    mutationFn: async (d: Draft) => {
      const body = { name: d.name.trim(), icon: d.icon, color: d.color };
      if (d.id) {
        await categoryService.update(d.id, body);
        if (d.applyToChildren) {
          const kids = categories.find((c) => c.id === d.id)?.children ?? [];
          await Promise.all(
            kids.filter((k) => !k.icon || k.icon === 'tag').map((k) => categoryService.update(k.id, { icon: d.icon, color: d.color })),
          );
        }
        return;
      }
      await categoryService.create({ accountId, type, ...body, ...(d.parentCategoryId && { parentCategoryId: d.parentCategoryId }) });
    },
    onSuccess: (_, d) => {
      toast.success(d.id ? 'Category updated' : 'Category added');
      invalidate();
      setDraft(null);
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save the category')),
  });

  const remove = useMutation({
    mutationFn: (c: Category) => categoryService.delete(c.id),
    onSuccess: () => {
      toast.success('Category deleted');
      invalidate();
      setConfirmDelete(null);
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not delete the category')),
  });

  const openEdit = (c: Category) =>
    setDraft({ id: c.id, name: c.name, icon: c.icon ?? 'tag', color: c.color ?? COLORS[0], parentCategoryId: c.parentCategoryId, applyToChildren: false });
  const openNew = (parent?: Category) =>
    setDraft({ name: '', icon: parent?.icon ?? 'tag', color: parent?.color ?? COLORS[0], parentCategoryId: parent?.id ?? null, applyToChildren: false });

  const editingParent = draft?.id ? categories.find((c) => c.id === draft.id && !c.parentCategoryId) : undefined;
  const tagKids = editingParent?.children?.filter((k) => !k.icon || k.icon === 'tag').length ?? 0;

  return (
    <section className="rounded-xl border border-gray-200 bg-white">
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 px-4 py-3">
        <div className="mr-auto flex items-center gap-2 text-sm font-medium text-gray-700">
          <Tags size={16} /> Categories
        </div>
        <div className="flex rounded-lg bg-gray-100 p-0.5 text-xs font-semibold">
          {(['EXPENSE', 'INCOME'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={cn('rounded-md px-2.5 py-1 transition-colors', type === t ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted hover:text-ink')}
            >
              {t === 'EXPENSE' ? 'Expense' : 'Income'}
            </button>
          ))}
        </div>
        <button
          onClick={() => openNew()}
          className="flex h-7 items-center gap-1 rounded-lg px-2.5 text-xs font-semibold text-white"
          style={{ background: 'rgb(var(--c-brand-600))' }}
        >
          <Plus size={13} /> Add
        </button>
      </div>

      <div className="space-y-2 px-4 py-3">
        <label className="flex h-8 items-center gap-2 rounded-lg border border-line px-2.5">
          <Search size={13} className="text-ink-muted" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search categories" className="min-w-0 flex-1 bg-transparent text-xs text-ink outline-none" />
        </label>
        {tagCount > 0 && !q && (
          <p className="text-[11px] text-ink-muted">
            {tagCount} categor{tagCount === 1 ? 'y uses' : 'ies use'} the plain tag icon — tap ✏️ to give {tagCount === 1 ? 'it' : 'them'} a better one.
          </p>
        )}

        {isLoading ? (
          <div className="space-y-1.5">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-9" />)}</div>
        ) : visible.length === 0 ? (
          <p className="py-4 text-center text-xs text-ink-muted">{q ? 'No category matches.' : 'No categories yet.'}</p>
        ) : (
          <ul className="max-h-[420px] divide-y divide-gray-100 overflow-y-auto rounded-lg border border-gray-100">
            {visible.map(({ p, kids }) => {
              const open = q !== '' || !collapsed.has(p.id);
              return (
                <li key={p.id}>
                  <Row
                    cat={p}
                    leading={
                      kids.length ? (
                        <button
                          onClick={() => setCollapsed((s) => { const n = new Set(s); n.has(p.id) ? n.delete(p.id) : n.add(p.id); return n; })}
                          aria-label={open ? 'Collapse' : 'Expand'}
                          className="flex h-5 w-5 items-center justify-center rounded text-ink-muted hover:bg-gray-100"
                        >
                          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                      ) : <span className="w-5" />
                    }
                    meta={kids.length ? `${kids.length} sub` : undefined}
                    onEdit={() => openEdit(p)}
                    onAddChild={() => openNew(p)}
                    onDelete={p.isDefault ? undefined : () => setConfirmDelete(p)}
                  />
                  {open && kids.map((k) => (
                    <Row key={k.id} cat={k} indent onEdit={() => openEdit(k)} onDelete={k.isDefault ? undefined : () => setConfirmDelete(k)} />
                  ))}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Edit / add */}
      {draft && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDraft(null)} />
          <form
            onSubmit={(e) => { e.preventDefault(); if (draft.name.trim()) save.mutate(draft); }}
            className="relative flex max-h-[90vh] w-full max-w-md flex-col rounded-t-2xl bg-surface shadow-2xl sm:rounded-2xl"
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-3">
              <span className="text-sm font-bold text-ink">
                {draft.id ? 'Edit category' : draft.parentCategoryId ? `New sub-category in ${categories.find((c) => c.id === draft.parentCategoryId)?.name}` : `New ${type === 'EXPENSE' ? 'expense' : 'income'} category`}
              </span>
              <button type="button" onClick={() => setDraft(null)} aria-label="Close" className="rounded-lg p-1 hover:bg-gray-100"><X size={16} className="text-ink-muted" /></button>
            </div>
            <div className="space-y-3 overflow-y-auto px-5 py-4">
              <div className="flex items-center gap-3">
                <CategoryIcon name={draft.icon} color={draft.color} size={20} containerSize={44} />
                <div className="min-w-0 flex-1">
                  <label className="mb-1 block text-xs font-medium text-ink-muted">Name</label>
                  <input
                    autoFocus
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    maxLength={100}
                    placeholder="e.g. Rider to office"
                    className="h-10 w-full rounded-xl border border-line bg-surface px-3 text-sm text-ink focus:border-primary-500 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-xs font-medium text-ink-muted">Icon</p>
                <div className="grid grid-cols-8 gap-1.5">
                  {CATEGORY_ICON_NAMES.map((name) => {
                    const Icon = CATEGORY_ICONS[name];
                    const sel = draft.icon === name;
                    return (
                      <button
                        key={name}
                        type="button"
                        title={name.replace(/-/g, ' ')}
                        onClick={() => setDraft({ ...draft, icon: name })}
                        className={cn('flex aspect-square items-center justify-center rounded-lg border transition-colors', sel ? 'border-transparent text-white' : 'border-line text-ink-muted hover:border-gray-300 hover:text-ink')}
                        style={sel ? { backgroundColor: draft.color } : undefined}
                      >
                        <Icon size={16} />
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-xs font-medium text-ink-muted">Colour</p>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      aria-label={c}
                      onClick={() => setDraft({ ...draft, color: c })}
                      className={cn('h-7 w-7 rounded-full border-2 transition-transform', draft.color === c ? 'scale-110 border-ink' : 'border-transparent')}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              {tagKids > 0 && (
                <label className="flex cursor-pointer items-start gap-2 rounded-lg bg-primary-50 px-3 py-2 text-xs text-ink">
                  <input type="checkbox" checked={draft.applyToChildren} onChange={(e) => setDraft({ ...draft, applyToChildren: e.target.checked })} className="mt-0.5 accent-primary-600" />
                  <span>Also use this icon and colour for its <b>{tagKids}</b> sub-categor{tagKids === 1 ? 'y' : 'ies'} still on the plain tag icon</span>
                </label>
              )}
            </div>
            <div className="border-t border-line px-5 py-3">
              <button
                type="submit"
                disabled={save.isPending || !draft.name.trim()}
                className="h-10 w-full rounded-xl text-sm font-bold text-white disabled:opacity-60"
                style={{ background: 'rgb(var(--c-brand-600))' }}
              >
                {save.isPending ? 'Saving…' : draft.id ? 'Save changes' : 'Add category'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmDelete(null)} />
          <div className="relative w-full max-w-sm rounded-2xl bg-surface p-5 shadow-2xl">
            <h3 className="text-sm font-bold text-ink">Delete “{confirmDelete.name}”?</h3>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-ink-muted">
              <li>Its transactions stay, but become <b>uncategorised</b>.</li>
              {(confirmDelete.children?.length ?? 0) > 0 && <li>Its {confirmDelete.children!.length} sub-categories are deleted too.</li>}
              <li>Any budget for this category is removed.</li>
            </ul>
            <div className="mt-4 flex gap-2">
              <button onClick={() => setConfirmDelete(null)} className="h-9 flex-1 rounded-xl border border-line text-sm font-semibold text-ink hover:bg-gray-50">Cancel</button>
              <button
                onClick={() => remove.mutate(confirmDelete)}
                disabled={remove.isPending}
                className="h-9 flex-1 rounded-xl bg-red-500 text-sm font-bold text-white hover:bg-red-600 disabled:opacity-60"
              >
                {remove.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function Row({ cat, indent, leading, meta, onEdit, onAddChild, onDelete }: {
  cat: Category;
  indent?: boolean;
  leading?: React.ReactNode;
  meta?: string;
  onEdit: () => void;
  onAddChild?: () => void;
  onDelete?: () => void;
}) {
  const plain = !cat.icon || cat.icon === 'tag';
  return (
    <div className={cn('group flex items-center gap-2 py-1.5 pr-2', indent ? 'pl-10' : 'pl-2')}>
      {leading}
      <CategoryIcon name={cat.icon} color={cat.color} size={13} containerSize={26} />
      <button onClick={onEdit} className="min-w-0 flex-1 truncate text-left text-sm text-ink hover:text-primary-700">
        {cat.name}
        {meta && <span className="ml-1.5 text-[11px] text-ink-muted">{meta}</span>}
        {plain && <span className="ml-1.5 rounded bg-orange-50 px-1 text-[10px] font-medium text-orange-600">plain icon</span>}
      </button>
      <div className="flex items-center gap-0.5 opacity-70 group-hover:opacity-100">
        {onAddChild && (
          <button onClick={onAddChild} title="Add sub-category" className="rounded p-1 text-ink-muted hover:bg-gray-100 hover:text-ink"><Plus size={13} /></button>
        )}
        <button onClick={onEdit} title="Edit" className="rounded p-1 text-ink-muted hover:bg-gray-100 hover:text-ink"><Pencil size={13} /></button>
        {onDelete && (
          <button onClick={onDelete} title="Delete" className="rounded p-1 text-ink-muted hover:bg-red-50 hover:text-red-500"><Trash2 size={13} /></button>
        )}
      </div>
    </div>
  );
}
