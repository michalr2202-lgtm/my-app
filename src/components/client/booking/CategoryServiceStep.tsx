"use client";

import { useState } from "react";
import { BookingStepFooter } from "@/components/client/booking/BookingStepFooter";
import { NoteField } from "@/components/client/booking/NoteField";
import { SelectableServicePill } from "@/components/client/booking/SelectableServicePill";
import { COPY } from "@/lib/copy";
import { formatServicePriceLine } from "@/lib/servicePricing";

export interface CategoryServiceOption {
  id: string;
  label_he: string;
  price_min: number;
  price_max: number;
  pricing_type: string;
}

export interface CategoryServiceStepProps {
  categoryLabel: string;
  /** Every active catalog service in the category picked on Step 1 - currently always ≤10 (see this component's doc comment). */
  services: CategoryServiceOption[];
  /** Called on Next when a catalog service pill is selected. */
  onNext: (selectionId: string) => void;
  /** Called on Next when the "אחר" field has typed text instead - triggers `BookingFlowSheet`'s AI re-classification (see its doc comment). */
  onOtherNext: (description: string) => void;
  /** True while `onOtherNext`'s request is in flight - disables "הבא", same pattern as `ConfirmStep`'s `submitting`. */
  analyzing?: boolean;
  /** Restores the pill selection when returning to this screen via "הקודם". */
  initialSelectedId?: string | null;
  /** Restores the "אחר" field's typed text when returning to this screen via "הקודם". */
  initialOtherText?: string;
  onPrevious?: () => void;
}

/**
 * Step 2 (Service Selection within a manually-picked category) for the
 * Time Pill entry point (Flow 2, added 2026-09-06 - see
 * `client-booking-flow-prd.md` §3 "Entry Point Mapping"). Reached only
 * after `CategoryStep`; every category currently has exactly 10 active
 * catalog services (confirmed against live data 2026-09-06), so there is
 * no ranking/truncation to do here - every active service in the category
 * is shown, unlike `SearchMatchStep`'s "up to 3 AI-suggested" services.
 *
 * The "אחר / לא מוצא את מה שאני מחפש" pill (reworked 2026-09-06, per
 * product decision) is not a plain selection - tapping it swaps it out of
 * the pill grid for a `NoteField` (the exact same textarea/chip object
 * `AttachmentsStep`'s note uses), where the customer describes what they
 * actually need in free text. "הבא" then hands that description up via
 * `onOtherNext` instead of `onNext`, which runs it through
 * `BookingFlowSheet`'s `handleCategoryOtherNext` - the *same* AI
 * classification the search box (`SearchMatchStep`'s entry) uses, landing
 * on the same three outcomes (services to pick from / category identified
 * but not priced yet / no matching profession at all), regardless of
 * whether the AI's classification agrees with the category already picked
 * here.
 *
 * Selecting a real service pill and the "אחר" field are mutually
 * exclusive as *choices* - only one can be `canContinue`'s/`handleNext`'s
 * "the" current selection at a time (`otherChosen` tracks which one).
 * Unlike a real pill's selection though, picking a *different* real pill
 * does not erase whatever was already typed into "אחר" (fixed 2026-09-07 -
 * it used to reset the field back to its empty trigger, which discarded a
 * real draft the customer might come back to): the field just visually
 * demotes to `NoteField`'s `"unselected"` variant (`bg-surface-pill`, the
 * same gray a real pill's own unselected state uses) while still showing
 * the saved text and its edit/delete icons. It's only actually cleared -
 * reverting the whole field back to the plain trigger pill - via its own
 * Trash2 icon, or via Pencil into an empty save, or by going back to Step
 * 1 and picking a *different* category (`BookingFlowSheet`'s
 * `handleCategoryNext` clears its `categoryOtherText` in that case - a
 * draft written against one category's context shouldn't silently follow
 * into a different one). Re-promoting an "unselected" chip back to the
 * active choice (`"selected"` variant, `bg-surface-selected` - the same
 * cyan a real pill's own selected state uses) happens via *either* tapping
 * the chip body itself (`handleOtherSelect`, added 2026-09-07 - stays
 * closed, doesn't open the textarea) or its Pencil icon (opens the
 * textarea too) - either demotes whatever real pill was selected instead,
 * so it's always unambiguous which one thing is currently chosen. The
 * open textarea itself always renders in `NoteField`'s neutral colors
 * regardless of `otherChosen` (confirmed 2026-09-07) - the cyan "selected"
 * look only ever appears on the settled, closed chip, never while
 * actively typing.
 */
