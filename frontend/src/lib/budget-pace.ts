import { addDays, differenceInCalendarDays, format, parseISO, startOfDay } from 'date-fns';
import type { Budget } from '@/types';
import { countWeekdays } from '@/components/shared/WeekdayPicker';

export interface BudgetPace {
  /** At the current pace, what the period will end at */
  projected: number;
  /** Spending day the money runs out (null = it lasts) */
  runsOutOn: Date | null;
  /** Spending days left after today */
  daysLeft: number;
  status: 'over' | 'will-run-out' | 'tight' | 'ok' | 'not-started' | 'ended';
}

/**
 * Projects a budget forward at its current daily rate, counting only its
 * spending days (e.g. Mon–Fri for transport).
 */
export function budgetPace(b: Budget, now = new Date()): BudgetPace {
  const today = startOfDay(now);
  const start = parseISO(b.startDate.substring(0, 10));
  const end = parseISO(b.endDate.substring(0, 10));
  const days = b.activeWeekdays ?? [];
  const limit = Number(b.amount);
  const spent = b.spent;

  if (today < start) return { projected: spent, runsOutOn: null, daysLeft: countWeekdays(start, end, days), status: 'not-started' };
  const daysLeft = today < end ? countWeekdays(addDays(today, 1), end, days) : 0;
  if (spent >= limit) return { projected: spent, runsOutOn: null, daysLeft, status: 'over' };
  if (differenceInCalendarDays(end, today) < 0) return { projected: spent, runsOutOn: null, daysLeft: 0, status: 'ended' };

  const elapsed = Math.max(1, countWeekdays(start, today, days)); // spending days so far, incl. today
  const rate = spent / elapsed;
  const projected = spent + rate * daysLeft;

  let runsOutOn: Date | null = null;
  if (rate > 0 && projected > limit) {
    // walk forward over spending days until the money is gone
    let left = limit - spent;
    for (let d = addDays(today, 1); d <= end; d = addDays(d, 1)) {
      if (days.length && !days.includes(d.getDay())) continue;
      left -= rate;
      if (left <= 0) {
        runsOutOn = d;
        break;
      }
    }
  }
  const status = runsOutOn ? 'will-run-out' : projected > limit * 0.9 ? 'tight' : 'ok';
  return { projected, runsOutOn, daysLeft, status };
}

export const paceDay = (d: Date) => format(d, 'EEE d MMM');
