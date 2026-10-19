import type { JobStatus } from "@/lib/types";

/**
 * UI-filtering mirror of `advance_job_status`'s v1 transition graph
 * (`supabase/sql/job_transitions.sql`, added 2026-09-09) - THE SQL
 * VERSION IS AUTHORITATIVE; this map exists only so a UI (today, the dev
 * harness at `src/app/dev/job-actions/page.tsx`; later, the real
 * professional app) can show only the currently-valid next-status
 * actions instead of discovering illegal transitions via a failed RPC
 * call. If you change one, change both - see `docs/order-model.md`'s
 * "Confirmed transition graph (v1)" section for the full graph,
 * rationale, and open questions (the cancellation cutoff, and
 * `incomplete_work`'s absence).
 *
 * `searching_professional`'s only *other* outgoing transition (->
 * `confirmed`) is handled by the separate `accept_job` RPC, not
 * `advance_job_status` - the dev harness renders that one as its own
 * dedicated "accept_job (as test professional)" button rather than
 * through this map, so it's correctly absent from the array below; only
 * `cancelled` (added 2026-10-01, closing a real gap - see
 * `job_transitions.sql`'s own comment on this same change) goes through
 * `advance_job_status` and therefore belongs here. `draft` has no
 * outgoing entries - it's only ever left via `submit_booking` (creates
 * the row already in `searching_professional`). `pending_approval` is
 * unreachable in practice (`accept_job` skips it) but still carries its
 * `cancelled` entry (added alongside `searching_professional`'s, same
 * reasoning) for forward-compatibility, matching the SQL side exactly.
 */
export const JOB_STATUS_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  draft: [],
  searching_professional: ["cancelled"],
  pending_approval: ["cancelled"],
  confirmed: ["on_the_way", "cancelled", "rescheduled"],
  on_the_way: ["arrived", "waiting_for_customer", "cancelled", "rescheduled"],
  arrived: ["in_progress", "waiting_for_customer", "cancelled", "rescheduled"],
  waiting_for_customer: ["on_the_way", "arrived", "cancelled"],
  in_progress: ["completed", "rescheduled", "waiting_for_professional", "cancelled"],
  waiting_for_professional: ["in_progress", "cancelled"],
  rescheduled: ["confirmed"],
  completed: [],
  cancelled: [],
  incomplete_work: [],
};

export function getValidNextStatuses(status: JobStatus): JobStatus[] {
  return JOB_STATUS_TRANSITIONS[status] ?? [];
}
