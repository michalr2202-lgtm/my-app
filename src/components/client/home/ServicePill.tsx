"use client";

import { Pill } from "@/components/ui/Pill";
import { resolveCategoryBackground } from "@/lib/categoryVisuals";
import type { ServiceWithCategory } from "@/lib/types";

export interface ServicePillProps {
  service: ServiceWithCategory;
  onClick: () => void;
}

/**
 * ServicePill - one selectable service in the Popular Services grid.
 * Per /docs/home-screen-prd.md 3.6: background = category color only,
 * no icons/descriptions/prices on the pill itself.
 */
export function ServicePill({ service, onClick }: ServicePillProps) {
  const background = resolveCategoryBackground({
    name_en: service.category?.name_en ?? "",
  });

  return (
    <Pill
      onClick={onClick}
      colorClassName={background.className ? `${background.className} text-brand-primary` : "text-brand-primary"}
      style={background.style}
    >
      {service.label_he}
    </Pill>
  );
}
