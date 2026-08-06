import { COPY } from "@/lib/copy";

/**
 * Date + time-slot options for the Booking Flow Scheduling step
 * (/docs/client-booking-flow-prd.md Step 3).
 *
 * Business rules (confirmed):
 * - 6 selectable dates, starting from and including today.
 * - Saturday excluded; Friday is a normal selectable day but with shortened
 *   working hours (last slot ends at 14:00, vs. 18:00 on other days).
 * - 1-hour time slots within working hours.
 * - When today is selected, slots that have already started are hidden.
 */

const FRIDAY = 5;
const SATURDAY = 6;
const SCHEDULABLE_DAY_COUNT = 6;
const WORKING_HOURS_START = 8;
const WORKING_HOURS_END = 18;
const FRIDAY_WORKING_HOURS_END = 14;

export interface SchedulableDate {
  /** Midnight-normalized date, used as both the value and the pill key. */
  date: Date;
  isToday: boolean;
  /** "היום" for today, otherwise a day-letter like "ג׳". */
  label: string;
}

export interface HourSlot {
  /** Hour of day the slot starts at, e.g. 8 for the 08:00-09:00 slot. */
  startHour: number;
  /** "08-09" style label, matching the Figma pill text. */
  label: string;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function getSchedulableDates(now: Date = new Date()): SchedulableDate[] {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dates: SchedulableDate[] = [];

  const cursor = new Date(today);
  while (dates.length < SCHEDULABLE_DAY_COUNT) {
    if (cursor.getDay() !== SATURDAY) {
      const isToday = isSameDay(cursor, today);
      dates.push({
        date: new Date(cursor),
        isToday,
        label: isToday
          ? COPY.homeScreen.activeJobCard.dateToday
          : COPY.homeScreen.activeJobCard.dayLetters[cursor.getDay()],
      });
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

function formatHourRange(startHour: number): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(startHour)}-${pad(startHour + 1)}`;
}

export function getHourSlots(selectedDate: Date, now: Date = new Date()): HourSlot[] {
  const isToday = isSameDay(selectedDate, now);
  const endHour =
    selectedDate.getDay() === FRIDAY ? FRIDAY_WORKING_HOURS_END : WORKING_HOURS_END;
  const slots: HourSlot[] = [];

  for (let hour = WORKING_HOURS_START; hour < endHour; hour++) {
    if (isToday && hour <= now.getHours()) continue;
    slots.push({ startHour: hour, label: formatHourRange(hour) });
  }

  return slots;
}

/** Combines a selected date + hour slot into the `jobs.scheduled_time` value. */
export function buildScheduledTime(date: Date, startHour: number): Date {
  const result = new Date(date);
  result.setHours(startHour, 0, 0, 0);
  return result;
}
