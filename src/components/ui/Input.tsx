import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

/**
 * Input - minimal stub primitive.
 *
 * SearchBar currently implements its own bespoke input (icon + accent
 * caret + pill shape) rather than using this, since it doesn't match a
 * generic text field. Flesh this out (label, error state, helper text)
 * once a screen needs a standard form field - see
 * /docs/architecture/component-library.md "Not yet built".
 */
export function Input({ className, dir = "rtl", ...props }: InputProps) {
  return (
    <input
      dir={dir}
      className={cn(
        "w-full rounded-xl border border-divider bg-surface-bg px-4 py-3",
        "text-sm leading-[1.4] text-text-primary placeholder:text-text-secondary",
        "transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] focus:outline-none focus:border-brand-primary",
        "disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}
