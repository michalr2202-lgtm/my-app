"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { NOTIFICATION_TONE_CLASS, type NotificationTone } from "@/lib/notificationVisuals";

export interface NotificationBannerProps {
  message: string;
  /** Lucide icon, tinted by `tone`. Provide exactly one of `icon`/`iconSrc`. */
  icon?: LucideIcon;
  /** Custom SVG asset with its own baked-in color (e.g. Figma's exact "cancelled" icon) - takes precedence over `icon` when both are set. */
  iconSrc?: string;
  tone: NotificationTone;
  /**
   * Unread notifications render bold. Defaults to `true`: per
   * `notification_system_prd.md` ("Auto-dismiss after a defined duration or
   * on click"), this banner can never be showing on screen in an
   * already-clicked state - clicking it dismisses it - so while visible it
   * is always effectively unread. `false`/regular weight is reserved for a
   * future Notifications history screen, where already-read items remain
   * visible after being opened (not this banner).
   */
  unread?: boolean;
  onClick?: () => void;
}

/**
 * NotificationBanner - single top urgent/critical banner.
 *
 * Per /docs/notification_system_prd.md: only one banner shown at a time,
 * text is always the same color, only the icon carries meaning/color.
 * Pushes content down (handled by normal document flow in HomeContent).
 */
export function NotificationBanner({
  message,
  icon: Icon,
  iconSrc,
  tone,
  unread = true,
  onClick,
}: NotificationBannerProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        // Verified via careful pixel measurement of Figma's rendered export (node 8168:6167,
        // container width 343px): the text node has a fixed 275px box (right-aligned ink inside
        // it, which is why the visible glyphs don't reach its far edge), not a tight-fit box -
        // an earlier pass wrongly assumed ink-width == box-width and inverted the padding.
        // Correct split: pl(12, by the text box) + text-box(275) + gap(8) + icon(24) + pr(24,
        // by the icon) = 343 exactly, and the icon's measured right edge (~319) lands exactly
        // 24px from the container's right edge (343).
        "flex w-full items-center gap-2 rounded-full bg-surface-notification py-3 pl-3 pr-6 shadow-notification",
        "transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] active:brightness-95"
      )}
    >
      {/* Icon first, message second: in this native RTL row, first child renders
          at the row's start (right) - matching Figma's actual rendered pixels
          (icon right, text left), not the more "typical" text-right/icon-left pattern. */}
      {iconSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={iconSrc} alt="" className="size-6 shrink-0" />
      ) : Icon ? (
        <Icon size={24} strokeWidth={1.75} className={cn("shrink-0", NOTIFICATION_TONE_CLASS[tone])} />
      ) : null}
      <p
        className={cn(
          "min-w-0 flex-1 text-right text-sm leading-[1.4] text-text-primary",
          unread ? "font-semibold" : "font-normal"
        )}
      >
        {message}
      </p>
    </button>
  );
}
