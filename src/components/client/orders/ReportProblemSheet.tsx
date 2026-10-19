"use client";

import { useState } from "react";
import { BookingStepFooter } from "@/components/client/booking/BookingStepFooter";
import { SelectableServicePill } from "@/components/client/booking/SelectableServicePill";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { COPY } from "@/lib/copy";
import { SUPPORT_PHONE_NUMBER } from "@/lib/support";
import { supabase } from "@/lib/supabase";

export interface ReportProblemSheetProps {
  open: boolean;
  onClose: () => void;
  /** Always a real job id by the time this can open - see `JobDetailsScreen`, which only ever renders this inside its `job ?` branch. */
  jobId: string;
  /**
   * True only for `status === "searching_professional"` (confirmed
   * 2026-10-01, via product direction, after the customer's own
   * reasoning: "what's the likelihood of wanting to talk to support
   * right after creating an order?"). Skips the `"choose"` screen
   * entirely - no professional is committed yet at this status (same
   * reasoning `canSelfServiceCancel` already uses to make this status
   * unconditionally self-cancelable regardless of the 2-hour window), so
   * "ליצור קשר עם שירות הלקוחות" isn't a meaningful second option here -
   * there's nothing yet for a human to get involved in. Opens directly
   * on `"cancelConfirm"` instead, with no "הקודם" (there's no `"choose"`
   * screen to return to) - a single full-width action, same
   * `BookingStepFooter` "no `onPrevious`" rendering `ServiceConfirmStep`'s
   * first-screen-in-a-path case already uses.
   */
  cancelOnly: boolean;
  /** Called right after a successful cancel, before `onClose` - `JobDetailsScreen` uses this to `router.refresh()` so the now-`cancelled` status reflects everywhere on the screen (status badge, hidden call button, this very Pill disappearing into `HISTORY_STATUSES`). */
  onCancelled: () => void;
}

type Phase = "choose" | "cancelConfirm" | "contactSupport";
type ChooseOption = "cancel" | "contact";

/**
 * `JobDetailsScreen`'s "נתקלת בבעיה?" destination (added 2026-10-01,
 * replacing the previous no-op stub) - see
 * `docs/cancellation-and-rescheduling.md`'s "Customer-Side Cancellation
 * UI" section for the full confirmed design this implements. Only ever
 * mounted/opened for the "more than 2 hours before `scheduled_time` (or
 * `searching_professional`)" state - the other state (2 hours or less)
 * skips this Sheet entirely, replacing the triggering Pill itself with a
 * direct `tel:` link (`callSupportButton`/`callSupportAriaLabel`) built
 * directly into `JobDetailsScreen`, not this component.
 *
 * Three screens, same `BottomSheet`/`BookingStepFooter` chrome the
 * booking flow already uses throughout (per explicit product direction
 * 2026-10-01 - "דאג לשמור על אותם כללי עיצוב שכבר עשינו ב Bottom sheet"),
 * including the same select-a-pill-then-press-"הבא" pattern `CategoryStep`
 * uses (`SelectableServicePill` + `nextDisabled` until something's picked)
 * rather than the two options being independently, instantly tappable:
 *
 * 1. `"choose"` - title "מה תרצה לעשות?", two `SelectableServicePill`s
 *    ("לבטל הזמנה" / "ליצור קשר עם שירות הלקוחות"). "הבא" is disabled
 *    until one is picked, then routes to whichever of the two screens
 *    below matches the pick - deliberately mirrors "לבטל הזמנה" itself,
 *    which also never acts on a single tap (see `"cancelConfirm"`): both
 *    options land on an in-Sheet next screen first, never an immediate
 *    side effect from this screen alone.
 * 2. `"cancelConfirm"` - a real confirmation step (not a second instant
 *    action) since `cancelled` is permanently terminal per
 *    `order-model.md`. "הקודם" returns to `"choose"`; the primary action
 *    calls `advance_job_status` directly (today's RPC, after the
 *    2026-10-01 fix closing its `searching_professional`/`pending_approval`
 *    gap - see `job_transitions.sql`), then `onCancelled()` + `onClose()`.
 * 3. `"contactSupport"` - title "שירות הלקוחות" + the support number
 *    itself as the real `tel:` link (added per explicit product direction
 *    2026-10-01: the Pill tap alone must never silently place a call -
 *    the number has to actually be seen first, mirroring "לבטל הזמנה"'s
 *    own tap-then-confirm shape instead of behaving differently from it).
 *    "הקודם" returns to `"choose"`; "סגור" (not "הבא" - there's nothing
 *    further to advance to here) just dismisses the Sheet.
 *
 * State resets on every close (`handleClose`, not a `useEffect` - same
 * "reset directly, don't synchronize" reasoning `BookingFlowSheet`'s own
 * doc comment gives for its reset-on-render-guard, just simpler here
 * since this Sheet has nothing to fetch on open) - reopening always shows
 * the correct initial screen again (`"cancelConfirm"` if `cancelOnly`,
 * `"choose"` otherwise), never whichever screen was showing last time.
 */
