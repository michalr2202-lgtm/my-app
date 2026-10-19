import { OrdersScreen } from "@/components/client/orders/OrdersScreen";
import { getCurrentCustomerId } from "@/lib/auth";
import {
  DUMMY_ORDERS_ACTIVE_NOW,
  DUMMY_ORDERS_HISTORY,
  DUMMY_ORDERS_PENDING,
  DUMMY_ORDERS_UPCOMING,
} from "@/lib/dummyOrdersData";
import { DEV_PREVIEW_ENABLED, withDevPreviewFinalPrice } from "@/lib/devPreviewData";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchActiveJob } from "@/lib/queries/activeJob";
import { fetchCustomerOrders } from "@/lib/queries/orders";

/**
 * /orders route - see `OrdersScreen`'s doc comment. Wired to real
 * per-customer queries (2026-09-08) - `fetchActiveJob` (shared with the
 * Home Screen, same "truly in-flight only" definition - see
 * `ACTIVE_NOW_STATUSES` in `jobRow.ts`) for the top slot,
 * `fetchCustomerOrders` for the 3 headed buckets. `dummyOrdersData.ts` is
 * QA-only fallback (same `DEV_PREVIEW_ENABLED` flag/pattern as
 * `src/app/page.tsx`'s `devPreviewData.ts`), not the primary data path -
 * keep both files until QA no longer needs a populated preview without
 * real Supabase rows.
 *
 * `withDevPreviewProfessional` (added 2026-09-29, removed 2026-09-30) used
 * to overlay a placeholder professional name/phone onto every real bucket
 * except `pending`, so `OrderCard`'s already-wired `job.professionalName`
 * row (`showProfessionalName`, default `true`, explicitly `false` only
 * for `pending`/searching jobs) had something real to preview against.
 * Removed once that preview was confirmed and no longer needed - it had
 * no status gating of its own (only checked whether `professionalName`
 * was already non-empty), so it was purely relying on the caller only
 * ever applying it to buckets where a real assignment could exist. Fine
 * here (this file *is* bucket-aware), but the same overlay applied
 * unconditionally in `/orders/[jobId]/page.tsx` (a single job, not a
 * bucket) - see that file's history for the bug this caused there.
 *
 * `withDevPreviewFinalPrice` (added 2026-09-29, same flag) applied to
 * `history` only - overlays a placeholder `finalPrice` onto a real
 * `completed` job so `OrderCard`'s history row (service label + single
 * final price) has something real to show; correctly stays a no-op for
 * `cancelled`/`incomplete_work` jobs, which should keep showing no row at
 * all.
 */
export default async function OrdersPage() {
  const supabase = await createSupabaseServerClient();
  const customerId = await getCurrentCustomerId(supabase);

  const [fetchedActiveNow, fetchedOrders] = await Promise.all([
    fetchActiveJob(supabase, customerId),
    fetchCustomerOrders(supabase, customerId),
  ]);

  const activeNow = fetchedActiveNow ?? (DEV_PREVIEW_ENABLED ? DUMMY_ORDERS_ACTIVE_NOW : null);
  const upcoming = fetchedOrders.upcoming.length > 0 ? fetchedOrders.upcoming : DEV_PREVIEW_ENABLED ? DUMMY_ORDERS_UPCOMING : [];
  const pending = fetchedOrders.pending.length > 0 ? fetchedOrders.pending : DEV_PREVIEW_ENABLED ? DUMMY_ORDERS_PENDING : [];
  const history =
    fetchedOrders.history.length > 0
      ? fetchedOrders.history.map(withDevPreviewFinalPrice)
      : DEV_PREVIEW_ENABLED
        ? DUMMY_ORDERS_HISTORY
        : [];

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-surface-bg">
      <OrdersScreen activeNow={activeNow} upcoming={upcoming} pending={pending} history={history} />
    </div>
  );
}
