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
 * - When today is selected, slots starting within the next `LEAD_TIME_MINUTES`
 *   (or already started) are hidden - see below.
 *
 * `now` is accepted as a parameter (rather than always reading `new Date()`
 * internally) so callers can freeze one reference for an entire booking
 * session (see `BookingFlowSheet`'s `flowNow`) - otherwise re-deriving "now"
 * fresh every time a step remounts (e.g. after Previous/Next round-trips
 * through later steps) could silently shrink or empty out an already-shown
 * slot list purely because real wall-clock time advanced while the user was
 * filling in later steps, which reads as a bug, not real availability
 * changing.
 *
 * - Same-day slots additionally require `LEAD_TIME_MINUTES` of notice before
 *   their start time (confirmed: 1 hour) - realistic minimum notice to
 *   dispatch a professional. Once this pushes a date's slot list to empty
 *   (only possible for today, incl. today being Friday), `BookingFlowSheet`
 *   routes to the `no_slots_for_date` message screen instead of showing an
 *   empty Pills row.
 */

const FRIDAY = 5;
const SATURDAY = 6;
const SCHEDULABLE_DAY_COUNT = 6;
const WORKING_HOURS_START = 8;
const WORKING_HOURS_END = 18;
const FRIDAY_WORKING_HOURS_END = 14;
const LEAD_TIME_MINUTES = 60;

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

export function getHourSlots(
  selectedDate: Date,
  now: Date = new Date(),
  leadTimeMinutes: number = LEAD_TIME_MINUTES
): HourSlot[] {
  const isToday = isSameDay(selectedDate, now);
  const endHour =
    selectedDate.getDay() === FRIDAY ? FRIDAY_WORKING_HOURS_END : WORKING_HOURS_END;
  const cutoff = new Date(now.getTime() + leadTimeMinutes * 60_000);
  const slots: HourSlot[] = [];

  for (let hour = WORKING_HOURS_START; hour < endHour; hour++) {
    if (isToday) {
      const slotStart = new Date(selectedDate);
      slotStart.setHours(hour, 0, 0, 0);
      if (slotStart <= cutoff) continue;
    }
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
