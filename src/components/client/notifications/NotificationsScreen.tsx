import { AccountLoginPrompt } from "@/components/shared/AccountLoginPrompt";
import { BottomNavigation } from "@/components/shared/BottomNavigation";
import { COPY } from "@/lib/copy";

export interface NotificationsScreenProps {
  /** `null` when there is no session on this device/browser - see doc comment below. */
  hasSession: boolean;
}

/**
 * NotificationsScreen - scaffold only (added 2026-09-29), opened as part of
 * the login-architecture review below, NOT the real screen (`project-prd.md`
 * §9 in `notification_system_prd.md` - "Requires Action" section, full
 * history, unread/last-visited badge logic) - that's a separate, larger
 * task with its own design, deliberately out of scope here.
 *
 * Exists so `/notifications` (already a real `BottomNavigation` tab/href)
 * stops being a dead link, and so this screen's own "logged out vs. no
 * notifications yet" ambiguity - the exact same shape as `OrdersScreen`'s
 * (per-customer data, indistinguishable from the frontend without a
 * session) - gets the same, consistent answer from day one: the shared
 * `AccountLoginPrompt` (`components/shared`), not a bespoke prompt invented
 * per screen. See that component's doc comment, and the "Login entry
 * points" note in `component-library.md`, for the full reasoning (there is
 * no centralized login screen or Home-screen login button by design - each
 * screen whose content depends on a session shows this same local prompt).
 *
 * Logged-in state renders only a temporary placeholder - the real
 * sections/list are intentionally not built here.
 */
export function NotificationsScreen({ hasSession }: NotificationsScreenProps) {
  return (
    <div className="relative flex w-full flex-1 flex-col items-center bg-surface-bg">
      <div className="flex w-full flex-1 flex-col items-center gap-10 px-4 pb-6 pt-10">
        {hasSession ? (
          <p className="pt-10 text-center text-sm leading-[1.4] text-text-secondary">
            {COPY.notificationsScreen.comingSoonMessage}
          </p>
        ) : (
          <AccountLoginPrompt message={COPY.notificationsScreen.emptyMessage} />
        )}
      </div>

      <div className="sticky bottom-0 flex w-full flex-col items-center bg-surface-bg">
        <div className="h-px w-full bg-divider" />
        <BottomNavigation activeTab="notifications" />
      </div>
    </div>
  );
}
