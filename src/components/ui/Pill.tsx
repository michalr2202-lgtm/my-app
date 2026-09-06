import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface PillProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  /** Background/text color classes (e.g. "bg-surface-pill text-brand-primary"). */
  colorClassName?: string;
  style?: React.CSSProperties;
}

/**
 * Pill - reusable rounded-full UI primitive.
 *
 * Used for: TimePill, ServicePill, ExpandServicesButton (see
 * /docs/home-screen-prd.md Component Architecture). Visuals per Figma:
 * rounded-full, px-16 py-12, 14px Medium text. No letter-spacing override -
 * Figma's per-node tracking value here is an auto-kerning artifact, not an
 * intentional token; see design-system.md "Typography" for the app-wide
 * letter-spacing: 0 rule this follows instead.
 *
 * Default `colorClassName` is text-only, no background (changed
 * 2026-09-04 from `"bg-surface-pill text-brand-primary"` - every Home
 * Screen secondary button using this default, "דחוף עכשיו"/"לקבוע למועד
 * אחר" (`TimePillsRow`) and "הצג יותר עבודות"/"הצג פחות"
 * (`PopularServicesSection`), went fully transparent that day, matching
 * `OrderRecap`'s own "שנה כתובת" no-background treatment exactly - same
 * box (`rounded-full`, `px-4 py-3`), same text
 * (`text-sm font-medium text-brand-primary`), just no fill). Size/shape
 * never changes based on color - a caller that DOES want a filled pill
 * (`ServicePill`'s per-category background, or a future one) passes its
 * own `colorClassName` explicitly (e.g. `"bg-surface-pill text-brand-
 * primary"` to restore this exact prior look) rather than this component
 * ever guessing when to add a background back on its own.
 *
 * Interaction feedback follows the global rule in
 * /docs/architecture/frontend-architecture.md: 0.2s transition, scale
 * down slightly on press, background darkens ~10% (approximated here via
 * `brightness` since pill background colors are dynamic/data-driven) -
 * this still fires even with no background at all (`active:brightness-95`
 * on transparent is a no-op visually, but harmless, and keeps every
 * `Pill` usage's press feedback identical regardless of color).
 */
export function Pill({
  children,
  colorClassName = "text-brand-primary",
  className,
  style,
  ...props
}: PillProps) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-full px-4 py-3",
            "font-medium text-sm leading-[1.4]",
        "transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
        "active:scale-[0.96] active:brightness-95",
        "disabled:pointer-events-none disabled:opacity-50",
        colorClassName,
        className
      )}
      style={style}
      {...props}
    >
      {children}
    </button>
  );
}
