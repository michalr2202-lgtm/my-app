import { ClientHomeScreen } from "@/components/client/home/ClientHomeScreen";
import { getCurrentCustomerId } from "@/lib/auth";
import {
  DEV_PREVIEW_ACTIVE_JOB,
  DEV_PREVIEW_ENABLED,
  DEV_PREVIEW_NOTIFICATION,
} from "@/lib/devPreviewData";
import { fetchActiveJob } from "@/lib/queries/activeJob";
import { fetchCategories } from "@/lib/queries/categories";
import { fetchServicesWithCategory } from "@/lib/queries/services";
import { fetchUrgentNotification } from "@/lib/queries/notifications";

export default async function Home() {
  const customerId = getCurrentCustomerId();

  const [categories, services, fetchedActiveJob] = await Promise.all([
    fetchCategories(),
    fetchServicesWithCategory(),
    fetchActiveJob(customerId),
  ]);

  const fetchedNotification = await fetchUrgentNotification(fetchedActiveJob?.id ?? null);

  // See src/lib/devPreviewData.ts - temporary, QA-only fallback.
  const activeJob = fetchedActiveJob ?? (DEV_PREVIEW_ENABLED ? DEV_PREVIEW_ACTIVE_JOB : null);
  const notification = fetchedNotification ?? (DEV_PREVIEW_ENABLED ? DEV_PREVIEW_NOTIFICATION : null);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-surface-bg shadow-[0_0_24px_rgba(0,0,0,0.08)]">
      <ClientHomeScreen
        categories={categories}
        services={services}
        activeJob={activeJob}
        notification={notification}
      />
    </div>
  );
}
