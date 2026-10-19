import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActiveJob } from "@/lib/types";
import { JOB_SELECT_FRAGMENT, mapJobRowToActiveJob, type JobRow } from "@/lib/queries/jobRow";
import { UPCOMING_STATUSES, PENDING_STATUSES, HISTORY_STATUSES } from "@/lib/jobStatus";

/**
 * Status -> bucket mapping for the Orders screen (`OrdersScreen.tsx`'s doc
 * comment / `component-library.md`'s `OrderCard` entry) now lives in
 * `src/lib/jobStatus.ts` (moved 2026-09-28) - imported back here rather
 * than duplicated, since `getContextualStatusLabel` there needs the exact
 * same mapping.
 */

/**
 * The "active now" bucket at the top of the Orders screen is NOT covered
 * here - it reuses `fetchActiveJob` as-is (see `ACTIVE_NOW_STATUSES` in
 * `jobRow.ts`, which that query filters on directly - both screens share
 * one definition, not two that could drift apart).
 */

/**
 * Fixed count-only cap (confirmed 2026-09-29, no time-based expiry) - see
 * `ordersScreen.historyHeading` copy ("היסטוריה (עד 5 הזמנות אחרונות)").
 * Deliberately NOT also bounded by a 30/45-day cutoff: a resolved job's
 * reference value doesn't decay with calendar time the way "still
 * relevant" does for `pending`/`upcoming` - an infrequent customer keeping
 * their last 5 jobs visible for months is more useful than an active
 * customer's history unpredictably shrinking once older jobs age out,
 * same "no tabs/filters/search, keep it simple" philosophy `project-prd.md`
 * §6 already states for this screen.
 */
const HISTORY_LIMIT = 5;

export interface CustomerOrders {
  upcoming: ActiveJob[];
  pending: ActiveJob[];
  history: ActiveJob[];
}

const EMPTY_ORDERS: CustomerOrders = { upcoming: [], pending: [], history: [] };

/**
 * Fetches the 3 headed Orders-screen buckets (added 2026-09-08, replacing
 * `dummyOrdersData.ts`'s `DUMMY_ORDERS_UPCOMING`/`_PENDING`/`_HISTORY`) -
 * see this file's top comment for the exact status->bucket mapping.
 *
 * Issues 3 independent queries rather than one fetch-then-partition,
 * since each bucket needs its own sort order, and Postgrest has no single
 * call that returns differently sorted/limited slices of one table in one
 * round trip.
 *
 * Sort order per bucket (decided 2026-09-09, discussed at length with the
 * user - deliberately NOT the same field for every bucket, see reasoning
 * below):
 *   - upcoming: `scheduled_time` ascending (soonest first). This is a
 *     real commitment with a professional attached and a real future
 *     slot, so "when will this happen" is what the customer cares about -
 *     same convention as appointment apps (Zocdoc/OpenTable/Calendly).
 *   - pending: `created_at` descending (most recently *submitted* first).
 *     A `searching_professional` job is not yet a real commitment - it's
 *     a transient, unresolved request (capped at ~1h before some other
 *     resolution happens), so "what did I just do" is the operative
 *     question, not "when would this happen" - same convention as
 *     pending bank transactions or a ride app's "finding your driver"
 *     state, both of which sort by recency of the action, not a future
 *     attribute.
 *   - history: `scheduled_time` descending, capped at `HISTORY_LIMIT`
 *     (most recently *occurred* first) - a resolved past event, so "what
 *     just happened" matters, same convention as bank/e-commerce history.
 *
 * The unifying rule across all three isn't "same field everywhere" - it's
 * "most relevant-to-right-now first", where what counts as relevant
 * depends on whether the bucket represents an unresolved action, a real
 * future commitment, or a resolved past event. Keep this in mind before
 * ever "fixing" pending's sort to match upcoming's for consistency - that
 * would actually be the wrong kind of consistency.
 *
 * Takes the caller's authenticated Supabase client - same RLS reasoning
 * as `fetchActiveJob`. Returns all-empty arrays (not null) with no
 * customerId, so the screen's "render nothing per empty bucket" behavior
 * (see `OrdersScreen`'s doc comment) falls out naturally.
 */
export async function fetchCustomerOrders(
  supabase: SupabaseClient,
  customerId: string | null
): Promise<CustomerOrders> {
  if (!customerId) return EMPTY_ORDERS;

  const [upcomingRes, pendingRes, historyRes] = await Promise.all([
    supabase
      .from("jobs")
      .select(JOB_SELECT_FRAGMENT)
      .eq("customer_id", customerId)
      .in("status", UPCOMING_STATUSES)
      .order("scheduled_time", { ascending: true }),
    supabase
      .from("jobs")
      .select(JOB_SELECT_FRAGMENT)
      .eq("customer_id", customerId)
      .in("status", PENDING_STATUSES)
      .order("created_at", { ascending: false }),
    supabase
      .from("jobs")
      .select(JOB_SELECT_FRAGMENT)
      .eq("customer_id", customerId)
      .in("status", HISTORY_STATUSES)
      .order("scheduled_time", { ascending: false })
      .limit(HISTORY_LIMIT),
  ]);

  if (upcomingRes.error) console.error("fetchCustomerOrders (upcoming) error:", upcomingRes.error);
  if (pendingRes.error) console.error("fetchCustomerOrders (pending) error:", pendingRes.error);
  if (historyRes.error) console.error("fetchCustomerOrders (history) error:", historyRes.error);

  const toActiveJobs = (rows: unknown[] | null) => (rows as unknown as JobRow[] | null ?? []).map(mapJobRowToActiveJob);

  return {
    upcoming: toActiveJobs(upcomingRes.data),
    pending: toActiveJobs(pendingRes.data),
    history: toActiveJobs(historyRes.data),
  };
}
