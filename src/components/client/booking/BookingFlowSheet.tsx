"use client";

import { useCallback, useEffect, useState } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import {
  SearchMatchStep,
  type SearchMatchServiceOption,
} from "@/components/client/booking/SearchMatchStep";
import { BookingMessageStep } from "@/components/client/booking/BookingMessageStep";
import { SchedulingDateStep } from "@/components/client/booking/SchedulingDateStep";
import { SchedulingHourStep } from "@/components/client/booking/SchedulingHourStep";
import { COPY } from "@/lib/copy";
import { NO_MATCH_OPTION_ID, type MatchOutcomeKind } from "@/lib/ai/matchTypes";

type SheetPhase =
  | "loading"
  | "match"
  | "no_professionals"
  | "no_price_yet"
  | "scheduling_date"
  | "scheduling_hour"
  | "error"
  | "awaiting_next_figma";

interface MatchApiResponse {
  query: string;
  outcome: MatchOutcomeKind;
  fallback: boolean;
  categoryLabel: string | null;
  matches: Array<{
    confidence: number;
    service: SearchMatchServiceOption & {
      category?: { label_he: string } | null;
    };
  }>;
  error?: string;
}

export interface BookingFlowSheetProps {
  open: boolean;
  query: string | null;
  onClose: () => void;
}

/**
 * Booking flow orchestrator opened as an overlay Bottom Sheet.
 * One continuous flow; each phase below is one "screen" of step content
 * swapped inside this same sheet (see /docs/client-booking-flow-prd.md
 * "Step Screen Reveal Rule" - a screen never shows a second question until
 * "הבא" is pressed).
 * Search path: match priced services → pick (+ Next) → Scheduling (date → hour);
 * "אין התאמה" + Next → no-professionals message;
 * category known without priced service → no-price-yet message → continue → Scheduling.
 * Scheduling (date, then hour, each its own screen) → next step (Attachments, not yet implemented).
 */
export function BookingFlowSheet({ open, query, onClose }: BookingFlowSheetProps) {
  const [phase, setPhase] = useState<SheetPhase>("loading");
  const [history, setHistory] = useState<SheetPhase[]>([]);
  const [resolvedQuery, setResolvedQuery] = useState("");
  const [categoryLabel, setCategoryLabel] = useState<string | null>(null);
  const [services, setServices] = useState<SearchMatchServiceOption[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const reset = useCallback(() => {
    setPhase("loading");
    setHistory([]);
    setResolvedQuery("");
    setCategoryLabel(null);
    setServices([]);
    setSelectedServiceId(null);
    setSelectedDate(null);
  }, []);

  /** Advance to a new phase, remembering the phase being left so "הקודם" can return to it. */
  const advanceTo = (nextPhase: SheetPhase) => {
    setHistory((h) => [...h, phase]);
    setPhase(nextPhase);
  };

  const handlePrevious = () => {
    setHistory((h) => {
      if (h.length === 0) return h;
      setPhase(h[h.length - 1]);
      return h.slice(0, -1);
    });
  };

  useEffect(() => {
    if (!open || !query?.trim()) return;

    let cancelled = false;
    reset();

    async function runMatch() {
      try {
        const response = await fetch("/api/ai/match-services", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
        });
        const data = (await response.json()) as MatchApiResponse;
        if (cancelled) return;

        if (!response.ok) {
          setPhase("error");
          return;
        }

        setResolvedQuery(data.query);
        setCategoryLabel(data.categoryLabel);
        setServices(data.matches.map((match) => match.service));

        if (data.outcome === "services") {
          setPhase("match");
          return;
        }

        if (data.outcome === "category_without_priced_service") {
          setPhase("no_price_yet");
          return;
        }

        setPhase("no_professionals");
      } catch {
        if (!cancelled) setPhase("error");
      }
    }

    void runMatch();
    return () => {
      cancelled = true;
    };
  }, [open, query, reset]);

  const handleClose = () => {
    onClose();
    reset();
  };

  const handleNext = (selectionId: string) => {
    setSelectedServiceId(selectionId);

    if (selectionId === NO_MATCH_OPTION_ID) {
      advanceTo("no_professionals");
      return;
    }

    console.log("booking draft service selected:", selectionId, "query:", resolvedQuery);
    advanceTo("scheduling_date");
  };

  const handleContinueWithoutPrice = () => {
    console.log(
      "booking draft continuing without priced service - category:",
      categoryLabel,
      "query:",
      resolvedQuery
    );
    advanceTo("scheduling_date");
  };

  const handleDateSelected = (date: Date) => {
    setSelectedDate(date);
    advanceTo("scheduling_hour");
  };

  const handleScheduled = (scheduledTime: Date) => {
    console.log("booking draft scheduled time selected:", scheduledTime.toISOString());
    advanceTo("awaiting_next_figma");
  };

  return (
    <BottomSheet open={open} onClose={handleClose}>
      {phase === "loading" ? (
        <div className="flex w-full items-center justify-center py-16">
          <div
            className="size-8 animate-spin rounded-full border-2 border-surface-pill border-t-brand-primary"
            aria-label="loading"
          />
        </div>
      ) : null}

      {phase === "error" || phase === "no_professionals" ? (
        <BookingMessageStep
          kind="noProfessionals"
          onPrimaryAction={handleClose}
          onPrevious={history.length > 0 ? handlePrevious : undefined}
        />
      ) : null}

      {phase === "no_price_yet" ? (
        <BookingMessageStep
          kind="noPriceYet"
          onPrimaryAction={handleContinueWithoutPrice}
          onPrevious={history.length > 0 ? handlePrevious : undefined}
        />
      ) : null}

      {phase === "scheduling_date" ? (
        <SchedulingDateStep
          onNext={handleDateSelected}
          initialDate={selectedDate}
          onPrevious={history.length > 0 ? handlePrevious : undefined}
        />
      ) : null}

      {phase === "scheduling_hour" && selectedDate ? (
        <SchedulingHourStep
          date={selectedDate}
          onNext={handleScheduled}
          onPrevious={history.length > 0 ? handlePrevious : undefined}
        />
      ) : null}

      {phase === "awaiting_next_figma" ? (
        <p className="w-full py-8 text-right text-lg font-semibold leading-[1.4] text-text-secondary">
          {COPY.bookingFlow.searchMatch.nextStepComingSoon}
        </p>
      ) : null}

      {phase === "match" ? (
        <SearchMatchStep
          query={resolvedQuery}
          categoryLabel={categoryLabel}
          services={services}
          onNext={handleNext}
          initialSelectedId={selectedServiceId}
          onPrevious={history.length > 0 ? handlePrevious : undefined}
        />
      ) : null}
    </BottomSheet>
  );
}
