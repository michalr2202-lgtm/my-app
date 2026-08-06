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
