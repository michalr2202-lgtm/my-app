import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "sheetNext" | "sheetPrevious" | "primary";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  /**
   * `sheetNext` — Bottom Sheet mid-flow CTA (Figma PrimaryButtonBottomSheet_Next).
   * Inactive (disabled / no selection yet): surface-pill + text-secondary.
   * Active (enabled after selection): surface-selected + brand-primary text.
   * `sheetPrevious` — Bottom Sheet mid-flow secondary action, paired next to
   * `sheetNext` in a row (Figma node 8421:6074). Transparent background,
   * brand-primary text; always rendered active (no disabled state).
   * `primary` — reserved for final / "instant" CTAs (brand fill); also used for
   * temporary "back home" until a dedicated active-sheet variant lands in Figma.
   */
  variant?: ButtonVariant;
}

/**
 * Button - full-width-capable rounded CTA primitive.
 * Press feedback matches global rules: scale + brightness, 0.2s ease.
 */
export function Button({
  children,
  className,
  variant = "primary",
  disabled,
  ...props
}: ButtonProps) {
  const isSheetNext = variant === "sheetNext";
  const isSheetPrevious = variant === "sheetPrevious";
  const sheetActive = isSheetNext && !disabled;

  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        "inline-flex w-full items-center justify-center rounded-full px-[22.5px] py-[15px]",
        "text-base font-medium leading-[1.4]",
        "transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
        "active:scale-[0.96] active:brightness-95",
        "disabled:pointer-events-none",
        isSheetNext &&
          (sheetActive
            ? "bg-surface-selected text-brand-primary"
            : "bg-surface-pill text-text-secondary"),
        isSheetPrevious && "bg-transparent text-brand-primary",
        !isSheetNext && !isSheetPrevious &&
          "bg-brand-primary text-surface-bg shadow-button disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
