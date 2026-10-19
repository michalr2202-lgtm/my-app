"use client";

import { useRouter } from "next/navigation";
import { AccountLoginPrompt } from "@/components/shared/AccountLoginPrompt";
import { BottomNavigation } from "@/components/shared/BottomNavigation";
import { OrderCard } from "@/components/shared/OrderCard";
import { getContextualStatusLabel } from "@/lib/jobStatus";
import { COPY } from "@/lib/copy";
import type { ActiveJob } from "@/lib/types";

export interface OrdersScreenProps {
  activeNow: ActiveJob | null;
  upcoming: ActiveJob[];
  pending: ActiveJob[];
  history: ActiveJob[];
}

/**
 * OrdersScreen - client-facing Orders tab (`project-prd.md` §6, Figma node
 * 8057:6297). Implemented 2026-09-08 with dummy data (see
 * `dummyOrdersData.ts`) - real per-customer queries for the 3 headed
 * buckets below are a deferred follow-up; only the top "active now" slot
 * is query-backed today (reuses the same `ActiveJob` shape/query as the
 * Home Screen's card).
 *
 * One un-headed "active now" card at top (identical to Home's
 * `ActiveJobCard` - in-flight statuses only), then 3 headed buckets, all
 * sharing the same `OrderCard` shell (see that component's doc comment
 * for the full status-to-bucket-to-variant mapping this screen relies on):
 * - "Confirmed/upcoming" (`confirmed`/`pending_approval`/`rescheduled`) -
 *   full card, default (white/blue) status pill.
 * - "Pending acceptance" (`searching_professional`) - professional name
 *   hidden (`opacity-0`, no professional assigned yet).
 * - "History" (`completed`/`cancelled`/`incomplete_work`, last 5) -
 *   service/price row shown only when `job.finalPrice != null` (in
 *   practice, only `completed` jobs - see `OrderCard`'s doc comment),
 *   with a single final price instead of the usual min-max range.
 *
 * **Empty state** (added 2026-09-28): when all 4 buckets are empty, this
 * used to render nothing at all in the content column (just the bottom
 * nav) - indistinguishable from a broken/unloaded page. There are 2
 * genuinely different reasons this happens, and this screen can't tell
 * them apart on its own: a real first-time guest who's never ordered
 * (this app only ever creates a session as a side effect of placing an
 * order - see `client-booking-flow-prd.md`), or a returning customer with
 * real order history who simply has no session *on this device/browser*
 * (sessions are per-browser cookies - switching devices/browsers always
 * looks exactly like "logged out" from the server's point of view, same
 * as any session-based app). `emptyMessage`'s wording is deliberately
 * neutral about which one is true rather than asserting "you have no
 * orders" (which could be false for the second case) - paired with a login
 * link (`shared.accountPrompt.existingCustomerLoginLink`) that opens
 * `LoginSheet` for the customer who knows they already have an account,
 * without forcing that step on everyone else. Rendered via the shared
 * `AccountLoginPrompt` (`components/shared`, extracted 2026-09-29 once
 * `NotificationsScreen`/`ProfileScreen` needed the exact same block) -
 * this screen supplies only its own `ordersScreen.emptyMessage`.
 */
export function OrdersScreen({ activeNow, upcoming, pending, history }: OrdersScreenProps) {
  const router = useRouter();

  const hasAnyOrders = Boolean(activeNow) || upcoming.length > 0 || pending.length > 0 || history.length > 0;

  /**
   * Flow 6 (order card click) - wired 2026-09-09, same destination as
   * `ClientHomeScreen`'s `handleActiveJobClick` (`JobDetailsScreen`'s doc
   * comment covers scope for both).
   */
  const handleJobClick = (job: ActiveJob) => {
    router.push(`/orders/${job.id}`);
  };

  return (
    <div className="relative flex w-full flex-1 flex-col items-center bg-surface-bg">
      <div className="flex w-full flex-1 flex-col items-center gap-10 px-4 pb-6 pt-10">
        {activeNow ? (
          <OrderCard
            job={activeNow}
            statusVariant="active"
            statusLabel={getContextualStatusLabel(activeNow.status)}
            onClick={() => handleJobClick(activeNow)}
          />
        ) : null}

        {upcoming.length > 0 ? (
          <div className="flex w-full flex-col items-center gap-6">
            <h2 className="w-full text-right text-lg font-semibold leading-[1.4] text-text-primary">
              {COPY.ordersScreen.upcomingHeading}
            </h2>
            <div className="flex w-full flex-col items-center gap-4">
              {upcoming.map((job) => (
                <OrderCard
                  key={job.id}
                  job={job}
                  statusVariant="default"
                  statusLabel={getContextualStatusLabel(job.status)}
                  onClick={() => handleJobClick(job)}
                />
              ))}
            </div>
          </div>
        ) : null}

        {pending.length > 0 ? (
          <div className="flex w-full flex-col items-center gap-6">
            <h2 className="w-full text-right text-lg font-semibold leading-[1.4] text-text-primary">
              {COPY.ordersScreen.pendingHeading}
            </h2>
            <div className="flex w-full flex-col items-center gap-4">
              {pending.map((job) => (
                <OrderCard
                  key={job.id}
                  job={job}
                  showProfessionalName={false}
                  statusVariant="default"
                  statusLabel={getContextualStatusLabel(job.status)}
                  onClick={() => handleJobClick(job)}
                />
              ))}
            </div>
          </div>
        ) : null}

        {history.length > 0 ? (
          <div className="flex w-full flex-col items-center gap-6">
            <h2 className="w-full text-right text-lg font-semibold leading-[1.4] text-text-primary">
              {COPY.ordersScreen.historyHeading}
            </h2>
            <div className="flex w-full flex-col items-center gap-4">
              {history.map((job) => (
                <OrderCard
                  key={job.id}
                  job={job}
                  showServiceRow={job.finalPrice != null}
                  showFinalPrice
                  statusVariant="default"
                  statusLabel={getContextualStatusLabel(job.status)}
                  onClick={() => handleJobClick(job)}
                />
              ))}
            </div>
          </div>
        ) : null}

        {!hasAnyOrders ? <AccountLoginPrompt message={COPY.ordersScreen.emptyMessage} /> : null}
      </div>

      <div className="sticky bottom-0 flex w-full flex-col items-center bg-surface-bg">
        <div className="h-px w-full bg-divider" />
        <BottomNavigation activeTab="orders" />
      </div>
    </div>
  );
}
