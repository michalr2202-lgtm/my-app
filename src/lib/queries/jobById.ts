import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActiveJob } from "@/lib/types";
import { JOB_SELECT_FRAGMENT, mapJobRowToActiveJob, type JobRow } from "@/lib/queries/jobRow";

/**
 * Fetches a single job by id for the Job Details screen (`/orders/[jobId]`,
 * added 2026-09-09 alongside `job_transitions.sql` - fills the Flow 6 TODO
 * in both `ClientHomeScreen` and `OrdersScreen`). Ownership-checked
 * (`.eq("customer_id", customerId)`) so a customer can never view another
 * customer's job by guessing/editing the URL's id - same reasoning as
 * every other per-customer query in this directory. Returns `null` for a
 * missing id, no customerId (no session), or a job that exists but isn't
 * this customer's - the route treats all three as "not found" identically.
 */
export async function fetchJobById(
  supabase: SupabaseClient,
  jobId: string,
  customerId: string | null
): Promise<ActiveJob | null> {
  if (!customerId) return null;

  const { data, error } = await supabase
    .from("jobs")
    .select(JOB_SELECT_FRAGMENT)
    .eq("id", jobId)
    .eq("customer_id", customerId)
    .maybeSingle();

  if (error) {
    console.error("fetchJobById error:", error);
    return null;
  }

  if (!data) return null;

  return mapJobRowToActiveJob(data as unknown as JobRow);
}