export function ReportProblemSheet({ open, onClose, jobId, cancelOnly, onCancelled }: ReportProblemSheetProps) {
  const initialPhase: Phase = cancelOnly ? "cancelConfirm" : "choose";
  const [phase, setPhase] = useState<Phase>(initialPhase);
  const [selectedOption, setSelectedOption] = useState<ChooseOption | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const handleClose = () => {
    onClose();
    setPhase(initialPhase);
    setSelectedOption(null);
    setCancelling(false);
    setCancelError(null);
  };

  const handleChooseNext = () => {
    if (!selectedOption) return;
    setPhase(selectedOption === "cancel" ? "cancelConfirm" : "contactSupport");
  };

  const handleConfirmCancel = async () => {
    setCancelling(true);
    setCancelError(null);
    const { error } = await supabase.rpc("advance_job_status", {
      p_job_id: jobId,
      p_new_status: "cancelled",
    });
    if (error) {
      console.error("advance_job_status (customer cancel) error:", error);
      setCancelling(false);
      setCancelError(COPY.jobDetailsScreen.reportProblem.cancelError);
      return;
    }
    onCancelled();
    handleClose();
  };

  return (
    <BottomSheet open={open} onClose={handleClose}>
      {phase === "choose" ? (
        <div className="flex w-full flex-col gap-10">
          <div className="flex w-full flex-col gap-4">
            <p className="w-full text-right text-lg font-semibold leading-[1.4] text-text-secondary">
              {COPY.jobDetailsScreen.reportProblem.chooseHeading}
            </p>
            {/*
              Same `flex-wrap` pill-grid layout `CategoryStep`/
              `SchedulingHourStep` use (`gap-x-2`/8px, `gap-y-4`/16px for
              a wrapped second row) - fixed 2026-10-01, was a vertical
              `flex-col` stack (one Pill per row) before this, per
              explicit product direction: these two Pills should sit side
              by side like every other selectable-Pill row in the app,
              wrapping to a second line only if a long label actually
              needs it (the same `flex-wrap` behavior this exact class
              list already gives those other two screens for free - no
              bespoke wrapping logic needed here either).
            */}
            <div className="flex w-full flex-wrap items-start justify-start gap-x-2 gap-y-4">
              <SelectableServicePill
                label={COPY.jobDetailsScreen.reportProblem.cancelOption}
                selected={selectedOption === "cancel"}
                onClick={() => setSelectedOption("cancel")}
              />
              <SelectableServicePill
                label={COPY.jobDetailsScreen.reportProblem.contactSupportOption}
                selected={selectedOption === "contact"}
                onClick={() => setSelectedOption("contact")}
              />
            </div>
          </div>

          <BookingStepFooter
            nextLabel={COPY.jobDetailsScreen.reportProblem.next}
            onNext={handleChooseNext}
            nextDisabled={!selectedOption}
          />
        </div>
      ) : null}

      {phase === "cancelConfirm" ? (
        <div className="flex w-full flex-col gap-10">
          <div className="flex w-full flex-col gap-2 text-right text-text-secondary">
            <p className="w-full text-lg font-semibold leading-[1.4]">
              {COPY.jobDetailsScreen.reportProblem.cancelConfirmHeading}
            </p>
            <p className="w-full text-sm leading-[1.4]">
              {COPY.jobDetailsScreen.reportProblem.cancelConfirmWarning}
            </p>
            {cancelError ? (
              <p className="w-full text-sm leading-[1.4] text-red-600">{cancelError}</p>
            ) : null}
          </div>

          <BookingStepFooter
            onPrevious={cancelOnly ? undefined : () => setPhase("choose")}
            previousLabel={COPY.jobDetailsScreen.reportProblem.previous}
            nextLabel={COPY.jobDetailsScreen.reportProblem.cancelConfirmAction}
            onNext={() => void handleConfirmCancel()}
            nextDisabled={cancelling}
          />
        </div>
      ) : null}

      {phase === "contactSupport" ? (
        <div className="flex w-full flex-col gap-10">
          <div className="flex w-full flex-col items-center gap-2 text-center text-text-secondary">
            <p className="text-lg font-semibold leading-[1.4]">
              {COPY.jobDetailsScreen.reportProblem.contactSupportHeading}
            </p>
            <a href={`tel:${SUPPORT_PHONE_NUMBER}`} dir="ltr" className="text-lg font-semibold leading-[1.4] text-brand-primary">
              {SUPPORT_PHONE_NUMBER}
            </a>
          </div>

          <BookingStepFooter
            onPrevious={() => setPhase("choose")}
            previousLabel={COPY.jobDetailsScreen.reportProblem.previous}
            nextLabel={COPY.jobDetailsScreen.reportProblem.closeAction}
            onNext={handleClose}
          />
        </div>
      ) : null}
    </BottomSheet>
  );
}
