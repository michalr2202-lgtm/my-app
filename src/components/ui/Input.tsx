import { useId, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Renders above the field. */
  label?: string;
  /** Renders below the field in `text-notification-red`; takes precedence over `helperText`. */
  error?: string;
  /** Renders below the field in `text-text-secondary` when there's no error. */
  helperText?: string;
  /**
   * Forces the placeholder to full-opacity `text-secondary` even though
   * `label` is set. The default (label → faint `/20` placeholder) assumes
   * the placeholder is just a format hint the label already covers - set
   * this when the placeholder instead conveys real information the label
   * doesn't (e.g. `AuthenticationStep`'s OTP field, `"הקוד שקיבלת ב-SMS"`),
   * which still needs to stay legible. See design-system.md "Forms".
   */
  placeholderFullOpacity?: boolean;
  /**
   * Extra classes for the `<input>` element itself, e.g. `placeholder:`/
   * `focus:` pseudo-class overrides that only work on the real form
   * control (see `AuthenticationStep`'s phone field). `className` targets
   * the outer wrapper instead - same convention as `Combobox` - so
   * layout classes (`flex-1`, `w-[72px]`, ...) from a parent flex row
   * apply to the actual flex item.
   */
  inputClassName?: string;
}

/**
 * Input - text field primitive with optional label/error/helper text.
 * First real form fields in the app beyond `AttachmentsStep`'s note
 * `textarea` (see `AuthenticationStep`, `NewUserDetailsStep`) - see
 * design-system.md "Forms" for the error-state color decision.
 *
 * SearchBar still implements its own bespoke input (icon + accent caret +
 * pill shape) rather than using this, since it doesn't match a generic
 * text field.
 */
export function Input({
  className,
  inputClassName,
  dir = "rtl",
  label,
  error,
  helperText,
  placeholderFullOpacity = false,
  id,
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const message = error ?? helperText;

  return (
    <div className={cn("flex w-full flex-col gap-1.5", className)}>
      {label ? (
        <label htmlFor={inputId} className="text-sm font-medium text-text-primary">
          {label}
        </label>
      ) : null}
      <input
        id={inputId}
        dir={dir}
        aria-invalid={error ? true : undefined}
        className={cn(
          "w-full rounded-xl border bg-surface-bg px-4 py-3",
          "text-sm leading-[1.4] text-text-primary",
          // Faint placeholder only when a `label` already names the field -
          // the placeholder there is just a format hint, not the only
          // instruction, so it can safely be de-emphasized. A field with no
          // label (none currently use `Input` this way, but `SearchBar`'s
          // bespoke input is the equivalent case) keeps the placeholder at
          // full `text-secondary` instead, since it IS the only instruction
          // for what to type - see design-system.md "Forms". `placeholderFullOpacity`
          // opts a labeled field back into full opacity too, for the rarer
          // case where the placeholder itself carries real information.
          label && !placeholderFullOpacity ? "placeholder:text-text-secondary/20" : "placeholder:text-text-secondary",
          "transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] focus:outline-none",
          error ? "border-notification-red" : "border-divider focus:border-brand-primary",
          // Reverted 2026-09-03 (was briefly full-opacity-when-disabled for
          // a few hours) - a locked field needs to visibly *look* locked,
          // or a customer scanning the edit form for "what can I still fix"
          // has no way to tell without tapping every field. A deliberate,
          // narrow exception to design-system.md's general "typed value
          // color never fades" rule - see that doc's "Typed value color"
          // bullet for why a genuinely-locked field earns the opposite
          // call from a merely-not-yet-relevant one (e.g. the OTP-step
          // phone field, which stays full-opacity and non-`disabled`).
          "disabled:pointer-events-none disabled:opacity-50",
          inputClassName
        )}
        {...props}
      />
      {message ? (
        <p
          className={cn(
            "text-xs leading-[1.4]",
            error ? "text-notification-red" : "text-text-secondary"
          )}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
