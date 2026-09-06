import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { cn } from "@/lib/cn";
import { formatJobDate, formatTimeWindow } from "@/lib/formatDate";
import { COPY } from "@/lib/copy";

export interface OrderRecapProfile {
  fullName: string;
  addressLine: string;
  /**
   * "Who to expect / call at this address" (`addresses.contact_name`/
   * `contact_phone`, added 2026-08-23) - distinct from `fullName` above,
   * which always stays the account holder's own name/identity (billing +
   * accountability) even when ordering to someone else's address (e.g.
   * a parent's home). Only set when the selected/new address has one.
   */
  contactName?: string | null;
  contactPhone?: string | null;
}

export interface OrderRecapProps {
  /** The broad matched professional category (e.g. "אינסטלטור") - always known once the match API has resolved, regardless of path. */
  categoryLabel: string;
  /**
   * The specific chosen service (e.g. "פתיחת סתימה בכיור"). Absent for the
   * "no_price_yet" population (category matched, no priced catalog
   * service to pick) - `categoryLabel` above is the only service info
   * that population has.
   */
  serviceLabel?: string | null;
  priceMin: number;
  priceMax: number;
  pricingType: string;
  scheduledTime: Date;
  hasNote: boolean;
  photosCount: number;
  /**
   * The customer's name + address, appended below the usual order details.
   * For a brand-new phone this is the just-entered `NewUserDetailsStep`
   * data; for a returning profile (session+profile complete, or just-
   * verified with an existing profile) it's their saved name + currently
   * selected saved address (see `BookingFlowSheet.buildRecap`/
   * `loadReturningProfile`) - every population shows this now (changed
   * 2026-08-23; previously only the brand-new-phone population did).
   */
  profile?: OrderRecapProfile;
  /**
   * Only present once there's an actual saved address to switch between or
   * add to (`BookingFlowSheet`: `addresses.length > 0`) - renders a
   * "שנה כתובת" `Pill` below the name/address/contact block, opening
   * `ChooseAddressStep` (moved there from beside the address line itself
   * 2026-09-04, against Figma node `8576:6550`). A brand-new profile this
   * same session has no saved addresses yet (its one address is still
   * just-typed, unsaved), so it never gets this button.
   */
  onChangeAddress?: () => void;
}

/**
 * Deliberately NOT `bookingFlow.searchMatch.priceRange`/`priceAfterInspection`
 * (confirmed 2026-08-20, per Figma node 8483:6420): those are full
 * sentences ("טווח מחיר עבור עבודה זו: ...") appropriate for `SearchMatchStep`
 * where price is the thing being decided between - here the price sits as a
 * bare value directly across from an already-labeled service name, so the
 * explanatory prefix just reads as clutter. The priced case needs no copy
 * key at all - it's the same plain `"₪ {min}-{max}"` format `ActiveJobCard`
 * already uses for its own price line, which is exactly what this card is
 * previewing.
 */
function formatPriceLine(priceMin: number, priceMax: number, pricingType: string): string {
  if (pricingType === "diagnosis") {
    return COPY.bookingFlow.orderRecap.priceAfterInspectionShort;
  }
  return `\u20AA ${priceMin}-${priceMax}`;
}

/**
 * Read-only order summary rendered on `ConfirmStep` - the single screen
 * every path ends on (see client-booking-flow-prd.md "Submission"): every
 * user sees exactly one of these before their one explicit `"שלח הזמנה"`
 * tap, regardless of how many steps their path included. See
 * `ConfirmStep`'s doc comment for why this is never rendered inline on any
 * other step.
 *
 * Deliberately styled after `ActiveJobCard` (Figma node 8483:6420, confirmed
 * 2026-08-20) - same `Card` shell, same category/date + time + service/price
 * row structure, and now the same full `text-text-primary` (black) text
 * throughout, matching how this info reads on Home - not muted to
 * `text-text-secondary` the way an earlier pass here had it. The one
 * remaining difference from `ActiveJobCard` is there's no `StatusBar` and no
 * professional-name row: nothing is confirmed yet at this point (no
 * professional assigned), so there's no status and no name to show there.
 *
 * Does carry a note/photo-attached indicator (`hasNote`/`photosCount`) -
 * reinstated 2026-08-20 after initially being dropped: this is the one
 * screen in the flow where there's no full, everything-visible view of the
 * order before it's created, so a customer genuinely needs confirmation
 * here that a note/photo they added actually made it into the request. The
 * later Job Card on the Orders screen not showing this isn't a
 * contradiction - that card is a compact list-item summary specifically
 * deferring detail to a tap-through (which does show the note/photos), a
 * choice made for list density, not because the information doesn't
 * matter - whereas this recap has no such tap-through of its own to defer to.
 *
 * Reuses the same date/time formatting already used elsewhere
 * (`formatDate.ts`) rather than duplicating it - see copy-deck.md's note
 * under the Client Booking Flow section.
 */
