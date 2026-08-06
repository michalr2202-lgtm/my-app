"use client";

import { useMemo, useState } from "react";
import { BookingStepFooter } from "@/components/client/booking/BookingStepFooter";
import { SelectableServicePill } from "@/components/client/booking/SelectableServicePill";
import { COPY } from "@/lib/copy";
import { getSchedulableDates } from "@/lib/scheduling";

export interface SchedulingDateStepProps {
  onNext: (date: Date) => void;
  /** Restores the date selection when returning to this screen via "הקודם". */
  initialDate?: Date | null;
  /** Omit on the first screen shown in a path; see BookingFlowSheet's history stack. */
  onPrevious?: () => void;
}

/**
 * Scheduling step, date question (Figma: OrderBottomSheet_Scheduling, node
 * 8412:6072 - top half). Its own screen: the hour question only loads after
 * "הבא" is pressed here (see /docs/client-booking-flow-prd.md "Step Screen
 * Reveal Rule") - it must not appear on this same screen.
 */
export function SchedulingDateStep({ onNext, initialDate = null, onPrevious }: SchedulingDateStepProps) {
  const dates = useMemo(() => getSchedulableDates(), []);
  const [selectedDate, setSelectedDate] = useState<Date | null>(initialDate);

  const handleNext = () => {
    if (!selectedDate) return;
    onNext(selectedDate);
  };

  return (
    <div className="flex w-full flex-col gap-10">
      <div className="flex w-full flex-col gap-4">
        <div className="flex w-full flex-col gap-2 text-right text-text-secondary">
          <p className="w-full text-lg font-semibold leading-[1.4]">
            {COPY.bookingFlow.scheduling.heading}
          </p>
          <p className="w-full text-sm leading-[1.4]">
            {COPY.bookingFlow.scheduling.subheading}
          </p>
        </div>
        <div className="flex w-full flex-wrap items-start justify-start gap-x-2 gap-y-4">
          {dates.map(({ date, label }) => (
            <SelectableServicePill
              key={date.toISOString()}
              label={label}
              selected={selectedDate?.getTime() === date.getTime()}
              onClick={() => setSelectedDate(date)}
            />
          ))}
        </div>
      </div>

      <BookingStepFooter
        onPrevious={onPrevious}
        nextLabel={COPY.bookingFlow.scheduling.next}
        onNext={handleNext}
        nextDisabled={!selectedDate}
      />
    </div>
  );
}
