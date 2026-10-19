"use client";

import { Card } from "@/components/ui/Card";
import { StatusBar } from "@/components/ui/StatusBar";
import { resolveCategoryBackground } from "@/lib/categoryVisuals";
import { formatJobDate, formatTimeWindow } from "@/lib/formatDate";
import { formatFinalPrice, formatPriceRange } from "@/lib/servicePricing";
import type { ActiveJob } from "@/lib/types";

export interface OrderCardProps {
  job: ActiveJob;
  /**
   * Whether the professional-name text renders (added 2026-09-08 for the
   * Orders screen - see `client-orders-flow` planning). Default `true`
   * (`ActiveJobCard`'s original behavior - a professional is always known
   * by the time a job is "active"). `false` for the Orders screen's
   * "pending acceptance" bucket (`searching_professional` - no
   * professional assigned yet): per the Figma design, the text still
   * renders (as `job.professionalName`, typically `""`) but with
   * `opacity-0` - an invisible placeholder that preserves this row's
   * height/alignment with every other card, rather than collapsing it.
   */
  showProfessionalName?: boolean;
  /**
   * Whether the service-label/price row renders at all (added 2026-09-08).
   * Default `true`.
   *
   * For the Orders screen's history bucket (changed 2026-09-29 from an
   * always-`false` override): computed per-job as `job.finalPrice != null`,
   * not a blanket bucket-level constant - a `completed` job (real
   * `final_price` set by the professional's "Complete Job" flow) shows
   * this row, a `cancelled`/`incomplete_work` job (no price, nothing was
   * charged) omits it entirely, row and all, per explicit product
   * direction: unlike `showProfessionalName` below, this is not an
   * invisible height-preserving placeholder - the card is genuinely one
   * row shorter when there's nothing real to show.
   */
  showServiceRow?: boolean;
  /**
   * Whether the price shown in that row is `job.finalPrice` (a single
   * real number) rather than the usual `priceMin`-`priceMax` estimate
   * range (added 2026-09-29) - `true` for the Orders screen's history
   * bucket, where a resolved job has one concrete charged price, not an
   * estimate. Has no effect when `showServiceRow` is `false`, and has no
   * effect if `job.finalPrice` is somehow `null` while this is `true`
   * (falls back to the range) - callers should already be gating
   * `showServiceRow` on `finalPrice != null` for the cases that matter,
   * this is just a defensive fallback, not a second source of truth.
   */
  showFinalPrice?: boolean;
  /**
   * `StatusBar`'s color variant - see that component's doc comment for
   * the full status-to-variant mapping. Caller-supplied (not derived from
   * `job.status` here) since `OrderCard` doesn't own that business logic.
   */
  statusVariant?: "active" | "default";
  /**
   * The status pill's text - caller-supplied rather than derived via
   * `getJobStatusLabel` internally, since the Orders screen's pills need
   * different, more contextual wording than the generic `jobStatus.*` map
   * for some statuses (see `copy-deck.md`'s `ordersScreen.*` keys).
   */
  statusLabel: string;
  onClick?: () => void;
}

/**
 * OrderCard - shared visual shell for any job-status card shown to the
 * customer (extracted 2026-09-08 from `ActiveJobCard`, which becomes a
 * thin wrapper around this - see that component's doc comment). Reused as
 * every card kind on the Orders screen (`project-prd.md` §6): the same
 * structure (category background, name/date row, professional/time row,
 * service/price row, status pill) applies to all of them, per design -
 * only the 3 optional props above vary between kinds.
 */
export function OrderCard({
  job,
  showProfessionalName = true,
  showServiceRow = true,
  showFinalPrice = false,
  statusVariant = "active",
  statusLabel,
  onClick,
}: OrderCardProps) {
  const background = resolveCategoryBackground({
    name_en: job.categoryColorKey,
  });

  return (
    <Card
      interactive
      onClick={onClick}
      className={background.className}
      style={background.style}
    >
      {/*
        Nested gap groups match Figma exactly (verified via get_design_context
        on the isolated node): 4px between the category/date and name/time
        rows, then 16px before the service/price row - NOT a uniform 16px
        between all 3 rows.
      */}
      <div className="flex w-full flex-col gap-6 px-6 py-5">
        <div className="flex w-full flex-col gap-4">
          <div className="flex w-full flex-col gap-1">
            <div className="flex w-full items-end justify-between">
              <p className="text-lg font-semibold leading-[1.4] text-text-primary">
                {job.categoryLabel}
              </p>
              <p className="text-sm font-semibold leading-[1.4] text-text-primary">
                {formatJobDate(job.scheduledTime)}
              </p>
            </div>
            <div className="flex w-full items-center justify-between">
              <p className={showProfessionalName ? "text-sm leading-[1.4] text-text-primary" : "text-sm leading-[1.4] text-text-primary opacity-0"}>
                {job.professionalName}
              </p>
              <p dir="ltr" className="text-sm font-semibold leading-[1.4] text-text-primary">
                {formatTimeWindow(job.scheduledTime)}
              </p>
            </div>
          </div>
          {showServiceRow ? (
            <div className="flex w-full items-center justify-between">
              <p className="text-sm leading-[1.4] text-text-primary">
                {job.serviceLabel}
              </p>
              <p dir="ltr" className="text-sm leading-[1.4] text-text-primary">
                {showFinalPrice && job.finalPrice != null
                  ? formatFinalPrice(job.finalPrice)
                  : formatPriceRange(job.priceMin, job.priceMax)}
              </p>
            </div>
          ) : null}
        </div>
        <div className="flex w-full items-center justify-center">
          <StatusBar variant={statusVariant}>{statusLabel}</StatusBar>
        </div>
      </div>
    </Card>
  );
}
