"use client";

import { Pill } from "@/components/ui/Pill";
import { cn } from "@/lib/cn";

export interface SelectableServicePillProps {
  label: string;
  selected: boolean;
  onClick: () => void;
}

/**
 * Selectable service pill for the booking Bottom Sheet.
 * Uniform neutral background for all options; selected = surface-selected (cyan).
 * Distinct from Home `ServicePill`, which uses category colors and is not selectable.
 */
export function SelectableServicePill({ label, selected, onClick }: SelectableServicePillProps) {
  return (
    <Pill
      onClick={onClick}
      colorClassName={cn(
        "min-w-[72px] text-text-secondary",
        selected ? "bg-surface-selected" : "bg-surface-pill"
      )}
    >
      {label}
    </Pill>
  );
}
