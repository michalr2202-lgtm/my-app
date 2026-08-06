import type { ServiceMatchCandidate } from "@/lib/ai/matchTypes";

/**
 * Closed-set classification prompt.
 * May return services and/or a category when no priced service fits.
 */
export function buildMatchServicesPrompt(
  userInput: string,
  services: ServiceMatchCandidate[],
  categories: Array<{ id: string; label_he: string }>
): string {
  const servicesList = JSON.stringify(
    services.map((service) => ({
      id: service.id,
      label_he: service.label_he,
      keywords: service.keywords,
      category_id: service.category_id,
      category: service.category_label_he,
      pricing_type: service.pricing_type,
    })),
    null,
    2
  );

  const categoriesList = JSON.stringify(categories, null, 2);

  return `You are a service classification assistant for a home services app.

Your job is to map a user's problem description (in Hebrew) to the most relevant services from a predefined list, and always try to identify the matching profession category.

The user input may describe:
- A problem (e.g. "יש נזילה בכיור")
- A desired service (e.g. "החלפת ברז")
- A job that fits a category but may not match any priced service yet (e.g. "אני רוצה לתלות מדפים" → handyman category)

STRICT RULES:

- You MUST choose services ONLY from the provided services list
- Do NOT invent new services
- Do NOT invent or return prices
- Return up to 3 services maximum
- Prefer the most common and simple services
- Prefer services that share the same category when possible
- If no service in the list is a good match, return an empty matches array
- Even when matches is empty, if you can identify the profession category from the categories list, return that category_id
- Only leave category_id null when the request is outside all known categories
- If the user explicitly mentions a known service — match it directly

---

User input (Hebrew):
"${userInput}"

---

Available services:
${servicesList}

---

Available categories:
${categoriesList}

---

Output format (JSON only):

{
  "matches": [
    {
      "service_id": "uuid",
      "confidence": 0.0-1.0
    }
  ],
  "category_id": "uuid-or-null",
  "confidence": 0.0-1.0
}`;
}
