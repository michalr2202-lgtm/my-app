import { NextResponse } from "next/server";
import { matchServices } from "@/lib/ai/matchServices";
import { fetchCategories } from "@/lib/queries/categories";
import { fetchServicesWithCategory } from "@/lib/queries/services";

export const runtime = "nodejs";

/**
 * POST /api/ai/match-services
 * Body: { query: string }
 * Closed-set classification against active services + categories in Supabase.
 */
export async function POST(request: Request) {
  let query = "";
  try {
    const body = (await request.json()) as { query?: unknown };
    query = typeof body.query === "string" ? body.query.trim() : "";
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!query) {
    return NextResponse.json({ error: "query is required" }, { status: 400 });
  }

  const [catalog, categories] = await Promise.all([
    fetchServicesWithCategory(),
    fetchCategories(),
  ]);
  const result = await matchServices(query, catalog, categories);

  return NextResponse.json({
    query: result.query,
    outcome: result.outcome,
    fallback: result.outcome !== "services",
    categoryLabel: result.categoryLabel,
    categoryId: result.categoryId,
    matches: result.matches.map(({ service, confidence }) => ({
      confidence,
      service: {
        id: service.id,
        label_he: service.label_he,
        price_min: service.price_min,
        price_max: service.price_max,
        pricing_type: service.pricing_type,
        category_id: service.category_id,
        category: service.category,
      },
    })),
  });
}
