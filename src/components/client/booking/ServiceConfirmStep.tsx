"use client";

import { BookingStepFooter } from "@/components/client/booking/BookingStepFooter";
import { COPY } from "@/lib/copy";
import { formatServicePriceLine } from "@/lib/servicePricing";

export interface ServiceConfirmStepProps {
  categoryLabel: string;
  /** Minimal shape (matches `formatServicePriceLine`'s own parameter) - deliberately not a named catalog type, since this needs to accept whichever of `BookingFlowSheet`'s several service-shaped lists `selectedService` resolved from. */
  service: {
    label_he: string;
    pricing_type: string;
    price_min: number;
    price_max: number;
  };
  onNext: () => void;
  /** Omit on the first screen shown in a path; see BookingFlowSheet's history stack. */
  onPrevious?: () => void;
}

/**
 * Step 2-equivalent for the Service Pill entry point (Flow 4, added
 * 2026-09-07 - see `client-booking-flow-prd.md` §3 "Entry Point Mapping").
 * Both the exact service *and* its category are already known here (the
 * customer tapped a specific service pill on Home, not a category card or
 * a free-text search) - so unlike `CategoryServiceStep`/`SearchMatchStep`,
 * there is no pill grid, no selection to make, nothing left to resolve.
 * This screen is purely a confirmation/orientation display before "הבא"
 * advances straight to Scheduling (`BookingFlowSheet.handleServiceConfirmNext`
 * -> `advanceToScheduling`).
 *
 * Block order - service first, then profession - is the deliberate
 * *opposite* of `CategoryServiceStep`'s "המקצוע הנבחר:" (profession) first.
 * That isn't an inconsistency: both screens actually follow the same
 * underlying rule - whatever the customer *directly* chose leads, and
 * whatever the system *derived* from it follows. In `CategoryServiceStep`
 * that's the category (picked directly on Step 1) leading, service
 * (still to be resolved) following. Here it's reversed because the direct
 * choice *is* the service (the pill tapped) - the category is the derived
 * fact, so it trails, exactly mirroring `SearchMatchStep`'s own pattern of
 * "echo what the customer actually provided, then show what was derived
 * from it."
 */
export function ServiceConfirmStep({ categoryLabel, service, onNext, onPrevious }: ServiceConfirmStepProps) {
  return (
    <div className="flex w-full flex-col gap-10">
      <div className="flex w-full flex-col gap-6">
        <div className="flex w-full flex-col gap-2 text-right text-text-secondary">
          <p className="w-full text-lg font-semibold leading-[1.4]">
            {COPY.bookingFlow.serviceConfirm.selectedServiceLabel}
          </p>
          <p className="w-full text-sm leading-[1.4]">{service.label_he}</p>
          <p className="w-full text-sm leading-[1.4]">{formatServicePriceLine(service)}</p>
        </div>

        <div className="flex w-full flex-col gap-2 text-right text-text-secondary">
          <p className="w-full text-lg font-semibold leading-[1.4]">
            {COPY.bookingFlow.searchMatch.matchingProfessionLabel}
          </p>
          <p className="w-full text-sm leading-[1.4]">{categoryLabel}</p>
        </div>
      </div>

      <BookingStepFooter
        onPrevious={onPrevious}
        nextLabel={COPY.bookingFlow.serviceConfirm.next}
        onNext={onNext}
      />
    </div>
  );
}
