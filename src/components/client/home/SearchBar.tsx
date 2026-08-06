"use client";

import { useRef, useState, type KeyboardEvent, type SyntheticEvent } from "react";
import { Search } from "lucide-react";
import { COPY } from "@/lib/copy";

export interface SearchBarProps {
  placeholder?: string;
  onSearch: (query: string) => void;
}

/**
 * SearchBar - problem/service free-text input.
 *
 * Per /docs/home-screen-prd.md 3.3: no auto-search, only triggers on
 * click (search icon) or Enter key.
 *
 * Renders a custom 2px blinking caret instead of the browser's native
 * caret (native carets cannot be widened via CSS - see caret-color/
 * caret-shape spec limitations). The real caret is hidden
 * (`caret-transparent`) and a positioned span stands in for it, tracked
 * via a hidden mirror span so it follows the actual cursor position
 * (click, typing, arrow keys) rather than staying fixed at the start.
 */
export function SearchBar({
  placeholder = COPY.homeScreen.searchBar.placeholder,
  onSearch,
}: SearchBarProps) {
  const [value, setValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [caretOffset, setCaretOffset] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const mirrorRef = useRef<HTMLSpanElement>(null);

  const syncCaretOffset = () => {
    const input = inputRef.current;
    const mirror = mirrorRef.current;
    if (!input || !mirror) return;
    const caretIndex = input.selectionStart ?? input.value.length;
    mirror.textContent = input.value.slice(0, caretIndex);
    setCaretOffset(mirror.offsetWidth);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") onSearch(value);
  };

  const handleInput = (event: SyntheticEvent<HTMLInputElement>) => {
    setValue(event.currentTarget.value);
    syncCaretOffset();
  };

  const handleFocus = () => {
    setIsFocused(true);
    syncCaretOffset();
  };

  return (
    <div className="flex w-full items-center justify-between gap-2 rounded-full bg-surface-searchbar px-6 py-5 shadow-search-bar">
      <div className="relative flex min-w-0 flex-1 items-center">
        <input
          ref={inputRef}
          type="text"
          dir="rtl"
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onKeyUp={syncCaretOffset}
          onClick={syncCaretOffset}
          onFocus={handleFocus}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent text-right text-base leading-[1.4] text-text-secondary caret-transparent placeholder:text-text-secondary placeholder:transition-opacity placeholder:duration-150 focus:placeholder:opacity-0 focus:outline-none"
        />
        {isFocused && (
          <span
            aria-hidden
            className="pointer-events-none absolute h-5 w-[2px] animate-caret-blink rounded-[1px] bg-search-caret"
            style={{ right: caretOffset }}
          />
        )}
        <span
          ref={mirrorRef}
          aria-hidden
          className="pointer-events-none invisible absolute whitespace-pre text-base"
        />
      </div>
      <button
        type="button"
        onClick={() => onSearch(value)}
        aria-label={COPY.homeScreen.searchBar.searchButtonAriaLabel}
        className="flex shrink-0 items-center justify-center transition-transform duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] active:scale-[0.96]"
      >
        <Search size={24} strokeWidth={1.75} className="text-brand-primary" />
      </button>
    </div>
  );
}
