import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface StatusBarProps {
  children: ReactNode;
  /**
   * Visual style (added 2026-09-08 for the Orders screen - see
   * `component-library.md`'s `OrderCard` entry): `"active"` (default,
   * unchanged from this component's original single style) is the
   * brand-blue background/white text look, used for a job that's
   * currently, physically in flight (`on_the_way`/`arrived`/`in_progress`/
   * `waiting_for_customer`/`waiting_for_professional`). `"default"` is the
   * inverse (white background/brand-blue text), used for every other
   * status shown on the Orders screen (confirmed/pending/history) - see
   * `OrderCard`'s doc comment for the full status-to-variant mapping.
   */
  variant?: "active" | "default";
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
export function StatusBar({ children, variant = "active", className }: StatusBarProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-full px-3 py-1.5",
        "text-sm leading-[1.4]",
        variant === "active" ? "bg-brand-primary text-surface-bg" : "bg-surface-bg text-brand-primary",
        className
      )}
    >
      {children}
    </span>
  );
}
