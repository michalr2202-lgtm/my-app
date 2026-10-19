import { COPY } from "@/lib/copy";
import type { JobStatus } from "@/lib/types";

/**
 * Hebrew display labels for job statuses (Active Job Card status badge).
 * Text lives in `COPY.jobStatus` (/docs/copy-deck.md); this map only
 * translates the DB's snake_case `JobStatus` values to those copy keys.
 *
 * Only "on_the_way" ("בדרך אלייך") and "arrived" ("הגיע") are confirmed
 * copy, taken directly from /docs/home-screen-prd.md and the Figma design.
 * The remaining labels are reasonable placeholder microcopy for statuses
 * listed in /docs/order-model.md, pending copywriting confirmation.
 */
const JOB_STATUS_LABEL: Record<JobStatus, string> = {
  draft: COPY.jobStatus.draft,
  searching_professional: COPY.jobStatus.searchingProfessional,
  pending_approval: COPY.jobStatus.pendingApproval,
  confirmed: COPY.jobStatus.confirmed,
  on_the_way: COPY.jobStatus.onTheWay,
  arrived: COPY.jobStatus.arrived,
  in_progress: COPY.jobStatus.inProgress,
  completed: COPY.jobStatus.completed,
  cancelled: COPY.jobStatus.cancelled,
  rescheduled: COPY.jobStatus.rescheduled,
  waiting_for_customer: COPY.jobStatus.waitingForCustomer,
  waiting_for_professional: COPY.jobStatus.waitingForProfessional,
  incomplete_work: COPY.jobStatus.incompleteWork,
};

export function getJobStatusLabel(status: JobStatus): string {
  return JOB_STATUS_LABEL[status] ?? status;
}

/**
 * Status -> Orders-screen-bucket mapping. Single source of truth (moved
 * here 2026-09-28 from `src/lib/queries/orders.ts`, which now imports
 * these back) - both the query layer (which bucket a job's row query
 * belongs to) and `getContextualStatusLabel` below (which label a status
 * gets) must agree on this mapping, so it lives in exactly one place
 * rather than as two hand-kept-in-sync copies.
 */
export const UPCOMING_STATUSES: JobStatus[] = ["confirmed", "pending_approval", "rescheduled"];
export const PENDING_STATUSES: JobStatus[] = ["searching_professional"];
export const HISTORY_STATUSES: JobStatus[] = ["completed", "cancelled", "incomplete_work"];

/**
 * Contextual status label (added 2026-09-28 for `JobDetailsScreen`, then
 * adopted by `OrdersScreen` too, replacing its inline per-bucket
 * ternaries): unlike `getJobStatusLabel`'s generic `jobStatus.*` wording,
 * this returns the same bucket-contextual copy the Orders screen already
 * shows for these statuses (`ordersScreen.*`, see `copy-deck.md`) - e.g.
 * "בחיפוש בעל מקצוע" instead of the generic "מחפש בעל מקצוע" - derived
 * purely from `status` (not from "which array is this job currently sitting
 * in"), so it works for any single job in isolation (Job Details has no
 * bucket to look at). Falls back to `getJobStatusLabel` for every status
 * outside these 3 groups (the in-flight statuses shown on the Home
 * Screen's Active Job Card, which have no Orders-screen bucket at all).
 */
export function getContextualStatusLabel(status: JobStatus): string {
  if (PENDING_STATUSES.includes(status)) return COPY.ordersScreen.pendingStatusLabel;
  if (UPCOMING_STATUSES.includes(status)) return COPY.ordersScreen.upcomingStatusLabel;
  if (status === "completed") return COPY.ordersScreen.historyCompletedStatusLabel;
  return getJobStatusLabel(status);
}
