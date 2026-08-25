"use client";

import { useMemo, useState } from "react";
import { BookingStepFooter } from "@/components/client/booking/BookingStepFooter";
import { SelectableServicePill } from "@/components/client/booking/SelectableServicePill";
import { COPY } from "@/lib/copy";
import { buildScheduledTime, getHourSlots } from "@/lib/scheduling";

export interface SchedulingHourStepProps {
  date: Date;
  /**
   * Freezes "today has slots up to this moment" for the whole booking
   * session (see `BookingFlowSheet`'s `flowNow`) - must stay stable across
   * remounts of this step (e.g. via Previous from Attachments), otherwise
   * real time advancing while the user fills in later steps can make
   * previously-available hour slots disappear on return.
   */
  now: Date;
  /** Restores the hour selection when returning to this screen via "הקודם". */
  initialHour?: number | null;
  onNext: (scheduledTime: Date) => void;
  /** Omit on the first screen shown in a path; see BookingFlowSheet's history stack. */
  onPrevious?: () => void;
}

/**
 * Scheduling step, hour question (Figma: OrderBottomSheet_Scheduling, node
 * 8412:6072 - bottom half). Only reached after the date question's "הבא" -
 * its own screen, not shown alongside the date question.
 */
export function SchedulingHourStep({
  date,
  now,
  initialHour = null,
  onNext,
  onPrevious,
}: SchedulingHourStepProps) {
  const hourSlots = useMemo(() => getHourSlots(date, now), [date, now]);
  const [selectedHour, setSelectedHour] = useState<number | null>(initialHour);

  const handleNext = () => {
    if (selectedHour === null) return;
    onNext(buildScheduledTime(date, selectedHour));
  };

  return (
    <div className="flex w-full flex-col gap-10">
      <div className="flex w-full flex-col gap-4">
        <p className="w-full text-right text-lg font-semibold leading-[1.4] text-text-secondary">
          {COPY.bookingFlow.scheduling.timeHeading}
        </p>
        <div className="flex w-full flex-wrap items-start justify-start gap-x-2 gap-y-4">
          {hourSlots.map(({ startHour, label }) => (
            <SelectableServicePill
              key={startHour}
              label={label}
              selected={selectedHour === startHour}
              onClick={() => setSelectedHour(startHour)}
            />
          ))}
        </div>
      </div>

      <BookingStepFooter
        onPrevious={onPrevious}
        nextLabel={COPY.bookingFlow.scheduling.next}
        onNext={handleNext}
        nextDisabled={selectedHour === null}
      />
    </div>
  );
}
