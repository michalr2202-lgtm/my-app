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
 * Same 4 fixed category tokens as `CATEGORY_COLOR_CLASS` above, as a
 * `border-*` utility instead of `bg-*` (added 2026-09-29, Job Details
 * screen's note box - see `JobDetailsScreen.tsx`). Tailwind generates both
 * utilities from the same `--color-category-*` theme token automatically,
 * so this is just a second named map over the identical 4 colors, not a
 * second set of values to keep in sync.
 */
export const CATEGORY_BORDER_CLASS: Record<string, string> = {
  handyman: "border-category-handyman",
  plumber: "border-category-plumber",
  electrician: "border-category-electrician",
  ac: "border-category-ac",
};

/**
 * Falls back to the app's brand blue (`border-brand-primary`, the note
 * box's previous fixed color) for any category outside the 4 known ones -
 * unlike `getCategoryColorClass`'s neutral gray fallback, blue reads fine
 * as a border and keeps today's exact look for a category this map has no
 * real answer for, rather than introducing a 3rd, unrelated color.
 */
export function getCategoryBorderClass(nameEn: string): string {
  return CATEGORY_BORDER_CLASS[nameEn] ?? "border-brand-primary";
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
 * Fixed display order for the 4 known Home Screen categories (updated
 * 2026-09-18 per customer request - right-to-left visual order: plumber,
 * handyman, electrician, ac). Shared by both `CategorySection` (Home
 * Screen) and `CategoryStep` (booking flow's Flow 3 entry), so this one
 * array controls the order everywhere categories are listed. This
 * particular row is NOT affected by the DB's `sort_order` column.
 * Categories outside this set are appended after, ordered by their own
 * `sort_order`.
 */
const CATEGORY_DISPLAY_ORDER = ["plumber", "handyman", "electrician", "ac"];

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

/**
 * Category icon assets (updated 2026-09-18) - photographic "object" WebP
 * images (e.g. a wrench for handyman) exported from Figma and converted
 * via `scripts/convert-category-icon.mjs` at 216x216 (3x the 72px
 * display size `CategoryCard` renders them at, for retina sharpness),
 * replacing the previous flat SVG icon set. Re-run that script (see its
 * own doc comment) for any future icon swap, rather than converting by
 * hand, so every icon gets the same treatment.
 */
export const CATEGORY_ICON_SRC: Record<string, string> = {
  handyman: "/icons/category-handyman.webp",
  plumber: "/icons/category-plumber.webp",
  electrician: "/icons/category-electrician.webp",
  ac: "/icons/category-ac.webp",
};

export function getCategoryIconSrc(nameEn: string): string | null {
  return CATEGORY_ICON_SRC[nameEn] ?? null;
}

/**
 * Professional "character" illustration assets (added 2026-09-28 for the
 * Job Details screen, Figma node 9220:6130) - one full-figure illustration
 * per category, distinct from `CATEGORY_ICON_SRC`'s small flat object
 * icons above. Converted via the same `scripts/convert-category-icon.mjs`
 * pipeline (`--native --crop-bottom=22`), saved at their native 420x630px
 * (exactly 3x the screen's 140x210 display size - see that script's doc
 * comment for the sizing back-and-forth this went through).
 */
export const PROFESSIONAL_CHARACTER_SRC: Record<string, string> = {
  handyman: "/icons/professional-handyman.webp",
  plumber: "/icons/professional-plumber.webp",
  electrician: "/icons/professional-electrician.webp",
  ac: "/icons/professional-ac.webp",
};

export function getProfessionalCharacterSrc(nameEn: string): string | null {
  return PROFESSIONAL_CHARACTER_SRC[nameEn] ?? null;
}
