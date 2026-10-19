import { COPY } from "@/lib/copy";

/**
 * Every job's `scheduled_time` is inherently an Israel-local business
 * concept (this app only serves Israel) - pinning date/time formatting to
 * this explicit zone, rather than "whatever timezone the current runtime
 * happens to be configured with", is correct both for consistency and for
 * matching what the time was actually meant to represent.
 */
const JOB_TIME_ZONE = "Asia/Jerusalem";

/**
 * Extracts a date's calendar/clock fields as seen in `JOB_TIME_ZONE`,
 * regardless of the runtime's own local timezone - added 2026-09-29 to
 * close a real (if not yet triggered locally) hydration-mismatch risk:
 * `formatJobDate`/`formatTimeWindow` previously used plain `Date` getters
 * (`getFullYear`/`getHours`/etc.), which read the *runtime's own* local
 * timezone - identical between this dev machine's server and browser
 * (both happen to be `Asia/Jerusalem`) purely by coincidence, but would
 * genuinely differ once deployed to infrastructure running in another
 * timezone (e.g. most hosts default to UTC) while every real customer is
 * in Israel - that mismatch would reproduce a real, deterministic
 * hydration error on every render (unlike the harmless dev-only Fast
 * Refresh artifact investigated the same day, which this is unrelated
 * to). `hourCycle: "h23"` (not `hour12: false`) specifically to avoid
 * `Intl`'s "24:00" midnight quirk some locale/timezone combinations have.
 */
function getIsraelDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: JOB_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    weekday: "short",
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  // Matches `Date#getDay()`'s convention (0 = Sunday) so `dayLetters[weekday]`
  // indexing below stays unchanged.
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));

  return {
    year: Number(get("year")),
    month: Number(get("month")), // 1-indexed, unlike `Date#getMonth()`
    day: Number(get("day")),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    weekday,
  };
}

/**
 * Formats a date for the Active Job Card per /docs/home-screen-prd.md 3.1:
 * "if today -> show 'היום'", otherwise "יום ה', 18.11" style.
 * Text/template come from `COPY.homeScreen.activeJobCard` (/docs/copy-deck.md).
 */
export function formatJobDate(isoDate: string): string {
  const jobParts = getIsraelDateParts(new Date(isoDate));
  const todayParts = getIsraelDateParts(new Date());

  const isToday =
    jobParts.year === todayParts.year && jobParts.month === todayParts.month && jobParts.day === todayParts.day;

  if (isToday) return COPY.homeScreen.activeJobCard.dateToday;

  const dayLetter = COPY.homeScreen.activeJobCard.dayLetters[jobParts.weekday];
  const day = String(jobParts.day).padStart(2, "0");
  const month = String(jobParts.month).padStart(2, "0");

  return COPY.homeScreen.activeJobCard.dateFormat
    .replace("{dayLetter}", dayLetter)
    .replace("{dd}", day)
    .replace("{mm}", month);
}

/**
 * Formats a scheduled time as a window label, e.g. "15:00-16:00".
 *
 * Window length follows /docs/project-prd.md step 4 ("Select time slot
 * (1-hour window)") / /docs/client-booking-flow-prd.md Step 3.
 */
export function formatTimeWindow(isoDate: string): string {
  const start = new Date(isoDate);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const fmt = (d: Date) => {
    const { hour, minute } = getIsraelDateParts(d);
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  };
  return `${fmt(start)}-${fmt(end)}`;
}

/**
 * Whether the current moment is already within `hours` of `isoDate` - added
 * 2026-09-29 for `JobDetailsScreen`'s "call the professional" button, which
 * per product direction should appear starting 2 hours before the job's
 * `scheduled_time` and not before (no upper bound - once it can appear, it
 * stays, including after the window has started/passed, e.g. a late
 * professional the customer still needs to reach). Plain `Date.now()`
 * comparison, not a live ticking timer - same "check at render time" level
 * of precision every other status-derived flag on this screen already
 * uses; a customer who leaves this screen open across the exact 2-hour
 * mark sees the button appear on next render, not necessarily live.
 */
export function isWithinHoursBefore(isoDate: string, hours: number): boolean {
  return Date.now() >= new Date(isoDate).getTime() - hours * 60 * 60 * 1000;
}
