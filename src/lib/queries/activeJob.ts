import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActiveJob } from "@/lib/types";
import { ACTIVE_NOW_STATUSES, JOB_SELECT_FRAGMENT, mapJobRowToActiveJob, type JobRow } from "@/lib/queries/jobRow";

/**
 * Fetches the customer's current active job (if any), per
 * /docs/home-screen-prd.md 3.1 / 4 (State B) - corrected 2026-09-08: a job
 * is "active" only while it's truly in flight (see `ACTIVE_NOW_STATUSES`'s
 * doc comment), not merely "not completed/cancelled" as an earlier version
 * of both this function and that PRD section said - a real, customer-
 * confirmed bug fix (a `searching_professional`/`pending_approval` job was
 * incorrectly showing here instead of falling back to State A).
 *
 * Returns null when there is no customerId (no session yet - see
 * lib/auth.ts) or no active job, so the screen renders State A.
 *
 * Takes the caller's Supabase client (2026-09-08, was previously the
 * `src/lib/supabase.ts` browser singleton, imported directly) - that
 * singleton carries no session when this runs server-side, so the `jobs`
 * RLS policy ("Customers can view their own jobs") would silently return
 * zero rows regardless of `customerId`. Callers must pass a client that's
 * actually authenticated as that customer - `createSupabaseServerClient()`
 * from a Server Component, per `src/app/page.tsx`.
 */
export async function fetchActiveJob(
  supabase: SupabaseClient,
  customerId: string | null
): Promise<ActiveJob | null> {
  if (!customerId) return null;

  const { data, error } = await supabase
    .from("jobs")
    .select(JOB_SELECT_FRAGMENT)
    .eq("customer_id", customerId)
    .in("status", ACTIVE_NOW_STATUSES)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("fetchActiveJob error:", error);
    return null;
  }

  if (!data) return null;

  return mapJobRowToActiveJob(data as unknown as JobRow);
}
