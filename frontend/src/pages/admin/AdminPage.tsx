import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  Users, TrendingUp, Activity, Wallet, BarChart2,
  Search, Shield, ShieldOff, Trash2, Eye,
  ChevronLeft, ChevronRight, X, CheckCircle, XCircle,
} from 'lucide-react';
import { adminService, AdminUser } from '@/services/admin.service';
import { useAuthStore } from '@/stores/auth.store';
import { formatCurrency, cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

type Tab = 'dashboard' | 'users' | 'reports';

function KpiCard({ label, value, sub, color, icon: Icon }: {
  label: string; value: string | number; sub?: string; color: string;
  icon: LucideIcon;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-400 font-medium mb-1">{label}</p>
          <p className="text-2xl font-black text-gray-800">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: color + '20', color }}>
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
}

export function AdminPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('dashboard');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<AdminUser | null>(null);

  const isSuperAdmin = user?.role === 'SUPERADMIN';

  // Redirect non-admins
  if (user && user.role === 'USER') {
    navigate('/');
    return null;
  }

  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: adminService.getStats,
  });

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users', search, page],
    queryFn: () => adminService.getUsers(search || undefined, page),
  });

  const { data: growth = [] } = useQuery({
    queryKey: ['admin-growth'],
    queryFn: () => adminService.getUserGrowth(12),
    enabled: isSuperAdmin && tab === 'reports',
  });

  const { data: trend = [] } = useQuery({
    queryKey: ['admin-trend'],
    queryFn: () => adminService.getTransactionTrend(6),
    enabled: isSuperAdmin && tab === 'reports',
  });

  const { data: topCats = [] } = useQuery({
    queryKey: ['admin-top-cats'],
    queryFn: () => adminService.getTopCategories(10),
    enabled: isSuperAdmin && tab === 'reports',
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { role?: string; isActive?: boolean } }) =>
      adminService.updateUser(id, data),
    onSuccess: () => {
      toast.success('User updated');
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
      setSelectedUser(null);
    },
    onError: () => toast.error('Failed to update user'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminService.deleteUser(id),
    onSuccess: () => {
      toast.success('User deleted');
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
      setDeleteConfirm(null);
    },
    onError: () => toast.error('Failed to delete user'),
  });

  const roleColors: Record<string, string> = {
    SUPERADMIN: '#8B5CF6',
    ADMIN: '#F59E0B',
    USER: '#6B7280',
  };

  const roleBg: Record<string, string> = {
    SUPERADMIN: 'bg-purple-50 text-purple-700',
    ADMIN: 'bg-amber-50 text-amber-700',
    USER: 'bg-gray-50 text-gray-600',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#fbbf24,#f97316)' }}>
            <Shield size={16} color="white" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-800">Admin Panel</p>
            <p className="text-[10px] text-gray-400">Money Manager</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={cn('text-xs px-2.5 py-1 rounded-full font-semibold', roleBg[user?.role ?? 'USER'])}>
            {user?.role}
          </span>
          <button onClick={() => navigate('/')}
            className="text-xs text-gray-500 hover:text-gray-800 border border-gray-200 px-3 py-1.5 rounded-xl transition-colors">
            ← App
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="bg-white border-b border-gray-200 px-6">
        <div className="flex gap-1">
          {([
            { key: 'dashboard', label: 'Dashboard', icon: Activity },
            { key: 'users', label: 'Users', icon: Users },
            ...(isSuperAdmin ? [{ key: 'reports', label: 'BI Reports', icon: BarChart2 }] : []),
          ] as { key: Tab; label: string; icon: LucideIcon }[]).map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors',
                tab === key ? 'border-amber-400 text-amber-700' : 'border-transparent text-gray-500 hover:text-gray-700',
              )}>
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto">

        {/* ── DASHBOARD ── */}
        {tab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard label="Total Users" value={stats?.totalUsers ?? '…'} sub={`${stats?.activeUsers ?? 0} active`} color="#3B82F6" icon={Users} />
              <KpiCard label="New This Month" value={stats?.newUsersThisMonth ?? '…'}
                sub={stats?.userGrowthPct != null ? `${stats.userGrowthPct > 0 ? '+' : ''}${stats.userGrowthPct.toFixed(0)}% vs last month` : undefined}
                color="#10B981" icon={TrendingUp} />
              <KpiCard label="Total Transactions" value={stats?.totalTransactions ?? '…'} sub={`${stats?.txThisMonth ?? 0} this month`} color="#F59E0B" icon={Activity} />
              <KpiCard label="Expense Volume" value={stats ? formatCurrency(stats.totalExpenseVolume, 'Rs.') : '…'} sub="all time" color="#EF4444" icon={Wallet} />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard label="Total Accounts" value={stats?.totalAccounts ?? '…'} sub="finance profiles" color="#8B5CF6" icon={Shield} />
              <KpiCard label="Total Wallets" value={stats?.totalWallets ?? '…'} sub="across all users" color="#EC4899" icon={Wallet} />
              <KpiCard label="Inactive Users" value={stats?.inactiveUsers ?? '…'} sub="deactivated" color="#6B7280" icon={ShieldOff} />
              <KpiCard label="This Month Volume" value={stats ? formatCurrency(stats.expenseVolumeThisMonth, 'Rs.') : '…'} sub="expenses" color="#F97316" icon={TrendingUp} />
            </div>

            {/* Quick user table preview */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-bold text-gray-800">Recent Users</p>
                <button onClick={() => setTab('users')} className="text-xs text-amber-600 font-semibold hover:underline">
                  View all →
                </button>
              </div>
              <div className="space-y-2">
                {(usersData?.users ?? []).slice(0, 5).map((u) => (
                  <div key={u.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ backgroundColor: roleColors[u.role] }}>
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">{u.name}</p>
                      <p className="text-[10px] text-gray-400 truncate">{u.email}</p>
                    </div>
                    <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0', roleBg[u.role])}>{u.role}</span>
                    <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0',
                      u.isActive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500')}>
                      {u.isActive ? 'active' : 'inactive'}
                    </span>
                    <p className="text-[10px] text-gray-400 flex-shrink-0">{u.txCount} tx</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── USERS ── */}
        {tab === 'users' && (
          <div className="space-y-4">
            {/* Search */}
            <div className="flex items-center gap-3 bg-white rounded-2xl border border-gray-200 px-4 py-3">
              <Search size={16} className="text-gray-400 flex-shrink-0" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search by name or email…"
                className="flex-1 text-sm focus:outline-none text-gray-700 placeholder-gray-400"
              />
              {search && <button onClick={() => setSearch('')}><X size={14} className="text-gray-400" /></button>}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {['User', 'Role', 'Status', 'Transactions', 'Joined', 'Actions'].map((h) => (
                      <th key={h} className="text-left text-[10px] font-bold text-gray-500 uppercase tracking-wide px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {usersLoading ? (
                    <tr><td colSpan={6} className="text-center py-8 text-sm text-gray-400">Loading…</td></tr>
                  ) : (usersData?.users ?? []).map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                            style={{ backgroundColor: roleColors[u.role] }}>
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-gray-800 truncate max-w-[150px]">{u.name}</p>
                            <p className="text-[10px] text-gray-400 truncate max-w-[150px]">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('text-[10px] px-2 py-1 rounded-full font-semibold', roleBg[u.role])}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('text-[10px] px-2 py-1 rounded-full font-semibold',
                          u.isActive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500')}>
                          {u.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 font-semibold">{u.txCount}</td>
                      <td className="px-4 py-3 text-[10px] text-gray-400">
                        {format(new Date(u.createdAt), 'MMM d, yyyy')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setSelectedUser(u)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-blue-500 transition-colors">
                            <Eye size={13} />
                          </button>
                          {isSuperAdmin && u.email !== user?.email && (
                            <button onClick={() => setDeleteConfirm(u)}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {(usersData?.pages ?? 1) > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                  <p className="text-xs text-gray-400">
                    Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, usersData?.total ?? 0)} of {usersData?.total ?? 0}
                  </p>
                  <div className="flex gap-1">
                    <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30"><ChevronLeft size={14} /></button>
                    <button disabled={page === (usersData?.pages ?? 1)} onClick={() => setPage(p => p + 1)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30"><ChevronRight size={14} /></button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── BI REPORTS (SUPERADMIN only) ── */}
        {tab === 'reports' && isSuperAdmin && (
          <div className="space-y-6">
            {/* User Growth */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <p className="text-sm font-bold text-gray-800 mb-4">User Growth (12 months)</p>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={growth}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => v.substring(5)} />
                  <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} width={30} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #E5E7EB' }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="cumulative" stroke="#3B82F6" strokeWidth={2} dot={false} name="Total Users" />
                  <Line type="monotone" dataKey="users" stroke="#10B981" strokeWidth={2} dot={false} name="New Users" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Transaction Trend */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <p className="text-sm font-bold text-gray-800 mb-4">Platform Transaction Volume (6 months)</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={trend} barSize={14} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => v.substring(5)} />
                  <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} width={40}
                    tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number) => formatCurrency(v, 'Rs.')} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="income" fill="#10B981" radius={[4, 4, 0, 0]} name="Income" />
                  <Bar dataKey="expense" fill="#EF4444" radius={[4, 4, 0, 0]} name="Expense" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Top Categories */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <p className="text-sm font-bold text-gray-800 mb-4">Top Spending Categories (Platform-wide)</p>
              <div className="space-y-3">
                {topCats.map((c, i) => {
                  const max = topCats[0]?.totalAmount ?? 1;
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 text-white text-[10px] font-bold"
                        style={{ backgroundColor: c.category?.color ?? '#6B7280' }}>
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-gray-700">{c.category?.name ?? 'Uncategorized'}</span>
                          <span className="text-xs font-bold text-gray-800">{formatCurrency(c.totalAmount, 'Rs.')}</span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{
                            width: `${(c.totalAmount / max) * 100}%`,
                            backgroundColor: c.category?.color ?? '#6B7280',
                          }} />
                        </div>
                        <p className="text-[10px] text-gray-400 mt-0.5">{c.txCount} transactions</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── User Detail / Edit Modal ── */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedUser(null)} />
          <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: roleColors[selectedUser.role] }}>
                  {selectedUser.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800">{selectedUser.name}</p>
                  <p className="text-xs text-gray-400">{selectedUser.email}</p>
                </div>
              </div>
              <button onClick={() => setSelectedUser(null)} className="p-1 rounded-lg hover:bg-gray-100">
                <X size={16} className="text-gray-400" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-gray-400 mb-0.5">Transactions</p>
                  <p className="text-sm font-black text-gray-800">{selectedUser.txCount}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-gray-400 mb-0.5">Accounts</p>
                  <p className="text-sm font-black text-gray-800">{selectedUser._count.accounts}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-[10px] text-gray-400 mb-0.5">Joined</p>
                  <p className="text-[11px] font-bold text-gray-800">{format(new Date(selectedUser.createdAt), 'MMM d, yy')}</p>
                </div>
              </div>

              {/* Role */}
              {isSuperAdmin && selectedUser.email !== user?.email && (
                <div>
                  <label className="text-xs text-gray-500 mb-1.5 block font-medium">Role</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['USER', 'ADMIN', 'SUPERADMIN'] as const).map((r) => (
                      <button key={r} onClick={() => updateMutation.mutate({ id: selectedUser.id, data: { role: r } })}
                        className={cn(
                          'py-2 rounded-xl text-xs font-semibold border-2 transition-all',
                          selectedUser.role === r
                            ? 'border-amber-400 bg-amber-50 text-amber-800'
                            : 'border-gray-200 text-gray-500 hover:border-gray-300',
                        )}>
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Active toggle */}
              {selectedUser.email !== user?.email && (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div>
                    <p className="text-xs font-semibold text-gray-700">Account Status</p>
                    <p className="text-[10px] text-gray-400">
                      {selectedUser.isActive ? 'User can log in' : 'User is blocked from logging in'}
                    </p>
                  </div>
                  <button
                    onClick={() => updateMutation.mutate({ id: selectedUser.id, data: { isActive: !selectedUser.isActive } })}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors',
                      selectedUser.isActive
                        ? 'bg-red-50 text-red-600 hover:bg-red-100'
                        : 'bg-green-50 text-green-600 hover:bg-green-100',
                    )}>
                    {selectedUser.isActive
                      ? <><XCircle size={13} /> Deactivate</>
                      : <><CheckCircle size={13} /> Activate</>}
                  </button>
                </div>
              )}

              {/* Last activity */}
              {selectedUser.lastActivity && (
                <p className="text-[10px] text-gray-400 text-center">
                  Last transaction: {format(new Date(selectedUser.lastActivity), 'MMM d, yyyy')}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-white w-full max-w-xs rounded-2xl shadow-2xl p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
              <Trash2 size={22} className="text-red-500" />
            </div>
            <h3 className="font-bold text-gray-800 text-sm mb-1">Delete User?</h3>
            <p className="text-xs text-gray-400 mb-1">
              <span className="font-semibold text-gray-600">{deleteConfirm.name}</span>
            </p>
            <p className="text-xs text-gray-400 mb-5">
              This will permanently delete the user and all their data. Cannot be undone.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
                Cancel
              </button>
              <button onClick={() => deleteMutation.mutate(deleteConfirm.id)} disabled={deleteMutation.isPending}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-red-500 hover:bg-red-600 disabled:opacity-60 transition-colors">
                {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
