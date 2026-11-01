import { useQuery } from '@tanstack/react-query';
import { adminService } from '@/services/admin.service';

// "Seen" is remembered per device; a device that has never looked counts the last 7 days.
const KEY = 'mm_admin_signups_seen';

export function signupsSeenAt(): string {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved) return saved;
  } catch { /* storage blocked */ }
  return new Date(Date.now() - 7 * 86_400_000).toISOString();
}

export function markSignupsSeen() {
  try {
    localStorage.setItem(KEY, new Date().toISOString());
  } catch { /* storage blocked */ }
}

/** How many people signed up since the admin last opened the Users tab. */
export function useNewSignups(enabled: boolean) {
  const { data = 0 } = useQuery({
    queryKey: ['admin-new-signups'],
    queryFn: () => adminService.countNewUsers(signupsSeenAt()),
    enabled,
    refetchInterval: 5 * 60_000,
  });
  return data;
}
