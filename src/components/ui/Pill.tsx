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
 * rounded-full, px-16 py-12, 14px Medium text, 0.21px tracking.
 *
 * Interaction feedback follows the global rule in
 * /docs/architecture/frontend-architecture.md: 0.2s transition, scale
 * down slightly on press, background darkens ~10% (approximated here via
 * `brightness` since pill background colors are dynamic/data-driven).
 */
export function Pill({
  children,
  colorClassName = "bg-surface-pill text-brand-primary",
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
