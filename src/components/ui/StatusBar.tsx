import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface StatusBarProps {
  children: ReactNode;
  className?: string;
}

/**
 * StatusBar - small rounded status label pill.
 *
 * Name preserved exactly as named in Figma (data-name="StatusBar") -
 * despite the name, this represents a job-status label (e.g. "בדרך אלייך"),
 * not a device status bar. Used inside ActiveJobCard; kept as a ui
 * primitive since job status labels can appear elsewhere (Orders screen).
 */
export function StatusBar({ children, className }: StatusBarProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-full bg-brand-primary px-3 py-1.5",
        "text-sm leading-[1.4] text-surface-bg",
        className
      )}
    >
      {children}
    </span>
  );
}
