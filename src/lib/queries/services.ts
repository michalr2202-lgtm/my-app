import { supabase } from "@/lib/supabase";
import type { ServiceWithCategory } from "@/lib/types";

export async function fetchServicesWithCategory(): Promise<ServiceWithCategory[]> {
  const { data, error } = await supabase
    .from("services")
    .select(
      "*, category:categories(id, name_en, label_he, sort_order)"
    )
    .eq("is_active", true)
    .order("sort_order");

  if (error) {
    console.error("fetchServicesWithCategory error:", error);
    return [];
  }

  return (data ?? []) as unknown as ServiceWithCategory[];
}

/**
 * Fetches the id of the given category's diagnosis-priced placeholder
 * service (see `supabase/sql/diagnosis_placeholder_services.sql`) - one
 * exists per category so `jobs.service_id`, a required FK, can be
 * satisfied for the "category_without_priced_service" match outcome
 * (`BookingFlowSheet`'s `no_price_yet` phase), which otherwise has no real
 * catalog service to point at.
 *
 * Deliberately excluded from `fetchServicesWithCategory` above
 * (`is_active = false`) so it never surfaces as a selectable match, an AI
 * classification candidate, or a home-screen "popular service" pill - this
 * is the only place that reads it, keyed by `is_diagnosis_placeholder`
 * rather than `is_active` for that exact reason.
 */
export async function fetchDiagnosisPlaceholderServiceId(categoryId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("services")
    .select("id")
    .eq("category_id", categoryId)
    .eq("is_diagnosis_placeholder", true)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("fetchDiagnosisPlaceholderServiceId error:", error);
    return null;
  }

  return (data as { id: string } | null)?.id ?? null;
}
