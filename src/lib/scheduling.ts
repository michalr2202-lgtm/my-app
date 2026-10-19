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

const URGENT_NOW_ROUNDING_MINUTES = 30;

/**
 * `BookingFlowSheet`'s "urgent now" fallback `scheduledTime` (added
 * 2026-09-07, replacing a raw, unrounded `new Date()` - see
 * `client-booking-flow-prd.md` Step 3's "Home Screen Time Pill entry"
 * bullet). Every other path reaches this step's real `SchedulingHourStep`
 * and always lands on a round hour; "urgent now" skips that step entirely
 * (there's nothing to pick, it's "right now"), so without this the
 * recap/`ActiveJobCard` would otherwise show an ugly window like
 * "14:37-15:37" instead of a clean block.
 *
 * Two confirmed decisions (2026-09-07):
 *
 * 1. Rounds UP only, to the nearest half-hour - never down. A floor could
 *    let the displayed 1-hour window's end land *before* the real
 *    60-minute arrival guarantee (`project-prd.md` "Immediate ('Now')
 *    Job Matching"), understating what's actually promised. Half-hour
 *    (not full-hour) granularity was chosen specifically to keep the
 *    worst-case/average gap between this display and that real guarantee
 *    roughly half of what full-hour-only rounding would produce (89 min
 *    vs. 119 min worst case), at the cost of occasionally starting on a
 *    ":30" instead of always ":00" - confirmed an acceptable trade-off.
 * 2. Deliberately has NO business-hours cap. A cap (e.g. clamping a
 *    17:45 request back to the last bookable slot, 17:00) was
 *    investigated and found unsound: rounding alone can never push a
 *    time from *before* an hour to *after* it (the half-hour boundaries
 *    straddle every hour exactly), so the only way to "cap" a late
 *    request is to clamp it *backward* - which would display a window
 *    that already looks past relative to the real request, worse than
 *    the overstatement problem this function exists to solve.
 *    "Immediate Now" has no business-hours gate in the PRD anyway (it's
 *    a 24/7 feature), so an occasional result like "18:00-18:30" or
 *    "02:30-03:30" is the correct, honest behavior here, even though the
 *    *scheduled* flow's own slot list (`getHourSlots` above) never
 *    offers those hours.
 */
export function roundUrgentNowScheduledTime(now: Date): Date {
  const result = new Date(now);
  const hasRemainder = result.getSeconds() !== 0 || result.getMilliseconds() !== 0;
  const totalMinutes = result.getHours() * 60 + result.getMinutes() + (hasRemainder ? 1 : 0);
  const roundedMinutes = Math.ceil(totalMinutes / URGENT_NOW_ROUNDING_MINUTES) * URGENT_NOW_ROUNDING_MINUTES;
  // `setHours`'s minutes argument normalizes overflow on its own (e.g.
  // 1440 -> next day 00:00), so a request near midnight rolls over
  // correctly without any separate day-boundary handling here.
  result.setHours(0, roundedMinutes, 0, 0);
  return result;
}
