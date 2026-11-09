import apiClient from '@/lib/axios';
import { ApiResponse } from '@/types';

export type AuditEntity = 'Transaction' | 'Wallet' | 'Category' | 'Budget' | 'Goal' | 'GoalEntry' | 'Debt' | 'DebtEntry' | 'Recurring';
export type AuditAction = 'created' | 'updated' | 'deleted';
export type AuditRow = Record<string, unknown>;

export interface AuditChange {
  id: number;
  entity: AuditEntity;
  entityId: number | null;
  action: AuditAction;
  /** Fields that differ, for an update */
  changed: string[];
  /** A follow-on update the app made itself (a wallet balance, a debt's remaining amount) */
  sideEffect: boolean;
  before: AuditRow | null;
  after: AuditRow | null;
}

/** One action: everything a single save or delete changed */
export interface AuditEntry {
  requestId: string;
  at: string;
  method: string;
  path: string;
  changes: AuditChange[];
}

export interface AuditPage {
  entries: AuditEntry[];
  total: number;
  page: number;
  pages: number;
  names: {
    wallets: Record<string, string>;
    categories: Record<string, string>;
    debts: Record<string, string>;
    goals: Record<string, string>;
  };
}

export const auditService = {
  list: (params: { accountId: number; page: number; limit?: number; entity?: string; action?: string }) =>
    apiClient.get<ApiResponse<AuditPage>>('/audit-logs', { params }).then((r) => r.data.data),
};
