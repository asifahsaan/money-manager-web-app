import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Plus, Check, X } from 'lucide-react';
import { useAccountStore } from '@/stores/account.store';
import { accountService } from '@/services/account.service';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

export function AccountSelector() {
  const [open, setOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { accounts, activeAccountId, setActiveAccount, activeAccount, setAccounts } =
    useAccountStore();
  const current = activeAccount();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!current) return null;

  return (
    <>
      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen((o) => !o)}
          className={cn(
            'flex items-center gap-1.5 rounded-xl px-3 py-2',
            'text-sm font-semibold text-app-text',
            'hover:bg-gray-100 transition-colors',
          )}
        >
          <span>{current.name}</span>
          <ChevronDown
            size={14}
            className={cn(
              'text-app-text-secondary transition-transform',
              open && 'rotate-180',
            )}
          />
        </button>

        {open && (
          <div
            className={cn(
              'absolute left-0 top-full z-50 mt-1 min-w-[200px]',
              'rounded-xl border border-app-border bg-white shadow-lg',
              'py-1 overflow-hidden',
            )}
          >
            {accounts.map((account) => (
              <button
                key={account.id}
                onClick={() => {
                  setActiveAccount(account.id);
                  setOpen(false);
                }}
                className={cn(
                  'w-full flex items-center justify-between px-4 py-2.5',
                  'text-sm text-left hover:bg-gray-50 transition-colors',
                  account.id === activeAccountId
                    ? 'text-primary-600 font-medium'
                    : 'text-app-text',
                )}
              >
                <div>
                  <div className="font-medium">{account.name}</div>
                  <div className="text-xs text-app-text-secondary">{account.currency}</div>
                </div>
                {account.id === activeAccountId && (
                  <Check size={14} className="text-primary-500 flex-shrink-0" />
                )}
              </button>
            ))}

            <div className="border-t border-app-border mt-1 pt-1">
              <button
                onClick={() => {
                  setOpen(false);
                  setShowCreate(true);
                }}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-app-text-secondary hover:bg-gray-50 transition-colors"
              >
                <Plus size={14} />
                <span>Add Account</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {showCreate && (
        <CreateAccountModal
          onClose={() => setShowCreate(false)}
          onCreated={async (newId) => {
            const res = await accountService.list();
            if (res.success) {
              setAccounts(res.data);
              setActiveAccount(newId);
            }
            setShowCreate(false);
          }}
        />
      )}
    </>
  );
}

function CreateAccountModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (newAccountId: number) => void;
}) {
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('Rs.');
  const [saving, setSaving] = useState(false);

  const CURRENCIES = ['Rs.', 'USD', 'EUR', 'GBP', 'AED', 'SAR', 'PKR', 'INR'];

  async function handleCreate() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await accountService.create({ name: name.trim(), currency });
      if (res.success) {
        toast.success('Account created');
        onCreated(res.data.id);
      }
    } catch {
      toast.error('Failed to create account');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-800">New Account</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Account Name</label>
            <input
              autoFocus
              type="text"
              placeholder="e.g. Personal, Business"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void handleCreate(); }}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Currency</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-primary-500 bg-white"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => void handleCreate()}
            disabled={!name.trim() || saving}
            className="w-full py-3 rounded-xl bg-primary-500 text-white font-semibold hover:bg-primary-600 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Creating...' : 'Create Account'}
          </button>
        </div>
      </div>
    </div>
  );
}
