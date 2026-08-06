"use client";

import { Pill } from "@/components/ui/Pill";
import { COPY } from "@/lib/copy";

export type TimeSelection = "schedule_later" | "urgent_now";

export interface TimePillsRowProps {
  onSelect: (selection: TimeSelection) => void;
}

/**
 * TimePillsRow - the 2 scheduling entry points.
 * See /docs/home-screen-prd.md 3.4 and Flow 2 (-> opens bottom sheet).
 * Order follows the Figma design exactly: "דחוף עכשיו" (urgent) sits on the
 * right, "לקבוע למועד אחר" (schedule later) on the left - i.e. first in DOM
 * order, since this row is a native RTL flex row (first child = right).
 */
export function TimePillsRow({ onSelect }: TimePillsRowProps) {
  return (
    <div className="flex items-center justify-center gap-2">
      <Pill onClick={() => onSelect("urgent_now")}>{COPY.homeScreen.timePills.urgentNow}</Pill>
      <Pill onClick={() => onSelect("schedule_later")}>{COPY.homeScreen.timePills.scheduleLater}</Pill>
    </div>
  );
}
