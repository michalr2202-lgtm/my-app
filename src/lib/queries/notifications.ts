import { supabase } from "@/lib/supabase";
import type { UrgentNotification } from "@/lib/types";

/**
 * Fetches the single active urgent/critical notification banner for a job,
 * per /docs/notification_system_prd.md ("Only ONE banner at a time").
 * Returns null when there is no job (no active job -> no banner tied to
 * it) or no urgent/critical job_update exists, so the screen renders
 * State C.
 */
export async function fetchUrgentNotification(jobId: string | null): Promise<UrgentNotification | null> {
  if (!jobId) return null;

  const { data, error } = await supabase
    .from("job_updates")
    .select("id, job_id, type, priority, data, created_at")
    .eq("job_id", jobId)
    .in("priority", ["urgent", "critical"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("fetchUrgentNotification error:", error);
    return null;
  }

  if (!data) return null;

  return {
    id: data.id,
    jobId: data.job_id,
    type: data.type,
    priority: data.priority,
    message: data.data?.message ?? "",
    createdAt: data.created_at,
  };
}
