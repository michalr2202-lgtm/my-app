"use client";

import { BookingStepFooter } from "@/components/client/booking/BookingStepFooter";
import { OrderRecap, type OrderRecapProps } from "@/components/client/booking/OrderRecap";
import { COPY } from "@/lib/copy";

export interface ConfirmStepProps {
  recap: OrderRecapProps;
  onSubmit: () => void;
  submitting?: boolean;
  /** Omit on the first screen shown in a path; see BookingFlowSheet's history stack. */
  onPrevious?: () => void;
}

/**
 * Confirm step - the single dedicated review-and-submit screen for every
 * path through the booking flow (client-booking-flow-prd.md "Submission"),
 * regardless of which of the three populations (session+profile already
 * complete, phone just verified with an existing profile, or a genuinely
 * new phone via `NewUserDetailsStep`) got here. `recap.profile` shows every
 * population's name + address now (changed 2026-08-23 - see
 * `OrderRecapProps.profile`'s doc comment); `recap.onChangeAddress`, when
 * present, opens `ChooseAddressStep` to pick a different saved address or
 * add a new one - see `BookingFlowSheet`'s `"choose_address"` phase.
 *
 * Deliberately its own screen rather than rendered inline at the bottom of
 * whichever step used to be terminal (Attachments/Authentication both did
 * this previously): stacking a recap card under a screen's own interactive
 * content (note/photo entry, or the phone/OTP fields) doesn't reliably fit
 * within `BottomSheet`'s `max-h-[92dvh]` on every device - observed 2026-
 * 08-21 as a scrollbar inside the sheet on a laptop viewport combining
 * Attachments' content with the recap, which must never happen (see
 * `BottomSheet.tsx`'s doc comment). Every terminal population now reaches
 * this exact same recap-only screen instead, so there is exactly one
 * "שלח הזמנה" screen shape to ever verify fits, not three.
 *
 * `OrderRecap` itself is what carries the Figma reference (node 8483:6227/
 * 8483:6420, confirmed 2026-08-20) - it's styled after `ActiveJobCard`
 * since this screen is effectively previewing the job card the order
 * becomes. This wrapper's own heading/subheading and footer are unchanged,
 * built against existing design-system primitives (`BookingStepFooter`).
 */
export function ConfirmStep({ recap, onSubmit, submitting = false, onPrevious }: ConfirmStepProps) {
  return (
    <div className="flex w-full flex-col gap-10">
      <div className="flex w-full flex-col gap-4">
        <div className="flex w-full flex-col gap-2 text-right text-text-secondary">
          <p className="w-full text-lg font-semibold leading-[1.4]">{COPY.bookingFlow.confirm.heading}</p>
          <p className="w-full text-sm leading-[1.4]">{COPY.bookingFlow.confirm.subheading}</p>
        </div>
        <OrderRecap {...recap} />
      </div>
      <BookingStepFooter
        onPrevious={onPrevious}
        nextLabel={COPY.bookingFlow.submitOrder}
        onNext={onSubmit}
        nextDisabled={submitting}
      />
    </div>
  );
}
