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
            "relative z-10 flex w-full flex-col rounded-t-card bg-surface-bg px-4 pb-6 pt-4",
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
