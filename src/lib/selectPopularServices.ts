import type { ServiceWithCategory } from "@/lib/types";

/**
 * Selects a diverse, balanced subset of services for the Popular Services
 * section, per /docs/home-screen-prd.md 3.6.
 *
 * The `services` table has no popularity field yet, so (per the PRD's
 * fallback rule: "select randomly while maintaining category diversity")
 * this uses a deterministic round-robin across categories (ordered by
 * `category.sort_order`, then `service.sort_order` within each category)
 * instead of true randomness - this avoids the pill set reshuffling on
 * every render/expand while still spreading services across categories
 * and preferring lower sort_order.
 */
export function selectPopularServices(
  services: ServiceWithCategory[],
  maxCount: number
): ServiceWithCategory[] {
  const groups = new Map<string, ServiceWithCategory[]>();

  for (const service of services) {
    const key = service.category_id;
    const group = groups.get(key);
    if (group) group.push(service);
    else groups.set(key, [service]);
  }

  const orderedGroups = Array.from(groups.values()).sort((a, b) => {
    const orderA = a[0].category?.sort_order ?? 0;
    const orderB = b[0].category?.sort_order ?? 0;
    return orderA - orderB;
  });

  const result: ServiceWithCategory[] = [];
  let round = 0;

  while (result.length < maxCount) {
    let addedInRound = false;

    for (const group of orderedGroups) {
      if (round < group.length) {
        result.push(group[round]);
        addedInRound = true;
        if (result.length >= maxCount) break;
      }
    }

    if (!addedInRound) break;
    round += 1;
  }

  return result;
}
