import { COPY } from "@/lib/copy";

/**
 * Shared price-line formatter for any screen that lets the customer pick a
 * catalog service and shows its price range/diagnosis note underneath the
 * selected pill - `SearchMatchStep` (AI-matched services) and
 * `CategoryServiceStep` (services within a manually-picked category, added
 * 2026-09-06). Extracted here (was a private `formatPriceLine` inside
 * `SearchMatchStep` alone) so both screens render identical wording/rules
 * for a `pricing_type` of `"diagnosis"` vs. a real `price_min`/`price_max`
 * range, per the Single Source of Truth rule (`ai-engineering-workflow.md`)
 * - this is presentation logic, not a business rule owned by any one
 * screen, so it doesn't belong duplicated inside either of them.
 */
/**
 * Wraps a `min-max` digit range in an LTR isolate (U+2066/U+2069) so the
 * Unicode bidi algorithm can't reorder the two numbers around the dash
 * (extracted 2026-09-28 from `formatServicePriceLine`'s inline-sentence
 * fix below - the same isolate technique, just without that function's
 * surrounding sentence template, for callers that already have their own
 * standalone price element).
 */
function formatIsolatedRange(min: number, max: number): string {
  return `\u2066${min}-${max}\u2069`;
}

/**
 * Compact `₪ {min}-{max}` price line (added 2026-09-28) - the format
 * `OrderCard`/`ActiveJobCard`/`JobDetailsScreen` show for an already-known
 * job price (as opposed to `formatServicePriceLine`'s full sentence, used
 * while still choosing a catalog service). Single source of truth for
 * this exact string so it isn't hand-built ad hoc in multiple components.
 */
export function formatPriceRange(min: number, max: number): string {
  return `\u20AA ${formatIsolatedRange(min, max)}`;
}

/**
 * Single real price (added 2026-09-29 for `OrderCard`'s history bucket) -
 * a completed job's `final_price` is one concrete number, not an estimate
 * range, so this deliberately doesn't reuse `formatPriceRange`'s min-max
 * digit-dash-digit bidi isolate (`formatIsolatedRange`) - a lone number
 * has no internal ordering for the bidi algorithm to scramble.
 */
export function formatFinalPrice(price: number): string {
  return `\u20AA ${price}`;
}

export function formatServicePriceLine(service: {
  pricing_type: string;
  price_min: number;
  price_max: number;
}): string {
  if (service.pricing_type === "diagnosis") {
    return COPY.bookingFlow.searchMatch.priceAfterInspection;
  }
  /**
   * Bug fixed 2026-09-08: `{min}–{max}` sits inside an otherwise-Hebrew
   * (RTL) sentence, with no element of its own to hang a `dir="ltr"`
   * override on the way `ActiveJobCard`/`OrderCard` do for their
   * standalone price line. Left as plain digits, the Unicode bidi
   * algorithm was free to reorder the two numbers around the dash
   * (rendering e.g. "300–200" instead of "200–300") - reported on
   * `SearchMatchStep`/`CategoryServiceStep`/`ServiceConfirmStep`.
   * Wrapping just the digit-dash-digit run in an LTR isolate (U+2066/
   * U+2069) forces it to render in the correct order without needing a
   * separate inline element, and without affecting the Hebrew text
   * around it (the trailing " ₪" stays outside the isolate, in the
   * paragraph's normal RTL flow).
   */
  return COPY.bookingFlow.searchMatch.priceRange
    .replace("{min}", `\u2066${service.price_min}`)
    .replace("{max}", `${service.price_max}\u2069`);
}
