import { COPY } from "@/lib/copy";

/**
 * Formats a date for the Active Job Card per /docs/home-screen-prd.md 3.1:
 * "if today -> show 'היום'", otherwise "יום ה', 18.11" style.
 * Text/template come from `COPY.homeScreen.activeJobCard` (/docs/copy-deck.md).
 */
export function formatJobDate(isoDate: string): string {
  const date = new Date(isoDate);
  const today = new Date();

  const isToday =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();

  if (isToday) return COPY.homeScreen.activeJobCard.dateToday;

  const dayLetter = COPY.homeScreen.activeJobCard.dayLetters[date.getDay()];
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");

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
  const fmt = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return `${fmt(start)}-${fmt(end)}`;
}
