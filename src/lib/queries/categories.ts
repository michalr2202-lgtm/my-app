import { supabase } from "@/lib/supabase";
import type { Category } from "@/lib/types";

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("id, name_en, label_he, icon, color_bg, color_text, sort_order, is_active")
    .eq("is_active", true)
    .order("sort_order");

  if (error) {
    console.error("fetchCategories error:", error);
    return [];
  }

  return data ?? [];
}
