"use client";

import { Button } from "@/components/ui/Button";
import { COPY } from "@/lib/copy";

export interface BookingStepFooterProps {
  /** Omit to render only the full-width next/CTA button (first screen in a path). */
  onPrevious?: () => void;
  /**
   * Overrides the default "הקודם" text (added 2026-08-25) - e.g.
   * `ChooseAddressStep`'s edit view uses "חזור" here since that button
   * discards a staged edit and returns to the address list, rather than
   * literally going back a step in the sheet's history.
   */
  previousLabel?: string;
  nextLabel: string;
  onNext: () => void;
  nextDisabled?: boolean;
}

/**
 * Shared footer for booking sheet step screens (Figma node 8421:6074).
 * With `onPrevious`, renders the previous/next CTA pair side by side
 * (equal width, 8px gap); without it, renders the next CTA alone at full width.
 */
export function BookingStepFooter({
  onPrevious,
  previousLabel,
  nextLabel,
  onNext,
  nextDisabled,
}: BookingStepFooterProps) {
  if (!onPrevious) {
    return (
      <Button variant="sheetNext" disabled={nextDisabled} onClick={onNext}>
        {nextLabel}
      </Button>
    );
  }

  return (
    <div className="flex w-full gap-2">
      <Button variant="sheetPrevious" className="flex-1" onClick={onPrevious}>
        {previousLabel ?? COPY.bookingFlow.previous}
      </Button>
      <Button variant="sheetNext" className="flex-1" disabled={nextDisabled} onClick={onNext}>
        {nextLabel}
      </Button>
    </div>
  );
}
