import { DEV_PREVIEW_ACTIVE_JOB } from "@/lib/devPreviewData";
import type { ActiveJob } from "@/lib/types";

/**
 * TEMPORARY - QA-only dummy data for the Orders screen (`project-prd.md`
 * §6, Figma node 8057:6297). All 4 buckets are real query-backed now
 * (`fetchActiveJob` + `fetchCustomerOrders`, see `src/app/orders/page.tsx`)
 * - as of 2026-09-08 this file is a fallback rendered only behind
 * `NEXT_PUBLIC_PREVIEW_HOME_STATES=true` (same flag/pattern as
 * `devPreviewData.ts`), for previewing a populated screen without needing
 * real Supabase rows. DELETE ONCE REMOVED: this file + its one usage in
 * `src/app/orders/page.tsx`, once that QA need goes away.
 *
 * Reuses `DEV_PREVIEW_ACTIVE_JOB` as-is for the "active now" slot (rather
 * than a near-duplicate), plus one entry per remaining bucket using the
 * exact placeholder text supplied for the Figma design.
 */

export const DUMMY_ORDERS_ACTIVE_NOW: ActiveJob = DEV_PREVIEW_ACTIVE_JOB;

export const DUMMY_ORDERS_UPCOMING: ActiveJob[] = [
  {
    id: "dummy-upcoming-1",
    status: "confirmed",
    scheduledTime: new Date().toISOString(),
    professionalName: "יוסי כהן",
    professionalPhone: "+972501234567",
    categoryLabel: "אינסטלטור",
    categoryColorKey: "plumber",
    serviceLabel: "החלפת ברז",
    priceMin: 200,
    priceMax: 350,
    finalPrice: null,
    notes: null,
  },
];

export const DUMMY_ORDERS_PENDING: ActiveJob[] = [
  {
    id: "dummy-pending-1",
    status: "searching_professional",
    scheduledTime: new Date().toISOString(),
    // No professional assigned yet - OrderCard renders this with
    // `opacity-0` (see `showProfessionalName={false}`), so the actual
    // value here is never visible, but stays a valid string for typing.
    professionalName: "",
    professionalPhone: null,
    categoryLabel: "טכנאי מזגן",
    categoryColorKey: "ac",
    serviceLabel: "החלפת פילטר",
    priceMin: 150,
    priceMax: 250,
    finalPrice: null,
    notes: null,
  },
];

/**
 * Two entries (added 2026-09-29) rather than one, deliberately covering
 * both real history-row states: a `completed` job shows the service
 * label + its single real `finalPrice` (`showFinalPrice`, `OrderCard`);
 * a `cancelled` job (`finalPrice: null`, never set - `cancelled` jobs
 * never go through "Complete Job") shows nothing at all in that slot,
 * `showServiceRow={job.finalPrice != null}` making the card genuinely
 * shorter, not just visually empty.
 */
export const DUMMY_ORDERS_HISTORY: ActiveJob[] = [
  {
    id: "dummy-history-1",
    status: "completed",
    scheduledTime: new Date().toISOString(),
    professionalName: "יבגני פבלוב",
    professionalPhone: "+972501234567",
    categoryLabel: "חשמלאי",
    categoryColorKey: "electrician",
    serviceLabel: "התקנת שקע",
    priceMin: 200,
    priceMax: 300,
    finalPrice: 250,
    notes: null,
  },
  {
    id: "dummy-history-2",
    status: "cancelled",
    scheduledTime: new Date().toISOString(),
    professionalName: "",
    professionalPhone: null,
    categoryLabel: "אינסטלטור",
    categoryColorKey: "plumber",
    serviceLabel: "בדיקת דליפה",
    priceMin: 150,
    priceMax: 250,
    finalPrice: null,
    notes: null,
  },
];
