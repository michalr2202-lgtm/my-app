"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { COPY } from "@/lib/copy";

export interface ComboboxOption {
  value: string;
  label: string;
}

export interface ComboboxProps {
  /** Renders above the field, same as `Input`. */
  label?: string;
  value: string | null;
  onChange: (value: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  /**
   * When true, the closed field doubles as a filter-as-you-type input once
   * opened - matching options narrow as you type. The committed `value` is
   * still always one of `options`: typing without landing on an exact match
   * never commits free text (see the function-level doc comment below).
   */
  searchable?: boolean;
  /**
   * When set (only meaningful with `searchable`), the option list doesn't
   * render until the query is non-empty - this hint text shows in its
   * place. Use this for long option lists (e.g. hundreds of streets) so
   * opening the field doesn't mount every option's DOM node before the
   * user has narrowed anything down; omit it for short lists (e.g. a
   * 2-city picker) where showing everything immediately is cheap and
   * actually helpful for browsing.
   */
  searchHint?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Combobox - restricted single-select primitive (New User Details' city and
 * street fields, client-booking-flow-prd.md Step 6). Styled like `Input`,
 * but tapping it expands its option list inline, below the field, in
 * normal document flow - the same "expand-in-place" pattern already used
 * for AuthenticationStep's OTP field and AttachmentsStep's note field -
 * rather than an absolutely-positioned floating panel, which would risk
 * being clipped by BottomSheet's scroll container (see BottomSheet.tsx).
 *
 * Never accepts arbitrary free text: the `searchable` variant's text input
 * only *filters* `options` for display - `value` only ever changes via
 * `handleSelect` (an explicit tap on a listed option), so closing the list
 * without picking one leaves the previously committed `value` untouched.
 */
export function Combobox({
  label,
  value,
  onChange,
  options,
  placeholder,
  searchable = false,
  searchHint,
  disabled = false,
  className,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const generatedId = useId();

  const selectedOption = useMemo(() => options.find((option) => option.value === value) ?? null, [options, value]);

  const hasQuery = query.trim().length > 0;
  const awaitingQuery = searchable && Boolean(searchHint) && !hasQuery;

  const filteredOptions = useMemo(() => {
    if (!searchable || !hasQuery) return options;
    const normalized = query.trim();
    return options.filter((option) => option.label.includes(normalized));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options, query, searchable, hasQuery]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        close();
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const openList = () => {
    if (disabled) return;
    setQuery("");
    setOpen(true);
    if (searchable) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  };

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  const handleSelect = (option: ComboboxOption) => {
    onChange(option.value);
    close();
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") close();
  };

  return (
    <div ref={containerRef} className={cn("flex w-full flex-col gap-1.5", className)}>
      {label ? (
        <label htmlFor={generatedId} className="text-sm font-medium text-text-primary">
          {label}
        </label>
      ) : null}

      {open && searchable ? (
        <input
          ref={inputRef}
          id={generatedId}
          dir="rtl"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={selectedOption?.label ?? placeholder}
          className={cn(
            "w-full rounded-xl border bg-surface-bg px-4 py-3",
            "text-sm leading-[1.4] text-text-primary",
            // See Input.tsx's matching comment - faint only when `label`
            // already names the field.
            label ? "placeholder:text-text-secondary/20" : "placeholder:text-text-secondary",
            "transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] focus:outline-none",
            "border-brand-primary"
          )}
        />
      ) : (
        <button
          type="button"
          id={generatedId}
          onClick={() => (open ? close() : openList())}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className={cn(
            "flex w-full items-center justify-between rounded-xl border bg-surface-bg px-4 py-3 text-right",
            "text-sm leading-[1.4] transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] focus:outline-none",
            selectedOption ? "text-text-primary" : label ? "text-text-secondary/20" : "text-text-secondary",
            open ? "border-brand-primary" : "border-divider",
            "disabled:pointer-events-none disabled:opacity-50"
          )}
        >
          <span className="min-w-0 truncate">{selectedOption?.label ?? placeholder}</span>
          <ChevronDown
            size={18}
            strokeWidth={1.75}
            className={cn("shrink-0 text-text-secondary transition-transform duration-200", open ? "rotate-180" : "")}
          />
        </button>
      )}

      {open ? (
        <div className="flex w-full flex-col gap-1 rounded-xl border border-divider bg-surface-bg p-1 shadow-notification">
          <div className="flex max-h-64 flex-col overflow-y-auto">
            {awaitingQuery ? (
              <p className="w-full px-3 py-2.5 text-right text-sm text-text-secondary">{searchHint}</p>
            ) : filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-right text-sm leading-[1.4]",
                    "transition-colors duration-150 hover:bg-surface-pill",
                    option.value === value ? "text-text-primary font-medium" : "text-text-primary"
                  )}
                >
                  <span>{option.label}</span>
                  {option.value === value ? <Check size={16} strokeWidth={2} className="shrink-0" /> : null}
                </button>
              ))
            ) : (
              <p className="w-full px-3 py-2.5 text-right text-sm text-text-secondary">
                {COPY.shared.combobox.noResults}
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
