import { AccountLoginPrompt } from "@/components/shared/AccountLoginPrompt";
import { BottomNavigation } from "@/components/shared/BottomNavigation";
import { COPY } from "@/lib/copy";

export interface ProfileScreenProps {
  /** `null` when there is no session on this device/browser - see doc comment below. */
  hasSession: boolean;
}

/**
 * ProfileScreen - scaffold only (added 2026-09-29), opened as part of the
 * login-architecture review (see `NotificationsScreen`'s doc comment for
 * the shared reasoning - same shape, same shared `AccountLoginPrompt`).
 * NOT the real screen - `project-prd.md` never specified one yet (it's
 * only a `BottomNavigation` tab/href so far); real account fields, saved
 * addresses, sign-out, etc. are a separate task with their own design.
 *
 * Logged-in state renders only a temporary placeholder - the real content
 * is intentionally not built here.
 */
export function ProfileScreen({ hasSession }: ProfileScreenProps) {
  return (
    <div className="relative flex w-full flex-1 flex-col items-center bg-surface-bg">
      <div className="flex w-full flex-1 flex-col items-center gap-10 px-4 pb-6 pt-10">
        {hasSession ? (
          <p className="pt-10 text-center text-sm leading-[1.4] text-text-secondary">
            {COPY.profileScreen.comingSoonMessage}
          </p>
        ) : (
          <AccountLoginPrompt message={COPY.profileScreen.emptyMessage} />
        )}
      </div>

      <div className="sticky bottom-0 flex w-full flex-col items-center bg-surface-bg">
        <div className="h-px w-full bg-divider" />
        <BottomNavigation activeTab="profile" />
      </div>
    </div>
  );
}
