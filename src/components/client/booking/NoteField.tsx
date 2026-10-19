"use client";

import { Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";

export interface NoteFieldProps {
  value: string;
  onChange: (value: string) => void;
  /** Whether the textarea is currently open for editing - the caller owns this (see doc comment below). */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  placeholder: string;
  editAriaLabel: string;
  deleteAriaLabel: string;
  /**
   * "row" (default) - `AttachmentsStep`'s full-width snackbar look
   * (`bg-surface-notification`, `w-full`, `text-text-primary`).
   * "selected"/"unselected" (added 2026-09-07, `CategoryServiceStep`'s
   * "אחר" field) - hug-content width like a plain `SelectableServicePill`
   * (`w-fit max-w-full`, so it never spans the full row the way `AttachmentsStep`'s
   * note does), colored to match that pill's own selected/unselected
   * background exactly *once closed* (`bg-surface-selected`/`bg-surface-
   * pill`) - `"selected"` once this is the currently active choice,
   * `"unselected"` once a *different* real service pill becomes the
   * active choice instead, without this field's saved text being
   * discarded (see `CategoryServiceStep`'s `otherChosen`). The open
   * textarea itself deliberately ignores this and always renders the same
   * neutral `"row"` colors regardless of variant (confirmed 2026-09-07) -
   * the cyan "selected" look is reserved for the settled, closed chip;
   * while actively typing it stays visually identical to before this
   * variant existed, so the field's own color never flickers mid-keystroke.
   */
  variant?: "row" | "selected" | "unselected";
  /**
   * Closed-chip only (added 2026-09-07): fires on tapping the chip body
   * itself (its text, or anywhere inside it besides the two icon
   * buttons), re-promoting an `"unselected"` chip back to the active
   * choice *without* opening the textarea - only the Pencil icon does
   * that. Omit for `"row"` usage (`AttachmentsStep`), which has no
   * selected/unselected concept to promote.
   */
  onSelect?: () => void;
}

/**
 * The editing-textarea + filled-chip pair of `AttachmentsStep`'s note
 * feature (Figma nodes 8615:6739/8493:6694), extracted 2026-09-06 so
 * `CategoryServiceStep`'s "אחר" field can reuse the exact same object
 * rather than duplicate it, per product decision. Deliberately covers only
 * these two states, not the third "closed, empty" trigger button - that
 * trigger looks completely different in each caller (`AttachmentsStep`'s
 * full-width "הוסף הערה" snackbar row vs. `CategoryServiceStep`'s small
 * `SelectableServicePill` sitting inline in a `flex-wrap` pill grid), so
 * each caller renders its own trigger and only mounts this component once
 * editing starts or there's already text to show - i.e. whenever
 * `open || value.trim()` is true. `open` is controlled by the caller
 * (not local state here) because each caller's own trigger button is the
 * thing that first flips it to `true`.
 */
export function NoteField({
  value,
  onChange,
  open,
  onOpenChange,
  placeholder,
  editAriaLabel,
  deleteAriaLabel,
  variant = "row",
  onSelect,
}: NoteFieldProps) {
  const trimmed = value.trim();
  const isRow = variant === "row";

  if (open) {
    return (
      <textarea
        autoFocus
        rows={3}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={() => onOpenChange(false)}
        placeholder={placeholder}
        className="w-full resize-none rounded-card bg-surface-notification px-6 py-3 text-right text-sm leading-[1.4] text-text-primary shadow-notification outline-none placeholder:text-text-secondary"
      />
    );
  }

  return (
    <div
      onClick={onSelect}
      className={cn(
        "flex items-center gap-3 rounded-full px-6 py-3",
        isRow
          ? "w-full bg-surface-notification shadow-notification"
          : cn("w-fit max-w-full", variant === "selected" ? "bg-surface-selected" : "bg-surface-pill")
      )}
    >
      {/* Symmetric px-6 (24px each side - see AttachmentsStep's original
          doc comment for why this row, unlike the trigger rows, doesn't
          give one edge an extra 12px): this row leads with text, not an
          icon, so there's no single "leading edge" to weight. Edit
          (Pencil) trails the text first, closer to what it edits, delete
          (Trash2) last/outermost, gap-3 (12px) apart, each at the standard
          24px glyph size. */}
      <p
        className={cn(
          "min-w-0 flex-1 truncate text-right text-sm leading-[1.4]",
          isRow ? "text-text-primary" : "text-text-secondary"
        )}
      >
        {trimmed}
      </p>
      <button
        type="button"
        aria-label={editAriaLabel}
        onClick={(event) => {
          // Stop propagation - opening the textarea is a distinct action
          // from `onSelect`'s "just re-select, stay closed" (see that
          // prop's doc comment); without this the wrapping `div`'s
          // `onClick` above would also fire on every Pencil tap.
          event.stopPropagation();
          onOpenChange(true);
        }}
        className="flex size-6 shrink-0 items-center justify-center text-brand-primary transition-transform duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] active:scale-[0.96]"
      >
        <Pencil size={24} strokeWidth={1.75} />
      </button>
      <button
        type="button"
        aria-label={deleteAriaLabel}
        onClick={(event) => {
          event.stopPropagation();
          onChange("");
        }}
        className="flex size-6 shrink-0 items-center justify-center text-brand-primary transition-transform duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] active:scale-[0.96]"
      >
        <Trash2 size={24} strokeWidth={1.75} />
      </button>
    </div>
  );
}
