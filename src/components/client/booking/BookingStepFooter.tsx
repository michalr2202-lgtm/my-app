"use client";

import { Button } from "@/components/ui/Button";
import { COPY } from "@/lib/copy";

export interface BookingStepFooterProps {
  /** Omit to render only the full-width next/CTA button (first screen in a path). */
  onPrevious?: () => void;
  nextLabel: string;
  onNext: () => void;
  nextDisabled?: boolean;
}

/**
 * Shared footer for booking sheet step screens (Figma node 8421:6074).
 * With `onPrevious`, renders the "הקודם" / next CTA pair side by side
 * (equal width, 8px gap); without it, renders the next CTA alone at full width.
 */
export function BookingStepFooter({
  onPrevious,
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
        {COPY.bookingFlow.previous}
      </Button>
      <Button variant="sheetNext" className="flex-1" disabled={nextDisabled} onClick={onNext}>
        {nextLabel}
      </Button>
    </div>
  );
}
