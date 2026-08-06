import { COPY } from "@/lib/copy";
import type { ActiveJob, UrgentNotification } from "@/lib/types";

/**
 * TEMPORARY - visual QA preview data only.
 *
 * `jobs` / `job_assignments` / `job_updates` are currently empty in
 * Supabase, so ActiveJobCard/NotificationBanner correctly render nothing
 * (State A / State C per /docs/home-screen-prd.md). This file lets us
 * preview those two components locally, without writing anything to the
 * database and without permanent mock data in the main data path.
 *
 * Controlled by `NEXT_PUBLIC_PREVIEW_HOME_STATES=true` in `.env.local`
 * (default unset/false - never on in production). Only used in
 * `src/app/page.tsx` as a fallback when the real query returns null.
 *
 * DELETE ONCE REMOVED: this file + its 2 usages in `src/app/page.tsx`,
 * once real `jobs`/`job_updates` rows exist and this fallback is no longer
 * needed for QA.
 */
export const DEV_PREVIEW_ENABLED = process.env.NEXT_PUBLIC_PREVIEW_HOME_STATES === "true";

export const DEV_PREVIEW_ACTIVE_JOB: ActiveJob = {
  id: "preview-job",
  status: "on_the_way",
  scheduledTime: new Date().toISOString(),
  professionalName: "איציק כהן",
  categoryLabel: "שיפוצניק",
  // "plumber" token (#e3ddfe lavender) most closely matches the Figma
  // sample's card background for this preview - "שיפוצניק" (contractor)
  // isn't one of the 4 fixed Home Screen categories.
  categoryColorKey: "plumber",
  serviceLabel: "שיפוץ קיר",
  priceMin: 500,
  priceMax: 800,
};

export const DEV_PREVIEW_NOTIFICATION: UrgentNotification = {
  id: "preview-notification",
  jobId: "preview-job",
  type: "cancelled",
  priority: "critical",
  message: COPY.notification.customer.jobCancelled,
  createdAt: new Date().toISOString(),
};
