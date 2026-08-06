"use client";

import { useMemo, useState } from "react";
import { Pill } from "@/components/ui/Pill";
import { ServicePill } from "@/components/client/home/ServicePill";
import { selectPopularServices } from "@/lib/selectPopularServices";
import { COPY } from "@/lib/copy";
import type { ServiceWithCategory } from "@/lib/types";

const COLLAPSED_COUNT = 4;
const EXPANDED_COUNT = 12;

export interface PopularServicesSectionProps {
  services: ServiceWithCategory[];
  onSelectService: (service: ServiceWithCategory) => void;
}

/**
 * PopularServicesSection - collapsed (3-4 pills) / expanded (8-12 pills)
 * service shortcuts. See /docs/home-screen-prd.md 3.6, State E.
 */
export function PopularServicesSection({ services, onSelectService }: PopularServicesSectionProps) {
  const [expanded, setExpanded] = useState(false);

  const diverseServices = useMemo(
    () => selectPopularServices(services, EXPANDED_COUNT),
    [services]
  );

  if (diverseServices.length === 0) return null;

  const visibleServices = expanded ? diverseServices : diverseServices.slice(0, COLLAPSED_COUNT);
  const canExpand = diverseServices.length > COLLAPSED_COUNT;

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <h2 className="w-full text-right text-lg font-semibold leading-[1.4] text-text-primary">
        {COPY.homeScreen.popularServices.heading}
      </h2>
      {/*
        justify-start (not justify-end): in a native `dir="rtl"` flex row,
        CSS `flex-end` resolves to the left edge, not the right. `flex-start`
        is what packs each wrapped row flush against the right edge, matching
        Figma - verified against an isolated Figma node screenshot.
      */}
      <div className="flex w-full flex-wrap items-center justify-start gap-x-2 gap-y-4">
        {visibleServices.map((service) => (
          <ServicePill key={service.id} service={service} onClick={() => onSelectService(service)} />
        ))}
      </div>
      {canExpand ? (
        <Pill onClick={() => setExpanded((current) => !current)}>
          {expanded ? COPY.homeScreen.popularServices.showLess : COPY.homeScreen.popularServices.showMore}
        </Pill>
      ) : null}
    </div>
  );
}
