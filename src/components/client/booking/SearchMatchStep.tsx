"use client";

import { useState } from "react";
import { BookingStepFooter } from "@/components/client/booking/BookingStepFooter";
import { SelectableServicePill } from "@/components/client/booking/SelectableServicePill";
import { COPY } from "@/lib/copy";
import { NO_MATCH_OPTION_ID } from "@/lib/ai/matchTypes";

export interface SearchMatchServiceOption {
  id: string;
  label_he: string;
  price_min: number;
  price_max: number;
  pricing_type: string;
}

export interface SearchMatchStepProps {
  query: string;
  categoryLabel: string | null;
  services: SearchMatchServiceOption[];
  /** Called on Next for either a catalog service id or `NO_MATCH_OPTION_ID`. */
  onNext: (selectionId: string) => void;
  /** Restores the pill selection when returning to this screen via "הקודם". */
  initialSelectedId?: string | null;
  /** Omit on the first screen shown in a path; see BookingFlowSheet's history stack. */
  onPrevious?: () => void;
}

function formatPriceLine(service: SearchMatchServiceOption): string {
  if (service.pricing_type === "diagnosis") {
    return COPY.bookingFlow.searchMatch.priceAfterInspection;
  }
  return COPY.bookingFlow.searchMatch.priceRange
    .replace("{min}", String(service.price_min))
    .replace("{max}", String(service.price_max));
}

/**
 * First booking step after SearchBar AI match (Figma OrderBottomSheet_SearchBar).
 * Selecting any pill (including "אין התאמה") enables Next; Next advances the flow.
 */
export function SearchMatchStep({
  query,
  categoryLabel,
  services,
  onNext,
  initialSelectedId = null,
  onPrevious,
}: SearchMatchStepProps) {
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId);
  const selectedService = services.find((service) => service.id === selectedId) ?? null;
  const canContinue = Boolean(selectedId);

  const handleNext = () => {
    if (!selectedId) return;
    onNext(selectedId);
  };

  return (
    <div className="flex w-full flex-col gap-10">
      <div className="flex w-full flex-col gap-6">
        <div className="flex w-full flex-col gap-2 text-right text-text-secondary">
          <p className="w-full text-lg font-semibold leading-[1.4]">
            {COPY.bookingFlow.searchMatch.understoodHeading}
          </p>
          <p className="w-full text-sm leading-[1.4]">
            {COPY.bookingFlow.searchMatch.youWrote.replace("{query}", query)}
          </p>
        </div>

        {categoryLabel ? (
          <div className="flex w-full flex-col gap-2 text-right text-text-secondary">
            <p className="w-full text-lg font-semibold leading-[1.4]">
              {COPY.bookingFlow.searchMatch.matchingProfessionLabel}
            </p>
            <p className="w-full text-sm leading-[1.4]">{categoryLabel}</p>
          </div>
        ) : null}

        <div className="flex w-full flex-col gap-4">
          <p className="w-full text-right text-lg font-semibold leading-[1.4] text-text-secondary">
            {COPY.bookingFlow.searchMatch.chooseServiceHeading}
          </p>
          <div className="flex w-full flex-wrap items-start justify-start gap-x-2 gap-y-4">
            {services.map((service) => (
              <SelectableServicePill
                key={service.id}
                label={service.label_he}
                selected={selectedId === service.id}
                onClick={() => setSelectedId(service.id)}
              />
            ))}
            <SelectableServicePill
              label={COPY.bookingFlow.searchMatch.noMatchOption}
              selected={selectedId === NO_MATCH_OPTION_ID}
              onClick={() => setSelectedId(NO_MATCH_OPTION_ID)}
            />
          </div>
          {selectedService ? (
            <p className="w-full text-right text-sm leading-[1.4] text-text-secondary">
              {formatPriceLine(selectedService)}
            </p>
          ) : null}
        </div>
      </div>

      <BookingStepFooter
        onPrevious={onPrevious}
        nextLabel={COPY.bookingFlow.searchMatch.next}
        onNext={handleNext}
        nextDisabled={!canContinue}
      />
    </div>
  );
}