export function OrderRecap({
  categoryLabel,
  serviceLabel,
  priceMin,
  priceMax,
  pricingType,
  scheduledTime,
  hasNote,
  photosCount,
  profile,
  onChangeAddress,
}: OrderRecapProps) {
  const isoDate = scheduledTime.toISOString();
  const isDiagnosisPrice = pricingType === "diagnosis";

  return (
    <Card className="flex w-full flex-col gap-4 bg-surface-notification px-6 py-5 text-right text-text-primary">
      <div className="flex w-full flex-col gap-1">
        <div className="flex w-full items-end justify-between">
          <p className="text-lg font-semibold leading-[1.4]">{categoryLabel}</p>
          <p className="text-sm font-semibold leading-[1.4]">{formatJobDate(isoDate)}</p>
        </div>
        <div className="flex w-full items-center justify-end">
          <p dir="ltr" className="text-sm font-semibold leading-[1.4]">
            {formatTimeWindow(isoDate)}
          </p>
        </div>
      </div>

      <div className={cn("flex w-full items-center", serviceLabel ? "justify-between" : "justify-end")}>
        {serviceLabel ? <p className="text-sm leading-[1.4]">{serviceLabel}</p> : null}
        {/*
          `dir="ltr"` only for the priced case - that's bare LTR-safe
          content ("₪ 200-350"), same as the time line above. The
          diagnosis-price fallback is a real Hebrew phrase, so forcing ltr
          on it would garble it the same way it once did to the old,
          longer price sentence here (see git history / component-library.md).
        */}
        <p dir={isDiagnosisPrice ? undefined : "ltr"} className="text-sm leading-[1.4]">
          {formatPriceLine(priceMin, priceMax, pricingType)}
        </p>
      </div>

      {hasNote || photosCount > 0 ? (
        <div className="flex w-full items-center gap-3 text-xs leading-[1.4]">
          {hasNote ? <p>{COPY.bookingFlow.orderRecap.notesIncludedLabel}</p> : null}
          {photosCount > 0 ? (
            <p>{COPY.bookingFlow.orderRecap.photosCountLabel.replace("{count}", String(photosCount))}</p>
          ) : null}
        </div>
      ) : null}

      {profile ? (
        <>
          <div className="h-px w-full bg-divider" />
          {/*
            Redesigned 2026-09-04 against Figma node `8576:6550`: the
            "שנה כתובת" button moved from beside the address line to its
            own row below the whole name/address/contact block (`gap-6`,
            24px, between the text block and the button - Figma's own
            `gap-[24px]`), and the contact line lost its earlier muted
            `text-xs text-text-secondary` treatment - all three lines
            (name, address, contact) are now the same `text-sm
            text-text-primary` as each other, matching Figma exactly
            rather than reading as a lesser/secondary detail.
            `items-center` horizontally centers the button under the
            (full-width, right-aligned-text) block above it - verified by
            measuring the rendered screenshot's pixels directly (button
            text spans x≈139-203, block spans x=24-318, both centered on
            ≈171) after an initial guess here that it sat flush left was
            wrong and got corrected.
          */}
          <div className="flex w-full flex-col items-center gap-6">
            <div className="flex w-full flex-col gap-1">
              <p className="w-full text-right text-sm leading-[1.4]">{profile.fullName}</p>
              <p className="w-full text-right text-sm leading-[1.4]">{profile.addressLine}</p>
              {profile.contactName || profile.contactPhone ? (
                <p className="w-full text-right text-sm leading-[1.4]">
                  {COPY.bookingFlow.orderRecap.contactLabel}
                  {": "}
                  {[profile.contactName, profile.contactPhone].filter(Boolean).join(", ")}
                </p>
              ) : null}
            </div>
            {/*
              The exact same shared `Pill` Home's `TimePillsRow`/
              `PopularServicesSection` use, at its default (no-background,
              confirmed 2026-09-04 - see `Pill`'s own doc comment) styling
              - no `colorClassName` override needed here at all, matching
              Figma's "TimePill"-named but fill-less layer here exactly.
            */}
            {onChangeAddress ? (
              <Pill onClick={onChangeAddress}>{COPY.bookingFlow.confirm.changeAddress}</Pill>
            ) : null}
          </div>
        </>
      ) : null}
    </Card>
  );
}
