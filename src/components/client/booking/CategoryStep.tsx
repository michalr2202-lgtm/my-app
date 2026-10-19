"use client";

import { useState } from "react";
import { BookingStepFooter } from "@/components/client/booking/BookingStepFooter";
import { SelectableServicePill } from "@/components/client/booking/SelectableServicePill";
import { sortCategoriesForDisplay } from "@/lib/categoryVisuals";
import { COPY } from "@/lib/copy";
import type { Category } from "@/lib/types";

export interface CategoryStepProps {
  categories: Category[];
  /**
   * True only for the "דחוף עכשיו" Time Pill entry (added 2026-09-06, see
   * `client-booking-flow-prd.md` §3 "Entry Point Mapping," Flow 2) - shows
   * the extra urgency framing block above the category question. The
   * "לקבוע למועד אחר" Time Pill reaches this exact same screen/component
   * (same Step 1, per that PRD row) but with this `false`, since there's
   * no urgency to frame - it goes straight to the category question, same
   * as reaching Step 1 with literally no prior context at all.
   */
  urgent: boolean;
  onNext: (categoryId: string) => void;
  /** Restores the pill selection when returning to this screen via "הקודם". */
  initialSelectedId?: string | null;
  /** Omit on the first screen shown in a path; see BookingFlowSheet's history stack. */
  onPrevious?: () => void;
}

/**
 * Step 1 (Category Selection) for the Time Pill entry point (Flow 2, added
 * 2026-09-06 - see `client-booking-flow-prd.md` §3 "Entry Point Mapping").
 * Unlike the AI-search path (`SearchMatchStep`, Flow 1), category here is
 * never inferred - the customer picks one of the 4 fixed Home Screen
 * categories directly, so this screen has no "אין התאמה" option; every
 * pill is a real, selectable category.
 *
 * Same layout shape as `SearchMatchStep` (stacked heading/subtext blocks,
 * one "הבא" always at the bottom) - `urgent` just adds one more block on
 * top for the "דחוף עכשיו" case.
 */
export function CategoryStep({
  categories,
  urgent,
  onNext,
  initialSelectedId = null,
  onPrevious,
}: CategoryStepProps) {
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId);
  const sortedCategories = sortCategoriesForDisplay(categories);
  const canContinue = Boolean(selectedId);

  const handleNext = () => {
    if (!selectedId) return;
    onNext(selectedId);
  };

  return (
    <div className="flex w-full flex-col gap-10">
      <div className="flex w-full flex-col gap-6">
        {urgent ? (
          <div className="flex w-full flex-col gap-2 text-right text-text-secondary">
            <p className="w-full text-lg font-semibold leading-[1.4]">
              {COPY.bookingFlow.urgentNow.heading}
            </p>
            <p className="w-full text-sm leading-[1.4]">{COPY.bookingFlow.urgentNow.subtext}</p>
          </div>
        ) : null}

        <div className="flex w-full flex-col gap-4">
          <p className="w-full text-right text-lg font-semibold leading-[1.4] text-text-secondary">
            {COPY.bookingFlow.categorySelect.heading}
          </p>
          <div className="flex w-full flex-wrap items-start justify-start gap-x-2 gap-y-4">
            {sortedCategories.map((category) => (
              <SelectableServicePill
                key={category.id}
                label={category.label_he}
                selected={selectedId === category.id}
                onClick={() => setSelectedId(category.id)}
              />
            ))}
          </div>
        </div>
      </div>

      <BookingStepFooter
        onPrevious={onPrevious}
        nextLabel={COPY.bookingFlow.categorySelect.next}
        onNext={handleNext}
        nextDisabled={!canContinue}
      />
    </div>
  );
}
