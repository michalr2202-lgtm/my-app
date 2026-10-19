"use client";

import { useState } from "react";
import { LoginSheet } from "@/components/shared/LoginSheet";
import { COPY } from "@/lib/copy";

export interface AccountLoginPromptProps {
  /** Screen-specific neutral message (e.g. `ordersScreen.emptyMessage`). */
  message: string;
}

/**
 * AccountLoginPrompt - extracted 2026-09-29 from `OrdersScreen`'s own
 * inline empty-state block, so `NotificationsScreen`/`ProfileScreen` (both
 * scaffolded the same day) can render the exact same "logged out, might
 * still have history" affordance instead of each duplicating it.
 *
 * This is the deliberate architecture (see the "Login entry points" note
 * in this file's `component-library.md` entry, and each caller's own doc
 * comment): there is no single centralized login screen and no Home-screen
 * login button - every screen whose content depends on a session shows
 * this same local prompt when there isn't one, exactly where the customer
 * already is. `existingCustomerLoginLink`'s wording is shared across all
 * callers (moved out of `ordersScreen.*` into `shared.accountPrompt.*`) so
 * they read identically; only `message` differs per screen.
 */
export function AccountLoginPrompt({ message }: AccountLoginPromptProps) {
  const [loginOpen, setLoginOpen] = useState(false);

  return (
    <div className="flex w-full flex-col items-center gap-2 pt-10 text-center">
      <p className="text-sm leading-[1.4] text-text-secondary">{message}</p>
      <button
        type="button"
        onClick={() => setLoginOpen(true)}
        className="text-sm font-medium leading-[1.4] text-brand-primary"
      >
        {COPY.shared.accountPrompt.existingCustomerLoginLink}
      </button>

      <LoginSheet open={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  );
}
