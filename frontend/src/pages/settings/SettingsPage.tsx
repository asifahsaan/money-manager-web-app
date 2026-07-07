import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { LogOut, User as UserIcon, Lock, Wallet, Mail } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { useAccountStore } from '@/stores/account.store';
import { userService } from '@/services/user.service';
import { accountService } from '@/services/account.service';

const CURRENCIES = ['Rs.', '$', '€', '£', '₹', '¥', 'AED', 'SAR'];

const profileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
});

const emailSchema = z.object({
  newEmail: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Required'),
    newPassword: z.string().min(6, 'At least 6 characters'),
    confirmPassword: z.string().min(1, 'Required'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ProfileFormData = z.infer<typeof profileSchema>;
type EmailFormData = z.infer<typeof emailSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

export function SettingsPage() {
  const { user, setAuth, token, clearAuth } = useAuthStore();
  const activeAccount = useAccountStore((s) => s.activeAccount());
  const accounts = useAccountStore((s) => s.accounts);
  const setAccounts = useAccountStore((s) => s.setAccounts);
  const qc = useQueryClient();
  const [currency, setCurrency] = useState(activeAccount?.currency ?? 'Rs.');

  const {
    register: regP,
    handleSubmit: hsP,
    formState: { errors: errP },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name ?? '' },
  });

  const {
    register: regE,
    handleSubmit: hsE,
    reset: resetE,
    formState: { errors: errE },
  } = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
  });

  const {
    register: regPw,
    handleSubmit: hsPw,
    reset: resetPw,
    formState: { errors: errPw },
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  const profileMutation = useMutation({
    mutationFn: (data: ProfileFormData) => userService.updateProfile(data),
    onSuccess: (updated) => {
      if (token) setAuth(updated, token);
      toast.success('Profile updated');
    },
    onError: () => toast.error('Failed to update profile'),
  });

  const emailMutation = useMutation({
    mutationFn: (data: EmailFormData) => userService.changeEmail(data.newEmail, data.password),
    onSuccess: (updated) => {
      if (token) setAuth(updated, token);
      toast.success('Email updated');
      resetE();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? 'Failed to update email');
    },
  });

  const currencyMutation = useMutation({
    mutationFn: (newCurrency: string) =>
      accountService.update(activeAccount!.id, { currency: newCurrency }),
    onSuccess: (res) => {
      const updated = accounts.map((a) => (a.id === res.data.id ? res.data : a));
      setAccounts(updated);
      qc.invalidateQueries();
      toast.success('Currency updated');
    },
    onError: () => toast.error('Failed to update currency'),
  });

  const passwordMutation = useMutation({
    mutationFn: (data: PasswordFormData) =>
      userService.changePassword(data.currentPassword, data.newPassword),
    onSuccess: () => {
      toast.success('Password changed');
      resetPw();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? 'Failed to change password');
    },
  });

  function handleCurrencyChange(value: string) {
    setCurrency(value);
    if (activeAccount) currencyMutation.mutate(value);
  }

  return (
    <div className="max-w-xl mx-auto p-4 space-y-6">
      <h2 className="text-lg font-semibold text-gray-800">Settings</h2>

      {/* Profile */}
      <section className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <UserIcon size={16} /> Profile
        </div>
        <form onSubmit={hsP((d) => profileMutation.mutate(d))} className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Name</label>
            <input
              {...regP('name')}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
            />
            {errP.name && <p className="text-red-500 text-xs mt-1">{errP.name.message}</p>}
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Email</label>
            <input
              value={user?.email ?? ''}
              disabled
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-400"
            />
          </div>
          <button
            type="submit"
            disabled={profileMutation.isPending}
            className="w-full bg-primary-500 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {profileMutation.isPending ? 'Saving…' : 'Save Profile'}
          </button>
        </form>
      </section>

      {/* Change Email */}
      <section className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <Mail size={16} /> Change Email
        </div>
        <p className="text-xs text-gray-400">Current: <span className="font-medium text-gray-600">{user?.email}</span></p>
        <form onSubmit={hsE((d) => emailMutation.mutate(d))} className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">New Email</label>
            <input
              type="email"
              {...regE('newEmail')}
              placeholder="new@example.com"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
            />
            {errE.newEmail && <p className="text-red-500 text-xs mt-1">{errE.newEmail.message}</p>}
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Confirm with Password</label>
            <input
              type="password"
              {...regE('password')}
              placeholder="Your current password"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
            />
            {errE.password && <p className="text-red-500 text-xs mt-1">{errE.password.message}</p>}
          </div>
          <button
            type="submit"
            disabled={emailMutation.isPending}
            className="w-full bg-primary-500 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {emailMutation.isPending ? 'Updating…' : 'Update Email'}
          </button>
        </form>
      </section>

      {/* Currency */}
      <section className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <Wallet size={16} /> Currency
        </div>
        <p className="text-xs text-gray-400">
          Applies to account: <span className="font-medium">{activeAccount?.name}</span>
        </p>
        <select
          value={currency}
          onChange={(e) => handleCurrencyChange(e.target.value)}
          disabled={!activeAccount || currencyMutation.isPending}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
        >
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </section>

      {/* Change Password */}
      <section className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <Lock size={16} /> Change Password
        </div>
        <form onSubmit={hsPw((d) => passwordMutation.mutate(d))} className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Current Password</label>
            <input
              type="password"
              {...regPw('currentPassword')}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
            />
            {errPw.currentPassword && (
              <p className="text-red-500 text-xs mt-1">{errPw.currentPassword.message}</p>
            )}
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">New Password</label>
            <input
              type="password"
              {...regPw('newPassword')}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
            />
            {errPw.newPassword && (
              <p className="text-red-500 text-xs mt-1">{errPw.newPassword.message}</p>
            )}
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Confirm New Password</label>
            <input
              type="password"
              {...regPw('confirmPassword')}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
            />
            {errPw.confirmPassword && (
              <p className="text-red-500 text-xs mt-1">{errPw.confirmPassword.message}</p>
            )}
          </div>
          <button
            type="submit"
            disabled={passwordMutation.isPending}
            className="w-full bg-primary-500 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {passwordMutation.isPending ? 'Updating…' : 'Change Password'}
          </button>
        </form>
      </section>

      {/* Logout */}
      <button
        onClick={() => clearAuth()}
        className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 py-2.5 rounded-lg text-sm font-medium hover:bg-red-100"
      >
        <LogOut size={16} /> Log Out
      </button>
    </div>
  );
}
