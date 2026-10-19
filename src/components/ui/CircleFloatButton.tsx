"use client";

import { useEffect, useState, type ButtonHTMLAttributes } from "react";
import { createPortal } from "react-dom";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

export interface CircleFloatButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  "aria-label": string;
}

/**
 * CircleFloatButton - floating circular back button (Job Details screen,
 * Figma node 9220:6174, added 2026-09-28). The first "floating overlay"
 * element in the app - every other screen's back/nav affordance has sat
 * in the normal document flow until now.
 *
 * Deliberately `fixed`, not `absolute`: the customer explicitly asked for
 * this button to stay in place while the page scrolls ("שהוא לא זז כשגוללים"),
 * which only `fixed` (positioned against the true viewport) guarantees -
 * `absolute` would still scroll away with an ancestor's content.
 *
 * **Rendered via `createPortal(..., document.body)`** (fixed 2026-09-30 -
 * a real regression of the exact guarantee above, reported live: the
 * button was disappearing/scrolling away on `JobDetailsScreen`, the
 * opposite of "stays in place while scrolling"). The original approach
 * relied on `JobDetailsScreen`'s root wrapper having `will-change:
 * transform`, which per spec makes that wrapper a *containing block* for
 * `fixed` descendants - scoping this button to it instead of the real
 * viewport, exactly as intended for keeping it inside the visual
 * `max-w-[480px]` column on desktop. The bug: that wrapper is an ordinary,
 * content-height flow element (`/orders/[jobId]/page.tsx`'s `min-h-dvh`
 * page just grows taller than the viewport and the whole document
 * scrolls) - not itself pinned to anything - so "fixed relative to it"
 * meant the button scrolled away right along with it, the same
 * containing-block side effect that separately broke `ImageLightbox`
 * (see that component's own doc comment) found and fixed the same day.
 * Portaling straight to `document.body` makes this button immune to
 * whatever CSS any caller's ancestors use, present or future - the
 * general, correct pattern for this class of component, not a one-off
 * patch - and `JobDetailsScreen` no longer needs `will-change-transform`
 * at all now that neither of its two "floating" children depend on it.
 *
 * **Position, recomputed for life directly under `<body>`:**
 * - `top-[calc(env(safe-area-inset-top)+1rem)]` (was a plain `top-4`) -
 *   a portaled `fixed` child of `<body>` ignores `<body>`'s own
 *   `pt-[env(safe-area-inset-top)]` padding entirely (`fixed` elements are
 *   positioned against the viewport, not affected by any ancestor's
 *   padding) - previously this button inherited that inset "for free" by
 *   living inside `<body>`'s padded flow; now it adds the same inset
 *   itself directly, landing at the identical `env(safe-area-inset-top) +
 *   16px` position confirmed 2026-09-29 (simulated a real notch/
 *   safe-area via CDP to verify this exact math before shipping it).
 * - `right-[calc(max(0px,(100vw-480px)/2)+1rem)]` (was `right-4`) - this
 *   app's own `max-w-[480px]` column is horizontally centered
 *   (`mx-auto`), so on any viewport wider than 480px there's real empty
 *   margin on both sides; a plain `right-4` after portaling to `<body>`
 *   would put this button 16px from the *true* browser edge, out past
 *   that margin, away from the visible column - wrong on desktop, though
 *   unnoticeable on the single-column mobile widths this was tested on
 *   before. This expression computes that column's own actual right
 *   margin (`(100vw-480px)/2`, floored at `0px` via `max()` so mobile,
 *   where the column *is* the full viewport, still reduces to the
 *   original `1rem`) and adds the same 16px inward from there - correct
 *   on both mobile and desktop, not just the width this shipped and was
 *   verified at originally.
 *
 * `size-[52px]` + `shadow-button` match Figma's circle exactly (`shadow/
 * button` - a shared design-system token, see `globals.css`'s "Shadows"
 * comment).
 *
 * Icon color corrected 2026-09-29 from `text-text-primary` to
 * `text-brand-primary`: the chevron itself is brand blue in Figma, not the
 * dark neutral used elsewhere for plain icon-only affordances - this
 * button's own circle background stays neutral (`bg-surface-bg`), only the
 * glyph inside it is brand-colored.
 *
 * **`mounted` guard** (added 2026-09-30, alongside the portal fix above -
 * a second real bug from the same change, not a leftover of the first):
 * unlike `ImageLightbox` (closed by default, so its own `if (!open) return
 * null` already skips `document.body` on every render before a user ever
 * opens it - client or server), this button has no "closed" state - it's
 * always meant to be visible. Calling `createPortal(..., document.body)`
 * unconditionally therefore also runs during Next.js's *server-side*
 * render of this "use client" component (client components still get
 * server-rendered for the initial HTML) - crashing with `document is not
 * defined`, since there is no `document` on the server at all. Deferring
 * the portal to after mount (`useEffect` never runs server-side) fixes
 * this the standard way: render nothing on the server/first client render,
 * then the real portaled button one tick later - no visible flash, since
 * this happens well within a single frame, long before anything is
 * painted.
 */
export function CircleFloatButton({ className, ...props }: CircleFloatButtonProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // Synchronizing with a real external system (whether we're running on
    // the client at all, i.e. whether `document` exists yet) - exactly
    // what `useEffect` is for, not trivial derived state. Same reasoning/
    // precedent as `AttachmentsStep.tsx`'s own suppression of this rule.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);
  if (!mounted) return null;

  return createPortal(
    <button
      type="button"
      className={cn(
        "fixed top-[calc(env(safe-area-inset-top)+1rem)] right-[calc(max(0px,(100vw-480px)/2)+1rem)] z-10 flex size-[52px] items-center justify-center rounded-full",
        "bg-surface-bg text-brand-primary shadow-button",
        "transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] active:scale-[0.96] active:brightness-95",
        className
      )}
      {...props}
    >
      <ChevronRight size={24} />
    </button>,
    document.body
  );
}
