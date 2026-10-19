"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { COPY } from "@/lib/copy";

export interface ImageLightboxProps {
  /** The photo to preview at full size. `null` renders nothing (closed). */
  src: string | null;
  onClose: () => void;
}

/**
 * ImageLightbox - full-viewport photo preview. Reuses `BottomSheet`'s
 * dismiss affordances (tap the scrim, Escape, body-scroll lock while open)
 * so closing a photo works exactly like closing any other overlay in the
 * app - per product direction (2026-09-28): "רקע שחור עם שקיפות - שזה בדיוק
 * אותו דבר כמו כשנפתח bottom sheet". The scrim's *color* is its own
 * heavier variant, not literally `bg-overlay-scrim` - see "Entrance
 * animation" below.
 *
 * Unlike `BottomSheet`, the panel isn't docked to the bottom - this is a
 * preview, not a form/step, so the photo is simply centered in the
 * viewport. It's never cropped: `object-contain` inside a box capped by
 * `max-w-[calc(100%-2rem)]`/`max-h-[80dvh]` (the same 16px edge inset every
 * screen already uses via `px-4`) keeps it at its real aspect ratio, scaled
 * down only as far as needed to fit - per product direction, "בפרופורציה
 * המקורית שלה (כלומר לא ריבוע) ובגודל שהוא הסטנדארט במקרים האלו".
 *
 * Scoped to `max-w-[480px]` exactly like `BottomSheet`, so on wide (desktop)
 * viewports the scrim/photo stay within the app's centered column instead
 * of spanning the real browser edges.
 *
 * Takes `src` directly (not `open`/`photos`/an index) - its one caller so
 * far (`JobDetailsScreen`'s attached-photos row) only ever needs to preview
 * one already-known URL at a time; a multi-photo swipeable gallery isn't
 * something this design has asked for yet.
 *
 * **Entrance animation** (added 2026-09-28, per product direction - opening
 * instantly "בום" read as too abrupt for what should feel like a quiet
 * gallery moment): the backdrop and photo animate in together but with
 * distinct timing/easing, not as one single fade -
 * - **Backdrop:** `opacity` 0 → 1 over 300ms, `ease-out`. Its own background
 *   is the heavier `bg-overlay-scrim-heavy` (85% black, `globals.css` -
 *   deliberately darker than `BottomSheet`'s shared 70% scrim, since this
 *   overlay's whole point is isolating one photo, not just dimming behind
 *   a form) - transitioning this element's `opacity` (not the color's own
 *   alpha) scales that 85% down to 0% at the start and back up to the full
 *   85% by the end.
 * - **Photo:** `opacity` 0 → 1 *and* `scale-95` → `scale-100` together,
 *   over 350ms with `cubic-bezier(0.16,1,0.3,1)` - a fast-start,
 *   soft-landing curve (no built-in Tailwind `ease-*` matches it, hence
 *   the arbitrary value - same convention `Pill`/`Button`/`IconButton`
 *   already use for their own custom press-easing). Starting slightly
 *   smaller and letting it settle to full size (rather than popping in at
 *   100%) is what reads as the photo "floating forward into focus" instead
 *   of a system dialog snapping open.
 *
 * Implemented as a manual two-render CSS transition (an `entered` flag,
 * flipped on the frame *after* mount via `requestAnimationFrame`, not in
 * the same tick) - a transition can only animate between two states the
 * browser actually painted; flipping synchronously on mount would let
 * React batch both states into one paint, collapsing the whole transition
 * to nothing. Resets to `false` in the effect's cleanup so every fresh
 * open (this component stays mounted across open/close - only its `return
 * null` toggles, not the component itself, since `JobDetailsScreen` always
 * renders it) starts the animation over from the beginning rather than
 * skipping straight to "entered" the second time.
 *
 * No matching exit animation - closing (scrim tap, Escape, or navigating
 * away) removes the photo immediately. Only the *opening* feel was the
 * product ask here; revisit if an abrupt close ever reads as inconsistent
 * with how soft the open now is.
 *
 * **Rendered via `createPortal(..., document.body)`, not in place** (fixed
 * 2026-09-29 - a real bug, not a style preference): `JobDetailsScreen`'s
 * root wrapper carries `will-change-transform` (see `CircleFloatButton`'s
 * doc comment - added so *that* button's own `fixed` positioning stays
 * scoped to the 480px column instead of the real browser edges). Per spec,
 * `will-change: transform` makes that wrapper a containing block for every
 * `fixed` descendant, not just `CircleFloatButton` - which silently
 * re-scoped this component's `fixed inset-0` overlay too, into a *new*
 * stacking context nested inside that wrapper. A real device/browser then
 * composited that re-scoped overlay *behind* two of its own DOM siblings
 * from elsewhere in `JobDetailsScreen` (the professional-character
 * illustration and the sticky `BottomNavigation`) instead of above them,
 * even though both report a lower/auto z-index - a known class of Chromium
 * compositing bug with nested `will-change`/`fixed` layers, confirmed via
 * direct `getBoundingClientRect`/`z-index` inspection (not just visual
 * screenshots) on 2026-09-29. Symptom as reported: a portrait photo tall
 * enough to render up near the illustration's own vertical position looked
 * "cut off at the top" - it wasn't actually cropped at all (`object-fit:
 * contain` was already correctly preserving its full aspect ratio, verified
 * separately) - the illustration was bleeding through on top of it. A
 * small/square photo never reached that same vertical band, which is why
 * only "elongated" photos ever showed the symptom. Portaling straight to
 * `document.body` renders this overlay as a direct child of `<body>`,
 * completely outside `JobDetailsScreen`'s DOM subtree (and therefore its
 * `will-change-transform` containing block) - its `fixed inset-0` is once
 * again relative to the true root viewport, exactly as a modal like this
 * should behave regardless of whatever CSS any future caller's ancestors
 * happen to use.
 */
export function ImageLightbox({ src, onClose }: ImageLightboxProps) {
  const open = src !== null;
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => {
      cancelAnimationFrame(frame);
      setEntered(false);
    };
  }, [open]);

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

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-center">
      <div className="relative flex h-full w-full max-w-[480px] items-center justify-center">
        <button
          type="button"
          aria-label={COPY.bookingFlow.closeAriaLabel}
          className={`absolute inset-0 bg-overlay-scrim-heavy transition-opacity duration-300 ease-out ${
            entered ? "opacity-100" : "opacity-0"
          }`}
          onClick={onClose}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          className={`relative z-10 max-h-[80dvh] max-w-[calc(100%-2rem)] rounded-card object-contain transition-all duration-[350ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
            entered ? "scale-100 opacity-100" : "scale-95 opacity-0"
          }`}
        />
      </div>
    </div>,
    document.body
  );
}
