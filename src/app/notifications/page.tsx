import { NotificationsScreen } from "@/components/client/notifications/NotificationsScreen";
import { getCurrentCustomerId } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * /notifications route - scaffold only, see `NotificationsScreen`'s doc
 * comment. Same session-check pattern as `/orders` (`OrdersPage`) - only
 * needed here to pick logged-in-placeholder vs. `AccountLoginPrompt`, not
 * to fetch any real notification data yet.
 */
export default async function NotificationsPage() {
  const supabase = await createSupabaseServerClient();
  const customerId = await getCurrentCustomerId(supabase);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-surface-bg">
      <NotificationsScreen hasSession={Boolean(customerId)} />
    </div>
  );
}
