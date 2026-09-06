"use client";

import { BookingStepFooter } from "@/components/client/booking/BookingStepFooter";
import { COPY } from "@/lib/copy";

export type BookingMessageKind =
  | "noProfessionals"
  | "noServiceMatch"
  | "noPriceYet"
  | "noSlotsForDate"
  | "jobCreated"
  | "submitFailed";

export interface BookingMessageStepProps {
  kind: BookingMessageKind;
  /**
   * "noProfessionals" is a dead end (closes the sheet / back to home) - the
   * matcher itself couldn't identify any category at all. "noServiceMatch"
   * is a different dead end with the same CTA: the matcher DID find a
   * category/services to show, but the user explicitly said none of the
   * shown pills fit ("אין התאמה") - see the distinction in
   * client-booking-flow-prd.md's Match Outcomes table. "noPriceYet" is not
   * a dead end - the category matched, so this continues the booking flow
   * (no separate "back home" affordance; the sheet's own close (X) button
   * covers that, consistent with every other step). "noSlotsForDate" also
   * continues the flow - its CTA goes back to the date screen, which is
   * why this kind is rendered without `onPrevious`: a second button doing
   * the exact same thing would be redundant. "jobCreated" is the
   * Submission confirmation - a dead end that closes the sheet, like
   * "noProfessionals". "submitFailed" retries the same submit call rather
   * than closing anything.
   */
  onPrimaryAction: () => void;
  /** Omit on the first screen shown in a path; see BookingFlowSheet's history stack. */
  onPrevious?: () => void;
  /**
   * Required for "noPriceYet" - interpolated into its heading. That outcome
   * skips `SearchMatchStep` entirely (there's no priced service to pick), so
   * without this the category the matcher identified would never actually
   * be shown to the user anywhere in the flow.
   */
  categoryLabel?: string | null;
  /**
   * Required for "jobCreated" - picks which SLA the subtext promises (see
   * `project-prd.md` §5 "Scheduled Job Matching," confirmed 2026-09-06):
   * `"nearTerm"` when the scheduled start is less than 2 hours from
   * submission (`jobCreated.subtextNearTerm`, "תוך רבע שעה"), `"scheduled"`
   * otherwise, including multi-day-out bookings (`jobCreated.subtextScheduled`,
   * "תוך שעה" - an explicit MVP-only number, see that PRD section). Computed
   * by `BookingFlowSheet` at the moment of submission, not re-derived here.
   */
  jobCreatedTier?: "nearTerm" | "scheduled";
}

/**
 * Post-selection / matcher outcome / Submission-result message screens
 * inside the Bottom Sheet. Every kind splits into a heading + subtext (same
 * gap-2 heading/subtext pattern as SearchMatchStep).
 */
export function BookingMessageStep({
  kind,
  onPrimaryAction,
  onPrevious,
  categoryLabel,
  jobCreatedTier,
}: BookingMessageStepProps) {
  const contentByKind: Record<BookingMessageKind, { heading: string; subtext: string; cta: string }> = {
    noProfessionals: {
      heading: COPY.bookingFlow.noMatch.heading,
      subtext: COPY.bookingFlow.noMatch.subtext,
      cta: COPY.bookingFlow.noMatch.backHome,
    },
    // Reuses noMatch.backHome as its CTA - same dead end/action, just a
    // different reason (see the doc comment above).
    noServiceMatch: {
      heading: COPY.bookingFlow.noServiceMatch.heading,
      subtext: COPY.bookingFlow.noServiceMatch.subtext,
      cta: COPY.bookingFlow.noMatch.backHome,
    },
    noPriceYet: {
      heading: COPY.bookingFlow.noPriceYet.heading.replace("{category}", categoryLabel ?? ""),
      subtext: COPY.bookingFlow.noPriceYet.subtext,
      cta: COPY.bookingFlow.noPriceYet.continueOrder,
    },
    noSlotsForDate: {
      heading: COPY.bookingFlow.noSlotsForDate.heading,
      subtext: COPY.bookingFlow.noSlotsForDate.subtext,
      cta: COPY.bookingFlow.noSlotsForDate.chooseAnotherDay,
    },
    jobCreated: {
      heading: COPY.bookingFlow.jobCreated.heading,
      subtext:
        jobCreatedTier === "scheduled"
          ? COPY.bookingFlow.jobCreated.subtextScheduled
          : COPY.bookingFlow.jobCreated.subtextNearTerm,
      cta: COPY.bookingFlow.jobCreated.closeAction,
    },
    submitFailed: {
      heading: COPY.bookingFlow.submitFailed.heading,
      subtext: COPY.bookingFlow.submitFailed.subtext,
      cta: COPY.bookingFlow.submitFailed.retryAction,
    },
  };
  const { heading, subtext, cta } = contentByKind[kind];

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
