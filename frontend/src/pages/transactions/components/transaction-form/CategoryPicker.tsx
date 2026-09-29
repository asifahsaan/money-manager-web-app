import { useState } from 'react';
import toast from 'react-hot-toast';
import { X, ChevronDown, Search, Plus, Check, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CATEGORY_ICON_NAMES } from '@/lib/category-icons';
import { categoryService, CreateCategoryData } from '@/services/category.service';
import { Category, CategoryType } from '@/types';
import { CategoryIcon } from '../CategoryIcon';

// ─── Category Picker ──────────────────────────────────────────────────────────

const ICON_OPTIONS = CATEGORY_ICON_NAMES;

const COLOR_OPTIONS = [
  '#F97316', '#EAB308', '#3B82F6', '#10B981', '#8B5CF6',
  '#EC4899', '#06B6D4', '#EF4444', '#6B7280', '#F59E0B',
];

export function CategoryPicker({
  categories,
  value,
  onChange,
  accountId,
  type,
  onCreated,
  embedded = false,
  onDismiss,
}: {
  categories: Category[];
  value: number | undefined;
  onChange: (id: number) => void;
  accountId: number;
  type: CategoryType;
  onCreated: () => void;
  /** Opened from the "More" chip: no trigger button, list shown immediately */
  embedded?: boolean;
  onDismiss?: () => void;
}) {
  const [open, setOpen] = useState(embedded);
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
    onDismiss?.();
  }

  return (
    <div>
      {/* Trigger */}
      {!embedded && (
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
      )}

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
              onDismiss?.();
            }}
            onCancel={() => (embedded ? onDismiss?.() : setShowCreate(false))}
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
