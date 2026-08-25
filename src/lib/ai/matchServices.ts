import { buildMatchServicesPrompt } from "@/lib/ai/buildMatchPrompt";
import { buildCorrectQueryPrompt } from "@/lib/ai/buildCorrectQueryPrompt";
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

/**
 * One retry on transient failures (network throw, rate limit, server error)
 * - a single hiccup here must not take down AI classification entirely, since
 * that's the primary path for matching a query to a category when no
 * priced-service keyword hit fires. `matchCategoryByKeywords` is only a
 * secondary safety net (deliberately short - see its own doc comment) - a
 * query should not degrade to that thinner net just because one fetch blipped.
 */
async function fetchClaudeWithRetry(apiKey: string, body: Record<string, unknown>): Promise<Response> {
  const attempt = () =>
    fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

  try {
    const response = await attempt();
    if (response.ok || (response.status !== 429 && response.status < 500)) {
      return response;
    }
    // Rate-limited or server error - worth exactly one retry.
  } catch {
    // Network-level failure - worth exactly one retry.
  }

  await new Promise((resolve) => setTimeout(resolve, 400));
  return attempt();
}

async function classifyWithClaudeSonnet(
  query: string,
  catalog: ServiceWithCategory[],
  categories: Category[]
): Promise<AiClassifyResult> {
  const empty: AiClassifyResult = { hits: [], categoryId: null, categoryConfidence: 0 };
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn(
      "matchServices: ANTHROPIC_API_KEY is not set - AI classification is disabled, falling back to " +
        "matchCategoryByKeywords only. Real customer jobs outside that short keyword list will be " +
        "misrouted to 'no professionals available'. Set the key to restore full coverage."
    );
    return empty;
  }

  const candidates = catalog.map(toMatchCandidate);
  const categoryPayload = categories.map((category) => ({
    id: category.id,
    label_he: category.label_he,
  }));
  const prompt = buildMatchServicesPrompt(query, candidates, categoryPayload);
  const model = process.env.ANTHROPIC_MATCH_MODEL ?? "claude-sonnet-4-5";

  // Every failure mode below (thrown fetch, non-ok response, missing/
  // unparseable content) must resolve to `empty`, never throw - a thrown
  // error here would propagate uncaught through the API route and fail the
  // whole search (see BookingFlowSheet's "error" phase), skipping the
  // keyword-based category fallback entirely instead of merely narrowing to it.
  try {
    const response = await fetchClaudeWithRetry(apiKey, {
      model,
      max_tokens: 1024,
      temperature: 0,
      system:
        "You map Hebrew home-service problems to a closed catalog of services and categories. Reply with JSON only — no markdown fences.",
      messages: [{ role: "user", content: prompt }],
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
    console.error("matchServices Claude call failed:", error);
    return empty;
  }
}

/**
 * Typo/spelling correction for the query as quoted back to the user (e.g.
 * "כתבת: ..."). Runs unconditionally for every search - including ones that
 * resolve via a direct keyword hit and never call classifyWithClaudeSonnet -
 * so a typo elsewhere in the sentence still gets fixed even when the
 * relevant keyword itself was typed correctly. Deliberately a separate,
 * tiny, catalog-free prompt/model rather than folded into
 * classifyWithClaudeSonnet: that prompt embeds the full service+category
 * catalog and would be expensive/slow to run on every single search just to
 * fix spelling.
 */
async function correctQuerySpelling(query: string): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const model = process.env.ANTHROPIC_CORRECTION_MODEL ?? "claude-haiku-4-5";
  const prompt = buildCorrectQueryPrompt(query);

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 256,
        temperature: 0,
        system: "You fix Hebrew spelling/typing mistakes. Reply with JSON only — no markdown fences.",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      console.error("correctQuerySpelling Claude error:", response.status, await response.text());
      return null;
    }

    const payload = (await response.json()) as {
      content?: Array<{ type?: string; text?: string }>;
    };
    const content = payload.content?.find((block) => block.type === "text")?.text;
    if (!content) return null;

    const jsonText = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    const parsed = JSON.parse(jsonText) as { corrected?: string };
    const corrected = typeof parsed.corrected === "string" ? parsed.corrected.trim() : "";
    return corrected.length > 0 ? corrected : null;
  } catch (error) {
    console.error("correctQuerySpelling error:", error);
    return null;
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
  // Run independently of - and always alongside - the match/classification
  // call below, so a typo anywhere in the query still gets fixed for the
  // "כתבת: ..." echo even when keywordHits already resolved the match and
  // classifyWithClaudeSonnet never runs.
  const [aiResult, correctedQuery] = await Promise.all([
    keywordHits.length > 0
      ? Promise.resolve<AiClassifyResult>({ hits: keywordHits, categoryId: null, categoryConfidence: 0 })
      : classifyWithClaudeSonnet(trimmed, catalog, categories),
    correctQuerySpelling(trimmed),
  ]);

  const displayQuery = correctedQuery ?? trimmed;

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
      query: displayQuery,
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
      query: displayQuery,
      outcome: "category_without_priced_service",
      matches: [],
      categoryLabel,
      categoryId,
    };
  }

  return { ...empty, query: displayQuery };
}
