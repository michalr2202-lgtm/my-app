import { ClientHomeScreen } from "@/components/client/home/ClientHomeScreen";
import { getCurrentCustomerId } from "@/lib/auth";
import {
  DEV_PREVIEW_ACTIVE_JOB,
  DEV_PREVIEW_ENABLED,
  DEV_PREVIEW_NOTIFICATION,
} from "@/lib/devPreviewData";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchActiveJob } from "@/lib/queries/activeJob";
import { fetchCategories } from "@/lib/queries/categories";
import { fetchServicesWithCategory } from "@/lib/queries/services";
import { fetchUrgentNotification } from "@/lib/queries/notifications";

export default async function Home() {
  // Real per-request, cookie-authenticated client (2026-09-08) - see
  // `createSupabaseServerClient`'s doc comment. `customerId` now reflects
  // whoever is actually signed in on this browser (via the Booking Flow's
  // own OTP step), not a hardcoded `null`.
  const supabase = await createSupabaseServerClient();
  const customerId = await getCurrentCustomerId(supabase);

  const [categories, services, fetchedActiveJob] = await Promise.all([
    fetchCategories(),
    fetchServicesWithCategory(),
    fetchActiveJob(supabase, customerId),
  ]);

  const fetchedNotification = await fetchUrgentNotification(supabase, fetchedActiveJob?.id ?? null);

  // See src/lib/devPreviewData.ts - temporary, QA-only fallback.
  const activeJob = fetchedActiveJob ?? (DEV_PREVIEW_ENABLED ? DEV_PREVIEW_ACTIVE_JOB : null);
  const notification = fetchedNotification ?? (DEV_PREVIEW_ENABLED ? DEV_PREVIEW_NOTIFICATION : null);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-surface-bg">
      <ClientHomeScreen
        categories={categories}
        services={services}
        activeJob={activeJob}
        notification={notification}
      />
    </div>
  );
}
