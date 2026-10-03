import { RecurringFrequency } from '@prisma/client';
import { addDays, addMonths, addWeeks, addYears } from 'date-fns';

// Recurring dates are @db.Date values: UTC midnights.

/** The first date on or after `from` that falls on one of `weekdays` (empty = `from` itself). */
export function alignToWeekdays(from: Date, weekdays: number[]): Date {
  if (!weekdays.length) return from;
  let d = from;
  for (let i = 0; i < 7 && !weekdays.includes(d.getUTCDay()); i++) d = addDays(d, 1);
  return d;
}

/** The occurrence after `from`. */
export function nextOccurrenceAfter(from: Date, frequency: RecurringFrequency, weekdays: number[] = []): Date {
  if (frequency === 'WEEKLY' && weekdays.length) return alignToWeekdays(addDays(from, 1), weekdays);
  switch (frequency) {
    case 'DAILY': return addDays(from, 1);
    case 'WEEKLY': return addWeeks(from, 1);
    case 'MONTHLY': return addMonths(from, 1);
    case 'YEARLY': return addYears(from, 1);
    default: return addMonths(from, 1);
  }
}

/** Today in Pakistan as a UTC midnight, matching @db.Date values. */
export function todayInPakistan(now = new Date()): Date {
  const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(now);
  return new Date(`${ymd}T00:00:00.000Z`);
}

/** The current time in Pakistan as "HH:MM". */
export function timeInPakistan(now = new Date()): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Karachi', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now);
}
