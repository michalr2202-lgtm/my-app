import { supabase } from "@/lib/supabase";
import type { ActiveJob, JobStatus } from "@/lib/types";

const INACTIVE_STATUSES: JobStatus[] = ["completed", "cancelled"];

interface ActiveJobRow {
  id: string;
  status: JobStatus;
  scheduled_time: string;
  service: {
    label_he: string;
    price_min: number;
    price_max: number;
    category: { name_en: string; label_he: string } | null;
  } | null;
  job_assignments: {
    professional: {
      user: { first_name: string; last_name: string } | null;
    } | null;
  }[];
}

/**
 * Fetches the customer's current active job (if any), per
 * /docs/home-screen-prd.md 3.1 / 4 (State B): a job is "active" while its
 * status is not `completed` or `cancelled`.
 *
 * Returns null when there is no customerId (no session yet - see
 * lib/auth.ts) or no active job, so the screen renders State A.
 */
export async function fetchActiveJob(customerId: string | null): Promise<ActiveJob | null> {
  if (!customerId) return null;

  const { data, error } = await supabase
    .from("jobs")
    .select(
      `id, status, scheduled_time,
       service:services(label_he, price_min, price_max, category:categories(name_en, label_he)),
       job_assignments(professional:professionals(user:users(first_name, last_name)))`
    )
    .eq("customer_id", customerId)
    .not("status", "in", `(${INACTIVE_STATUSES.join(",")})`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("fetchActiveJob error:", error);
    return null;
  }

  if (!data) return null;

  const row = data as unknown as ActiveJobRow;
  const assignment = row.job_assignments?.[0];
  const professionalUser = assignment?.professional?.user;

  return {
    id: row.id,
    status: row.status,
    scheduledTime: row.scheduled_time,
    professionalName: professionalUser
      ? `${professionalUser.first_name} ${professionalUser.last_name}`.trim()
      : "",
    categoryLabel: row.service?.category?.label_he ?? "",
    categoryColorKey: row.service?.category?.name_en ?? "",
    serviceLabel: row.service?.label_he ?? "",
    priceMin: row.service?.price_min ?? 0,
    priceMax: row.service?.price_max ?? 0,
  };
}
