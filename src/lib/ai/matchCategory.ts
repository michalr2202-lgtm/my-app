import { MATCH_CONFIDENCE_THRESHOLD } from "@/lib/ai/matchTypes";
import type { Category } from "@/lib/types";

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Hebrew keyword hints for category detection when no priced service
 * matches directly. Keys are `categories.name_en`.
 *
 * This is the safety net when AI classification can't run at all - missing
 * `ANTHROPIC_API_KEY`, or the Anthropic call itself failing even after
 * `matchServices.ts`'s one retry (see `classifyWithClaudeSonnet`) - so a
 * real job in one of our categories doesn't get misrouted to "no
 * professionals available" (`BookingMessageStep` "noProfessionals") just
 * because the AI path was unavailable for that one request. Deliberately
 * broader than a minimal set for exactly that reason - err on the side of
 * catching a real job over missing one; `MATCH_CONFIDENCE_THRESHOLD` plus
 * `postProcessMatches`' dominant-category filter (for the priced-service
 * path) are what keep false positives in check elsewhere.
 */
const CATEGORY_QUERY_HINTS: Record<string, string[]> = {
  handyman: [
    "מדף",
    "מדפים",
    "תליה",
    "לתלות",
    "תלה",
    "לקדוח",
    "קידוח",
    "הרכבה",
    "הרכבת רהיטים",
    "רהיט",
    "תמונה",
    "וילון",
    "וילונות",
    "מראה",
    "ארון",
    "מגירה",
    "צירים",
    "דלת",
    "תיקון דלת",
    "מנעול",
    "שיפוץ קטן",
    "תיקון כללי",
    "קיר",
    "חור בקיר",
  ],
  plumber: [
    "ברז",
    "ברזים",
    "נזילה",
    "דולף",
    "דליפה",
    "טפטוף",
    "ביוב",
    "סתימה",
    "סתום",
    "ניקוז",
    "צנרת",
    "מים",
    "מים חמים",
    "לחץ מים",
    "אין מים",
    "אסלה",
    "כיור",
    "מקלחת",
    "אמבטיה",
    "דוד",
    "דוד שמש",
    "בוילר",
  ],
  electrician: [
    "חשמל",
    "חשמלאי",
    "שקע",
    "תקע",
    "נורה",
    "מנורה",
    "גוף תאורה",
    "מפסק",
    "לוח חשמל",
    "נתיך",
    "פחת",
    "קצר",
    "קצר חשמלי",
    "תאורה",
    "אין חשמל",
    "נפל החשמל",
    "כבל",
  ],
  ac: [
    "מזגן",
    "מזגנים",
    "מיזוג",
    "גז למזגן",
    "גז מזגן",
    "לא מקרר",
    "לא מחמם",
    "ניקוי מזגן",
    "טיפול מזגן",
    "מזגן מדליף",
    "דולף מזגן",
    "מסנן מזגן",
    "קומפרסור",
  ],
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
