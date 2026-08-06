"use client";

import { BookingStepFooter } from "@/components/client/booking/BookingStepFooter";
import { COPY } from "@/lib/copy";

export type BookingMessageKind = "noProfessionals" | "noPriceYet";

export interface BookingMessageStepProps {
  kind: BookingMessageKind;
  /**
   * "noProfessionals" is a dead end (closes the sheet / back to home).
   * "noPriceYet" is not - the category matched, so this continues the
   * booking flow (no separate "back home" affordance; the sheet's own
   * close (X) button covers that, consistent with every other step).
   */
  onPrimaryAction: () => void;
  /** Omit on the first screen shown in a path; see BookingFlowSheet's history stack. */
  onPrevious?: () => void;
}

/**
 * Post-selection / matcher outcome message screens inside the Bottom Sheet.
 * Both kinds split into a heading + subtext (same gap-2 heading/subtext
 * pattern as SearchMatchStep).
 */
export function BookingMessageStep({ kind, onPrimaryAction, onPrevious }: BookingMessageStepProps) {
  const heading =
    kind === "noPriceYet" ? COPY.bookingFlow.noPriceYet.heading : COPY.bookingFlow.noMatch.heading;
  const subtext =
    kind === "noPriceYet" ? COPY.bookingFlow.noPriceYet.subtext : COPY.bookingFlow.noMatch.subtext;
  const cta =
    kind === "noPriceYet" ? COPY.bookingFlow.noPriceYet.continueOrder : COPY.bookingFlow.noMatch.backHome;

  return (
    <div className="flex w-full flex-col gap-10">
      <div className="flex w-full flex-col gap-2 text-right text-text-secondary">
        <p className="w-full text-lg font-semibold leading-[1.4]">{heading}</p>
        <p className="w-full text-sm leading-[1.4]">{subtext}</p>
      </div>
      <BookingStepFooter onPrevious={onPrevious} nextLabel={cta} onNext={onPrimaryAction} />
    </div>
  );
}
