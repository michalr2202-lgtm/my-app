import type { ActiveJob, JobStatus } from "@/lib/types";

/**
 * Shared `jobs` row shape + `ActiveJob` mapper (extracted 2026-09-08 from
 * `activeJob.ts`, once `orders.ts` needed the exact same select shape and
 * mapping for 3 more status buckets) - every customer-facing job query
 * (Home Screen's active job, Orders screen's 3 buckets, and eventually Job
 * Details/Flow 6) reads the same joined shape and produces the same
 * `ActiveJob`, so the query select fragment and row->ActiveJob mapping
 * live here once instead of drifting across call sites.
 *
 * `phone` (added 2026-09-29, `JobDetailsScreen`'s call button) is a real
 * column/join (`public.users.phone`, same table the customer's own row
 * lives in), not a placeholder field - whatever value a given
 * professional's `users` row actually has (set manually by admin per the
 * MVP onboarding model) is exactly what `professionalPhone` carries; there
 * is no separate "link the real phone number later" step to do once that
 * value exists.
 *
 * `final_price` (added 2026-09-29, Orders screen's history cards) is the
 * same kind of real, currently-always-`null` column - see `ActiveJob.
 * finalPrice`'s doc comment (`types.ts`) for the full reasoning.
 */
export const JOB_SELECT_FRAGMENT = `id, status, scheduled_time, notes, final_price,
   service:services(label_he, price_min, price_max, category:categories(name_en, label_he)),
   job_assignments(professional:professionals(user:users(first_name, last_name, phone)))`;

export interface JobRow {
  id: string;
  status: JobStatus;
  scheduled_time: string;
  notes: string | null;
  final_price: number | null;
  service: {
    label_he: string;
    price_min: number;
    price_max: number;
    category: { name_en: string; label_he: string } | null;
  } | null;
  job_assignments: {
    professional: {
      user: { first_name: string; last_name: string; phone: string | null } | null;
    } | null;
  }[];
}

/**
 * "Active"/"active now" - the truly in-flight statuses (confirmed
 * 2026-09-08, correcting an earlier, broader "not completed/cancelled"
 * definition that `home-screen-prd.md`'s State B literally specified - a
 * customer-confirmed correction to that doc, not just an Orders-screen
 * nuance: a job only ever shows as the Home Screen's Active Job Card, or
 * the Orders screen's "active now" slot, once a professional has actually
 * pressed "on the way" (a professional-side action, not built yet, but
 * the display filter itself doesn't need that side to exist to be
 * correct) - `confirmed`/`pending_approval`/`searching_professional` all
 * belong to their own Orders-screen buckets instead, never here.
 * `fetchActiveJob` (shared by both screens) filters on this directly, so
 * there is exactly one definition, not two that could drift apart.
 */
export const ACTIVE_NOW_STATUSES: JobStatus[] = [
  "on_the_way",
  "arrived",
  "in_progress",
  "waiting_for_customer",
  "waiting_for_professional",
];

export function mapJobRowToActiveJob(row: JobRow): ActiveJob {
  const assignment = row.job_assignments?.[0];
  const professionalUser = assignment?.professional?.user;

  return {
    id: row.id,
    status: row.status,
    scheduledTime: row.scheduled_time,
    professionalName: professionalUser
      ? `${professionalUser.first_name} ${professionalUser.last_name}`.trim()
      : "",
    professionalPhone: professionalUser?.phone ?? null,
    categoryLabel: row.service?.category?.label_he ?? "",
    categoryColorKey: row.service?.category?.name_en ?? "",
    serviceLabel: row.service?.label_he ?? "",
    priceMin: row.service?.price_min ?? 0,
    priceMax: row.service?.price_max ?? 0,
    finalPrice: row.final_price,
    notes: row.notes,
  };
}
