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
  professionalPhone: "+972501234567",
  // "איש תחזוקה" (handyman) - fixed 2026-09-08, was mislabeled "שיפוצניק"
  // (contractor) with a mismatched "plumber" color token borrowed to
  // approximate it. "handyman" is one of the 4 fixed Home Screen
  // categories, so both the label and color key below now match it
  // directly instead of approximating.
  categoryLabel: "איש תחזוקה",
  categoryColorKey: "handyman",
  serviceLabel: "שיפוץ קיר",
  priceMin: 500,
  priceMax: 800,
  finalPrice: null,
  notes: null,
};

/**
 * Dev-only preview overlay for the Orders screen's history row / Job
 * Details' price line single-final-price display (added 2026-09-29) -
 * separate flag from `DEV_PREVIEW_ENABLED` above on purpose: that one
 * swaps in an entirely fake job when the real query returns null (risky
 * for logged-out visitors, per the comment on
 * `NEXT_PUBLIC_PREVIEW_HOME_STATES` in `.env.local` - already bit us
 * once). This one only ever *augments* an already-fetched, already
 * ownership-checked REAL job - if there's no real job, this does nothing,
 * so it carries none of that risk.
 *
 * `jobs.final_price` is empty for every real job today (no professional
 * flow sets it yet), so a real `completed` job has nothing to show in
 * that slot either. Deliberately ONLY overlays a placeholder price onto
 * an already-real, already-`completed` job - never a
 * `cancelled`/`incomplete_work` one, since demonstrating that those
 * correctly show NO price at all is exactly half of what this feature
 * needs to prove; faking one there would hide a real bug instead of
 * revealing it. No-op the moment a job has a real `final_price`.
 *
 * Controlled by `NEXT_PUBLIC_PREVIEW_JOB_PROFESSIONAL=true` in
 * `.env.local` (default unset/false - never on in production). Named
 * "...PROFESSIONAL" for historical reasons - it originally also gated a
 * sibling `withDevPreviewProfessional` overlay (professional name/call
 * button preview), removed 2026-09-30 once confirmed and no longer
 * needed. Kept this name rather than renaming the `.env.local` flag for
 * a dev-only toggle with no other callers.
 */
export const DEV_PREVIEW_PROFESSIONAL_ENABLED = process.env.NEXT_PUBLIC_PREVIEW_JOB_PROFESSIONAL === "true";

export function withDevPreviewFinalPrice(job: ActiveJob): ActiveJob {
  if (!DEV_PREVIEW_PROFESSIONAL_ENABLED || job.finalPrice != null || job.status !== "completed") return job;
  return { ...job, finalPrice: Math.round((job.priceMin + job.priceMax) / 2) };
}

export const DEV_PREVIEW_NOTIFICATION: UrgentNotification = {
  id: "preview-notification",
  jobId: "preview-job",
  type: "cancelled",
  priority: "critical",
  message: COPY.notification.customer.jobCancelled,
  createdAt: new Date().toISOString(),
};
