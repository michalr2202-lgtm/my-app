import { buildMatchServicesPrompt } from "@/lib/ai/buildMatchPrompt";
import { matchCategoryByKeywords } from "@/lib/ai/matchCategory";
import { matchServicesByKeywords, postProcessMatches } from "@/lib/ai/postProcessMatches";
import {
  MATCH_CONFIDENCE_THRESHOLD,
  toMatchCandidate,
  type ServiceMatchHit,
  type ServiceMatchResult,
} from "@/lib/ai/matchTypes";
import type { Category, ServiceWithCategory } from "@/lib/types";

interface AiMatchResponse {
  matches?: Array<{ service_id?: string; confidence?: number }>;
  category_id?: string | null;
  confidence?: number;
}

interface AiClassifyResult {
  hits: ServiceMatchHit[];
  categoryId: string | null;
  categoryConfidence: number;
}

async function classifyWithClaudeSonnet(
  query: string,
  catalog: ServiceWithCategory[],
  categories: Category[]
): Promise<AiClassifyResult> {
  const empty: AiClassifyResult = { hits: [], categoryId: null, categoryConfidence: 0 };
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return empty;

  const candidates = catalog.map(toMatchCandidate);
  const categoryPayload = categories.map((category) => ({
    id: category.id,
    label_he: category.label_he,
  }));
  const prompt = buildMatchServicesPrompt(query, candidates, categoryPayload);
  const model = process.env.ANTHROPIC_MATCH_MODEL ?? "claude-sonnet-4-5";

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      temperature: 0,
      system:
        "You map Hebrew home-service problems to a closed catalog of services and categories. Reply with JSON only — no markdown fences.",
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    console.error("matchServices Claude error:", response.status, await response.text());
    return empty;
  }

  const payload = (await response.json()) as {
    content?: Array<{ type?: string; text?: string }>;
  };
  const content = payload.content?.find((block) => block.type === "text")?.text;
  if (!content) return empty;

  try {
    const jsonText = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    const parsed = JSON.parse(jsonText) as AiMatchResponse;
    const hits = (parsed.matches ?? [])
      .map((match) => ({
        serviceId: String(match.service_id ?? ""),
        confidence: Number(match.confidence ?? 0),
      }))
      .filter((match) => match.serviceId.length > 0);

    const categoryId =
      typeof parsed.category_id === "string" && parsed.category_id.length > 0
        ? parsed.category_id
        : null;

    return {
      hits,
      categoryId,
      categoryConfidence: Number(parsed.confidence ?? (categoryId ? 0.7 : 0)),
    };
  } catch (error) {
    console.error("matchServices JSON parse error:", error);
    return empty;
  }
}

function categoriesFromCatalog(catalog: ServiceWithCategory[]): Category[] {
  const byId = new Map<string, Category>();
  for (const service of catalog) {
    if (!service.category || byId.has(service.category_id)) continue;
    byId.set(service.category_id, {
      id: service.category.id,
      name_en: service.category.name_en,
      label_he: service.category.label_he,
      icon: null,
      color_bg: "",
      color_text: "",
      sort_order: service.category.sort_order,
      is_active: true,
    });
  }
  return [...byId.values()];
}

/**
 * Closed-set matching:
 * 1) keyword services  2) AI services+category  3) keyword category hints
 * Outcomes distinguish priced services vs category-only (no price yet) vs unresolved.
 */
export async function matchServices(
  query: string,
  catalog: ServiceWithCategory[],
  categoriesInput?: Category[]
): Promise<ServiceMatchResult> {
  const trimmed = query.trim();
  const categories =
    categoriesInput && categoriesInput.length > 0
      ? categoriesInput
      : categoriesFromCatalog(catalog);

  const empty: ServiceMatchResult = {
    query: trimmed,
    outcome: "unresolved",
    matches: [],
    categoryLabel: null,
    categoryId: null,
  };

  if (!trimmed || catalog.length === 0) return empty;

  const keywordHits = matchServicesByKeywords(trimmed, catalog);
  const aiResult =
    keywordHits.length > 0
      ? { hits: keywordHits, categoryId: null, categoryConfidence: 0 }
      : await classifyWithClaudeSonnet(trimmed, catalog, categories);

  const processed = postProcessMatches(aiResult.hits, catalog);
  const byId = new Map(catalog.map((service) => [service.id, service]));

  const matches = processed
    .map((hit) => {
      const service = byId.get(hit.serviceId);
      if (!service) return null;
      return { service, confidence: hit.confidence };
    })
    .filter((value): value is NonNullable<typeof value> => value !== null);

  if (matches.length > 0) {
    return {
      query: trimmed,
      outcome: "services",
      matches,
      categoryLabel: matches[0]?.service.category?.label_he ?? null,
      categoryId: matches[0]?.service.category_id ?? null,
    };
  }

  const categoryById = new Map(categories.map((category) => [category.id, category]));
  let categoryId = aiResult.categoryId;
  let categoryLabel =
    categoryId && categoryById.has(categoryId)
      ? categoryById.get(categoryId)!.label_he
      : null;
  let categoryConfidence = aiResult.categoryConfidence;

  if (!categoryId || categoryConfidence < MATCH_CONFIDENCE_THRESHOLD) {
    const hinted = matchCategoryByKeywords(trimmed, categories);
    if (hinted) {
      categoryId = hinted.categoryId;
      categoryLabel = hinted.categoryLabel;
      categoryConfidence = hinted.confidence;
    }
  }

  if (categoryId && categoryLabel && categoryConfidence >= MATCH_CONFIDENCE_THRESHOLD) {
    return {
      query: trimmed,
      outcome: "category_without_priced_service",
      matches: [],
      categoryLabel,
      categoryId,
    };
  }

  return empty;
}
