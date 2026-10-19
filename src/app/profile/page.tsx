import { ProfileScreen } from "@/components/client/profile/ProfileScreen";
import { getCurrentCustomerId } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * /profile route - scaffold only, see `ProfileScreen`'s doc comment. Same
 * session-check pattern as `/orders`/`/notifications`.
 */
export default async function ProfilePage() {
  const supabase = await createSupabaseServerClient();
  const customerId = await getCurrentCustomerId(supabase);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-surface-bg">
      <ProfileScreen hasSession={Boolean(customerId)} />
    </div>
  );
}
