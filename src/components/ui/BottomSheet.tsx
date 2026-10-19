"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { COPY } from "@/lib/copy";

export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Hide the default X close control (e.g. if the step renders its own). Default shows it. */
  showCloseButton?: boolean;
  className?: string;
}

/**
 * BottomSheet - shared overlay shell for booking (and future) flows.
 * Covers the full viewport including BottomNavigation; scrim is 70% black.
 * Panel docks to the bottom with top corners rounded (`rounded-sheet`).
 *
 * Hard rule (confirmed 2026-08-21): no Bottom Sheet screen may ever
 * actually scroll, on any device - mobile or desktop. If a screen's
 * content doesn't fit, the fix is to split it into an additional step, not
 * to let it scroll (this is why booking's Step 7 exists as its own screen
 * instead of stacking `OrderRecap` under Step 6's already-full field list,
 * and why the recap is never rendered inline on Attachments/Authentication
 * either - see `ConfirmStep`'s doc comment for the concrete case this was
 * caught from).
 *
 * `max-h-[92dvh]`/`overflow-y-auto` below stay as a defensive cap only -
 * every individual step must independently fit comfortably under that
 * height by design, so in normal operation this never actually engages
 * (no visible scrollbar, nothing to scroll). It exists purely so an
 * unexpectedly tall screen fails safe (content still reachable by
 * scrolling) instead of failing hard (its footer/submit button pushed
 * off-screen and completely unreachable) - it is not a substitute for
 * verifying every step actually fits.
 *
 * `[scrollbar-gutter:stable]` (added 2026-09-07) reserves this desktop
 * scrollbar's width up front, whether or not it's actually showing -
 * without it, content that grows just past `92dvh` (e.g. a price line
 * appearing under a newly-selected pill on `CategoryServiceStep`) makes a
 * scrollbar appear and shrink the available width by its few pixels,
 * which is enough to reflow a `flex-wrap` pill grid mid-interaction (pills
 * silently changing how many fit per row) - looked like selecting a pill
 * itself was causing a layout jump, when it was really this scrollbar
 * appearing/disappearing on the sheet's outer container.
 */
export function BottomSheet({
  open,
  onClose,
  children,
  showCloseButton = true,
  className,
}: BottomSheetProps) {
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-center">
      <div className="relative flex h-full w-full max-w-[480px] flex-col justify-end">
        <button
          type="button"
          aria-label={COPY.bookingFlow.closeAriaLabel}
          className="absolute inset-0 bg-overlay-scrim"
          onClick={onClose}
        />
        <div
          role="dialog"
          aria-modal="true"
          className={cn(
            "relative z-10 flex max-h-[92dvh] w-full flex-col overflow-y-auto [scrollbar-gutter:stable] rounded-t-card bg-surface-bg px-4 pb-6 pt-4",
            className
          )}
        >
          {showCloseButton ? (
            <div className="mb-3 flex w-full items-center justify-end">
              <button
                type="button"
                onClick={onClose}
                aria-label={COPY.bookingFlow.closeAriaLabel}
                className="flex size-6 items-center justify-center text-text-primary transition-transform duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] active:scale-[0.96]"
              >
                <X size={24} strokeWidth={1.75} />
              </button>
            </div>
          ) : null}
          {children}
        </div>
      </div>
    </div>
  );
}
