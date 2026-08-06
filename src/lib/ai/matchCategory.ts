import { MATCH_CONFIDENCE_THRESHOLD } from "@/lib/ai/matchTypes";
import type { Category } from "@/lib/types";

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Lightweight Hebrew hints for category detection when no priced service matches.
 * Keys are `categories.name_en`. Keep short — AI covers the long tail when configured.
 */
const CATEGORY_QUERY_HINTS: Record<string, string[]> = {
  handyman: ["מדף", "מדפים", "תליה", "לתלות", "תלה", "לקדוח", "הרכבה", "רהיט", "תמונה", "וילון"],
  plumber: ["ברז", "נזילה", "ביוב", "סתימה", "מים", "אסלה", "כיור", "דוד"],
  electrician: ["חשמל", "שקע", "נורה", "מפסק", "קצר", "תאורה"],
  ac: ["מזגן", "מיזוג", "גז למזגן", "לא מקרר", "לא מחמם"],
};

export interface CategoryMatch {
  categoryId: string;
  categoryLabel: string;
  confidence: number;
}

export function matchCategoryByKeywords(
  query: string,
  categories: Category[]
): CategoryMatch | null {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return null;

  let best: CategoryMatch | null = null;

  for (const category of categories) {
    const label = normalize(category.label_he);
    const nameEn = normalize(category.name_en);
    let confidence = 0;

    if (label && normalizedQuery.includes(label)) confidence = 0.9;
    if (nameEn && normalizedQuery.includes(nameEn)) confidence = Math.max(confidence, 0.8);

    const hints = CATEGORY_QUERY_HINTS[category.name_en] ?? [];
    for (const hint of hints) {
      const normalizedHint = normalize(hint);
      if (normalizedHint && normalizedQuery.includes(normalizedHint)) {
        confidence = Math.max(confidence, 0.75);
      }
    }

    if (confidence >= MATCH_CONFIDENCE_THRESHOLD) {
      if (!best || confidence > best.confidence) {
        best = {
          categoryId: category.id,
          categoryLabel: category.label_he,
          confidence,
        };
      }
    }
  }

  return best;
}
