import type { ServiceWithCategory } from "@/lib/types";

export const MATCH_CONFIDENCE_THRESHOLD = 0.55;
export const MATCH_MAX_RESULTS = 3;
export const NO_MATCH_OPTION_ID = "__no_match__" as const;

export interface ServiceMatchCandidate {
  id: string;
  label_he: string;
  keywords: string[];
  category_id: string;
  category_label_he: string;
  pricing_type: string;
}

export interface ServiceMatchHit {
  serviceId: string;
  confidence: number;
}

/**
 * - `services` — catalog services with prices to show on the match step
 * - `category_without_priced_service` — category understood, but no priced catalog row
 * - `unresolved` — could not map the query to a known category
 */
export type MatchOutcomeKind =
  | "services"
  | "category_without_priced_service"
  | "unresolved";

export interface ServiceMatchResult {
  query: string;
  outcome: MatchOutcomeKind;
  matches: Array<{
    service: ServiceWithCategory;
    confidence: number;
  }>;
  categoryLabel: string | null;
  categoryId: string | null;
}

export function toMatchCandidate(service: ServiceWithCategory): ServiceMatchCandidate {
  return {
    id: service.id,
    label_he: service.label_he,
    keywords: service.keywords ?? [],
    category_id: service.category_id,
    category_label_he: service.category?.label_he ?? "",
    pricing_type: service.pricing_type,
  };
}