export function CategoryServiceStep({
  categoryLabel,
  services,
  onNext,
  onOtherNext,
  analyzing = false,
  initialSelectedId = null,
  initialOtherText = "",
  onPrevious,
}: CategoryServiceStepProps) {
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId);
  const [otherActive, setOtherActive] = useState(false);
  const [otherText, setOtherText] = useState(initialOtherText);
  // A real pill restored from `initialSelectedId` means that pill (not
  // "אחר") was the last active choice, even if `initialOtherText` also has
  // leftover draft text - see this component's doc comment.
  const [otherChosen, setOtherChosen] = useState(!initialSelectedId && Boolean(initialOtherText.trim()));
  const selectedService = services.find((service) => service.id === selectedId) ?? null;
  const trimmedOtherText = otherText.trim();
  const otherFieldShown = otherActive || Boolean(trimmedOtherText);
  const canContinue = Boolean(selectedId) || (otherChosen && Boolean(trimmedOtherText));

  const handleSelectService = (serviceId: string) => {
    setSelectedId(serviceId);
    setOtherActive(false);
    setOtherChosen(false);
  };

  const handleActivateOther = () => {
    setSelectedId(null);
    setOtherChosen(true);
    setOtherActive(true);
  };

  const handleOtherOpenChange = (open: boolean) => {
    setOtherActive(open);
    if (open) {
      // Re-opening an "unselected" chip for editing re-promotes it to the
      // active choice - see this component's doc comment. A plain close
      // (blur, `open === false`) leaves `otherChosen`/`selectedId` alone.
      setSelectedId(null);
      setOtherChosen(true);
    }
  };

  /**
   * Tapping anywhere on an "unselected" chip's body (added 2026-09-07) -
   * re-promotes it to the active choice, same as re-opening it for
   * editing does, but *without* opening the textarea (only the Pencil
   * icon does that - see `NoteField`'s `onSelect` doc comment). Lets a
   * customer switch back to a previously-typed "אחר" description with one
   * tap on the chip itself, the same way tapping any other pill selects
   * it, instead of having to open-then-blur it just to reselect it.
   */
  const handleOtherSelect = () => {
    setSelectedId(null);
    setOtherChosen(true);
  };

  const handleNext = () => {
    if (selectedId) {
      onNext(selectedId);
      return;
    }
    if (otherChosen && trimmedOtherText) {
      onOtherNext(trimmedOtherText);
    }
  };

  return (
    <div className="flex w-full flex-col gap-10">
      <div className="flex w-full flex-col gap-6">
        <div className="flex w-full flex-col gap-2 text-right text-text-secondary">
          <p className="w-full text-lg font-semibold leading-[1.4]">
            {COPY.bookingFlow.categoryService.selectedProfessionLabel}
          </p>
          <p className="w-full text-sm leading-[1.4]">{categoryLabel}</p>
        </div>

        <div className="flex w-full flex-col gap-4">
          <p className="w-full text-right text-lg font-semibold leading-[1.4] text-text-secondary">
            {COPY.bookingFlow.categoryService.heading}
          </p>
          <div className="flex w-full flex-wrap items-start justify-start gap-x-2 gap-y-4">
            {services.map((service) => (
              <SelectableServicePill
                key={service.id}
                label={service.label_he}
                selected={selectedId === service.id}
                onClick={() => handleSelectService(service.id)}
              />
            ))}
            {otherFieldShown ? (
              // `w-full` (not just another flex item) so this always sits
              // on its own row in the `flex-wrap` grid above, even when
              // the last catalog pill left room beside it - it then hugs
              // its own content within that row (see `NoteField`'s
              // `"selected"`/`"unselected"` variants), rather than
              // spanning edge-to-edge like `AttachmentsStep`'s note does.
              <div className="w-full">
                <NoteField
                  value={otherText}
                  onChange={setOtherText}
                  open={otherActive}
                  onOpenChange={handleOtherOpenChange}
                  placeholder={COPY.bookingFlow.categoryService.otherPlaceholder}
                  editAriaLabel={COPY.bookingFlow.categoryService.otherEditAriaLabel}
                  deleteAriaLabel={COPY.bookingFlow.categoryService.otherDeleteAriaLabel}
                  variant={otherChosen ? "selected" : "unselected"}
                  onSelect={handleOtherSelect}
                />
              </div>
            ) : (
              <div className="w-full">
                <SelectableServicePill
                  label={COPY.bookingFlow.categoryService.otherOption}
                  selected={false}
                  onClick={handleActivateOther}
                />
              </div>
            )}
          </div>
          {selectedService ? (
            <p className="w-full text-right text-sm leading-[1.4] text-text-secondary">
              {formatServicePriceLine(selectedService)}
            </p>
          ) : null}
        </div>
      </div>

      <BookingStepFooter
        onPrevious={onPrevious}
        nextLabel={COPY.bookingFlow.categoryService.next}
        onNext={handleNext}
        nextDisabled={!canContinue || analyzing}
      />
    </div>
  );
}
