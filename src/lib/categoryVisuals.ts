/**
 * Fixed visual mapping for categories, keyed by `categories.name_en`.
 *
 * Decision (confirmed with product owner): the live `categories.color_bg` /
 * `color_text` columns currently hold different values than the Figma
 * design (e.g. plumber is sky-blue in the DB vs. lavender in Figma).
 * Per that decision, this screen renders the Figma-exact swatches as fixed
 * design tokens instead of the DB colors, until the DB values are aligned
 * with the design system.
 *
 * Category names/labels still come from the database - only the color and
 * icon are statically mapped here.
 */

export const CATEGORY_COLOR_CLASS: Record<string, string> = {
  handyman: "bg-category-handyman",
  plumber: "bg-category-plumber",
  electrician: "bg-category-electrician",
  ac: "bg-category-ac",
};

export const CATEGORY_FALLBACK_COLOR_CLASS = "bg-surface-pill";

export function getCategoryColorClass(nameEn: string): string {
  return CATEGORY_COLOR_CLASS[nameEn] ?? CATEGORY_FALLBACK_COLOR_CLASS;
}

/**
 * Resolves a background color for any category, including ones outside the
 * 4 categories shown on the Home Screen (e.g. professional categories like
 * "contractor" used by the Active Job Card, which can belong to any
 * category in the system).
 *
 * - For the 4 known Home Screen categories: fixed Figma token (className).
 * - For any other category: falls back to the DB's own `color_bg`
 *   (data-driven), since no fixed design token exists for it yet.
 */
export function resolveCategoryBackground(category: {
  name_en: string;
  color_bg?: string | null;
}): { className?: string; style?: { backgroundColor: string } } {
  const knownClass = CATEGORY_COLOR_CLASS[category.name_en];
  if (knownClass) return { className: knownClass };
  if (category.color_bg) return { style: { backgroundColor: category.color_bg } };
  return { className: CATEGORY_FALLBACK_COLOR_CLASS };
}

/**
 * Fixed display order for the 4 known Home Screen categories, matching
 * Figma exactly (right-to-left visual order: electrician, ac, plumber,
 * handyman - verified against an isolated Figma node screenshot, since this
 * particular row is NOT affected by `sort_order`). Categories outside this
 * set are appended after, ordered by their own `sort_order`.
 */
const CATEGORY_DISPLAY_ORDER = ["electrician", "ac", "plumber", "handyman"];

export function sortCategoriesForDisplay<T extends { name_en: string; sort_order: number }>(
  categories: T[]
): T[] {
  return [...categories].sort((a, b) => {
    const indexA = CATEGORY_DISPLAY_ORDER.indexOf(a.name_en);
    const indexB = CATEGORY_DISPLAY_ORDER.indexOf(b.name_en);
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return a.sort_order - b.sort_order;
  });
}

export const CATEGORY_ICON_SRC: Record<string, string> = {
  handyman: "/icons/category-handyman.svg",
  plumber: "/icons/category-plumber.svg",
  electrician: "/icons/category-electrician.svg",
  ac: "/icons/category-ac.svg",
};

export function getCategoryIconSrc(nameEn: string): string | null {
  return CATEGORY_ICON_SRC[nameEn] ?? null;
}
