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
