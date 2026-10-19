"use client";

import Link from "next/link";
import { Bell, ClipboardList, Home, User, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { COPY } from "@/lib/copy";

export type BottomNavTab = "home" | "orders" | "notifications" | "profile";

interface NavItemConfig {
  tab: BottomNavTab;
  label: string;
  href: string;
  icon: LucideIcon;
}

/** Order (right -> left, RTL) per /docs/project-prd.md section 3 "Navigation Structure". */
const NAV_ITEMS: NavItemConfig[] = [
  { tab: "home", label: COPY.shared.bottomNav.home, href: "/", icon: Home },
  { tab: "orders", label: COPY.shared.bottomNav.orders, href: "/orders", icon: ClipboardList },
  { tab: "notifications", label: COPY.shared.bottomNav.notifications, href: "/notifications", icon: Bell },
  { tab: "profile", label: COPY.shared.bottomNav.profile, href: "/profile", icon: User },
];

export interface BottomNavigationProps {
  activeTab: BottomNavTab;
  /** Per architecture rules: Client App badge appears ONLY on the Notifications tab. */
  hasUnreadNotifications?: boolean;
}

/**
 * BottomNavigation - fixed full-navigation bar (not a bottom sheet).
 * See /docs/home-screen-prd.md 3.7 and Rule 6.
 *
 * `pb-[max(1rem,env(safe-area-inset-bottom))]` (added 2026-09-29, replacing
 * a plain `py-4`): once this app is genuinely full-screen (installed to the
 * home screen - see `layout.tsx`'s `viewportFit: "cover"` doc comment),
 * this bar sits at the true bottom physical edge of the device, right where
 * an iPhone's home-indicator bar lives. `max(...)` keeps the original 16px
 * padding as a floor on any device with no inset (`env()` resolves to
 * `0px` there, e.g. today's ordinary-browser-tab preview, or any Android
 * device without a gesture bar) rather than collapsing tighter than the
 * existing design.
 */
export function BottomNavigation({ activeTab, hasUnreadNotifications }: BottomNavigationProps) {
  return (
    <nav className="flex w-full items-center justify-between bg-surface-bg px-6 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
      {NAV_ITEMS.map(({ tab, label, href, icon: Icon }) => {
        const isActive = tab === activeTab;
        const colorClass = isActive ? "text-brand-primary" : "text-text-secondary";

        return (
          <Link
            key={tab}
            href={href}
            className="flex w-12 flex-col items-center justify-center gap-0.5"
          >
            <span className="relative flex items-center justify-center">
              <Icon size={24} strokeWidth={1.75} className={colorClass} />
              {tab === "notifications" && hasUnreadNotifications ? (
                // Centered horizontally over the icon (`left-1/2 -translate-x-1/2`, not a fixed
                // `left-*` px offset - that only lined up by coincidence for one icon width).
                // Vertical offset (`-top-2.5` = 10px, minus the dot's own 8px height = a 2px gap
                // above the icon) is unchanged from the original - confirmed correct on 2026-08-02
                // (an earlier "8px gap" instruction was a misremembering, corrected by the user).
                <span className="absolute -top-2.5 left-1/2 size-2 -translate-x-1/2 rounded-full bg-notification-red" />
              ) : null}
            </span>
            <span className={cn("text-xs leading-[1.4] text-center", colorClass)}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
