import {
  MATCH_CONFIDENCE_THRESHOLD,
  MATCH_MAX_RESULTS,
  type ServiceMatchHit,
} from "@/lib/ai/matchTypes";
import type { ServiceWithCategory } from "@/lib/types";

function normalize(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Deterministic prefilter: if the query contains a service label or keyword, treat as strong hits.
 */
export function matchServicesByKeywords(
  query: string,
  catalog: ServiceWithCategory[]
): ServiceMatchHit[] {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return [];

  const hits: ServiceMatchHit[] = [];

  for (const service of catalog) {
    const label = normalize(service.label_he);
    if (label && (normalizedQuery.includes(label) || label.includes(normalizedQuery))) {
      hits.push({ serviceId: service.id, confidence: 0.95 });
      continue;
    }

    const keywords = service.keywords ?? [];
    const keywordHit = keywords.some((keyword) => {
      const normalizedKeyword = normalize(keyword);
      return (
        normalizedKeyword.length > 0 &&
        (normalizedQuery.includes(normalizedKeyword) ||
          normalizedKeyword.includes(normalizedQuery))
      );
    });

    if (keywordHit) {
      hits.push({ serviceId: service.id, confidence: 0.85 });
    }
  }

  return hits;
}

/**
 * Keep matches above threshold, prefer the dominant category, cap at MAX.
 */
export function postProcessMatches(
  hits: ServiceMatchHit[],
  catalog: ServiceWithCategory[]
): ServiceMatchHit[] {
  const byId = new Map(catalog.map((service) => [service.id, service]));

  const filtered = hits
    .filter((hit) => hit.confidence >= MATCH_CONFIDENCE_THRESHOLD && byId.has(hit.serviceId))
    .sort((a, b) => b.confidence - a.confidence);

  if (filtered.length === 0) return [];

  const categoryCounts = new Map<string, number>();
  for (const hit of filtered.slice(0, MATCH_MAX_RESULTS)) {
    const categoryId = byId.get(hit.serviceId)?.category_id;
    if (!categoryId) continue;
    categoryCounts.set(categoryId, (categoryCounts.get(categoryId) ?? 0) + 1);
  }

  let dominantCategory: string | null = null;
  let dominantCount = 0;
  for (const [categoryId, count] of categoryCounts) {
    if (count > dominantCount) {
      dominantCategory = categoryId;
      dominantCount = count;
    }
  }

  const consistent =
    dominantCategory && dominantCount >= 2
      ? filtered.filter((hit) => byId.get(hit.serviceId)?.category_id === dominantCategory)
      : filtered;

  const seen = new Set<string>();
  const unique: ServiceMatchHit[] = [];
  for (const hit of consistent) {
    if (seen.has(hit.serviceId)) continue;
    seen.add(hit.serviceId);
    unique.push(hit);
    if (unique.length >= MATCH_MAX_RESULTS) break;
  }

  return unique;
}
