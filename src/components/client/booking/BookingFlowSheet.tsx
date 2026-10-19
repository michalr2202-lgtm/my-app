"use client";

import type { Session } from "@supabase/supabase-js";
import { useCallback, useEffect, useState } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import {
  SearchMatchStep,
  type SearchMatchServiceOption,
} from "@/components/client/booking/SearchMatchStep";
import { CategoryStep } from "@/components/client/booking/CategoryStep";
import { CategoryServiceStep } from "@/components/client/booking/CategoryServiceStep";
import { ServiceConfirmStep } from "@/components/client/booking/ServiceConfirmStep";
import { BookingMessageStep } from "@/components/client/booking/BookingMessageStep";
import { SchedulingDateStep } from "@/components/client/booking/SchedulingDateStep";
import { SchedulingHourStep } from "@/components/client/booking/SchedulingHourStep";
import { AttachmentsStep } from "@/components/client/booking/AttachmentsStep";
import { AuthenticationStep } from "@/components/client/booking/AuthenticationStep";
import type { AddressOnlyValues } from "@/components/client/booking/AddressFields";
import {
  NewUserDetailsStep,
  type NewUserDetailsValues,
} from "@/components/client/booking/NewUserDetailsStep";
import { ChooseAddressStep } from "@/components/client/booking/ChooseAddressStep";
import { ConfirmStep } from "@/components/client/booking/ConfirmStep";
import type { OrderRecapProps } from "@/components/client/booking/OrderRecap";
import { fetchUserBasicProfile, getBookingSession, hasUserProfile, type UserBasicProfile } from "@/lib/auth";
import { fetchDiagnosisPlaceholderServiceId } from "@/lib/queries/services";
import {
  fetchAddressIdsWithJobs,
  fetchAddressUsageCounts,
  fetchUserAddresses,
  type AddressUsageCounts,
} from "@/lib/queries/addresses";
import { CITIES } from "@/lib/addresses";
import { COPY } from "@/lib/copy";
import { NO_MATCH_OPTION_ID, type MatchOutcomeKind } from "@/lib/ai/matchTypes";
import { getHourSlots, roundUrgentNowScheduledTime } from "@/lib/scheduling";
import { supabase } from "@/lib/supabase";
import { uploadJobAttachments } from "@/lib/queries/jobAttachments";
import type { Address, Category, ServiceWithCategory, TimeSelection } from "@/lib/types";

type SheetPhase =
  | "loading"
  | "match"
  | "category"
  | "category_service"
  | "service_confirm"
  | "no_professionals"
  | "no_service_match"
  | "no_price_yet"
  | "scheduling_date"
  | "scheduling_hour"
  | "no_slots_for_date"
  | "attachments"
  | "authentication"
  | "new_user_details"
  | "confirm"
  | "choose_address"
  | "job_created"
  | "submit_failed"
  | "error";

interface MatchApiResponse {
  query: string;
  outcome: MatchOutcomeKind;
  fallback: boolean;
  categoryLabel: string | null;
  categoryId: string | null;
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
  /** Search-box entry (Flow 1) - mutually exclusive with `timeSelection`/`categoryId` below. */
  query: string | null;
  /**
   * Time Pill entry (Flow 2, added 2026-09-06 - see
   * `client-booking-flow-prd.md` §3 "Entry Point Mapping"). Mutually
   * exclusive with `query`/`categoryId` - `ClientHomeScreen` only ever
   * sets one of the three before opening. `"urgent_now"` additionally
   * skips Scheduling (Step 3) entirely once a service is picked (see
   * `advanceToScheduling`) and shows the extra urgency-framing block on
   * `CategoryStep`; `"schedule_later"` reaches the exact same Step 1/2
   * screens but continues into Scheduling normally, same as every other
   * entry point.
   */
  timeSelection: TimeSelection | null;
  /**
   * Category Card entry point (Flow 3, added 2026-09-07 - see
   * `client-booking-flow-prd.md` §3 "Entry Point Mapping"). Mutually
   * exclusive with `query`/`timeSelection` above. Reaches the *exact*
   * same `CategoryServiceStep` (Step 2) the Time Pill entry's
   * `CategoryStep` (Step 1) leads to - just skipping Step 1 entirely,
   * since the category is already known (the card the customer tapped),
   * not something to ask about. Nothing about this prop or the logic
   * below is category-specific - all 4 Home Screen cards use it the same
   * way (see `ClientHomeScreen`'s `handleSelectCategory`).
   */
  categoryId: string | null;
  /**
   * Service Pill entry point (Flow 4, added 2026-09-07 - see
   * `client-booking-flow-prd.md` §3 "Entry Point Mapping"). Mutually
   * exclusive with `query`/`timeSelection`/`categoryId` above. Reaches the
   * *exact* same `ServiceConfirmStep` (Step 2.5 - new, lightweight screen
   * just to confirm and continue) regardless of which service pill was
   * tapped - both the service *and* its category are already known here
   * (the pill tapped), so unlike every other entry point there is no
   * pill grid or category to pick at all, just a straight confirm ->
   * Scheduling.
   */
  serviceId: string | null;
  /**
   * The full active catalog (already fetched once for the Home Screen -
   * see `page.tsx`) - reused here for Flow 2/3's `CategoryStep`/
   * `CategoryServiceStep` rather than re-fetching, since every entry
   * point needs the exact same data Home already loaded.
   */
  categories: Category[];
  catalogServices: ServiceWithCategory[];
  onClose: () => void;
}

/**
 * Human-readable one-line address for `OrderRecap.profile`, used only for
 * the brand-new-profile population (`NewUserDetailsValues` satisfies
 * `AddressOnlyValues`'s shape). A returning profile's address always comes
 * from `formatSavedAddressLine` below instead, since it's a real `Address`
 * row by the time `ConfirmStep` ever needs it (see this component's doc
 * comment on immediate persistence).
 */
function formatAddressLine(fields: AddressOnlyValues): string {
  const cityLabel = CITIES.find((city) => city.value === fields.city)?.label ?? "";
  const apartmentPart = fields.apartment
    ? `, ${COPY.bookingFlow.confirm.apartmentLine.replace("{apartment}", fields.apartment)}`
    : "";
  const entrancePart = fields.entranceCode
    ? `, ${COPY.bookingFlow.confirm.entranceCodeLine.replace("{code}", fields.entranceCode)}`
    : "";
  return `${cityLabel}, ${fields.street} ${fields.buildingNumber}${apartmentPart}${entrancePart}`;
}

/**
 * Same as `formatAddressLine` but for an already-saved `Address` row -
 * `address.city` there is already the Hebrew display label (not the
 * internal `NewUserCity` value), since `submit_booking` only ever persists
 * the label, so no `CITIES` lookup is needed or possible here.
 */
function formatSavedAddressLine(address: Address): string {
  const apartmentPart = address.apartment
    ? `, ${COPY.bookingFlow.confirm.apartmentLine.replace("{apartment}", address.apartment)}`
    : "";
  const entrancePart = address.entrance_code
    ? `, ${COPY.bookingFlow.confirm.entranceCodeLine.replace("{code}", address.entrance_code)}`
    : "";
  return `${address.city}, ${address.street} ${address.building_number}${apartmentPart}${entrancePart}`;
}

/**
 * Booking flow orchestrator opened as an overlay Bottom Sheet.
 * One continuous flow; each phase below is one "screen" of step content
 * swapped inside this same sheet (see /docs/client-booking-flow-prd.md
 * "Step Screen Reveal Rule" - a screen never shows a second question until
 * "הבא" is pressed).
 *
 * Search path (Flow 1, `query` prop): match priced services → pick (+ Next)
 * → Scheduling (date → hour); "אין התאמה" + Next → no-service-match message
 * (distinct from the no-professionals message below - the matcher DID find
 * services to show, the user just said none fit, so this points them at
 * rephrasing instead); matcher couldn't identify any category at all →
 * no-professionals message; category known without priced service →
 * no-price-yet message → continue → Scheduling.
 *
 * Time Pill path (Flow 2, `timeSelection` prop, added 2026-09-06 - see
 * `client-booking-flow-prd.md` §3 "Entry Point Mapping"): `CategoryStep`
 * (pick one of the 4 fixed categories, `urgent` framing shown only for
 * "urgent_now") → `CategoryServiceStep` (pick one of that category's
 * catalog services - or type a free-text description into its "אחר"
 * field, which runs the *exact same* AI classification as the search path
 * via `handleCategoryOtherNext`, landing on `match`/`no_price_yet`/
 * `no_professionals` exactly like the search path would, just with
 * `SearchMatchStep`'s heading swapped to echo that typed description
 * instead of a search-box query - see that handler and
 * `SearchMatchStep`'s `headingOverride`/`professionLabelOverride` props)
 * → Scheduling, same as the search path - **except** "urgent_now"
 * specifically, which skips Scheduling entirely and goes straight to
 * Attachments (see `advanceToScheduling`), leaving `scheduledTime` as
 * submission time.
 *
 * Category Card path (Flow 3, `categoryId` prop, added 2026-09-07 - see
 * `client-booking-flow-prd.md` §3 "Entry Point Mapping"): lands directly
 * on `CategoryServiceStep`, skipping `CategoryStep` (Step 1) entirely -
 * the category is already known (one of the 4 Home Screen cards tapped),
 * not something to ask about, so there's no screen shown before it and
 * no "הקודם" off of it either (`history` starts empty for this path,
 * same as `category` does for Flow 2). Continues from there exactly like
 * Flow 2 does - ordinary service pill or "אחר" free text, then
 * Scheduling.
 *
 * Service Pill path (Flow 4, `serviceId` prop, added 2026-09-07 - see
 * `client-booking-flow-prd.md` §3 "Entry Point Mapping"): lands directly
 * on `ServiceConfirmStep`, skipping both `CategoryStep` and
 * `CategoryServiceStep` entirely - the *specific service* is already known
 * (one of the Home Screen's Popular Services pills tapped), not just its
 * category, so there's nothing left to ask about, only to confirm. No
 * pill grid, no "אחר" field - one screen showing the chosen service +
 * price, then its matching profession, then straight to Scheduling (same
 * `advanceToScheduling` every other path uses).
 *
 * All four entry points reuse `categories`/`catalogServices` (props,
 * already fetched once for the Home Screen - see `page.tsx`) rather than
 * fetching again.
 *
 * Scheduling (date, then hour, each its own screen; date → no_slots_for_date
 * instead of hour if today no longer has any 1-hour-lead-time slots left)
 * → Attachments (one screen, notes + photos both always visible - see
 * AttachmentsStep) → Authentication (Step 5, skipped if a session already
 * exists on this device) → New User Details (Step 6, skipped if the
 * verified/known phone already has a `public.users` profile) → Choose
 * Address (added 2026-09-03 as an automatic forward step, skipped unless
 * the returning profile has more than one saved address at all - see
 * `finishChooseAddress`'s doc comment) → Confirm (Step 7, always the final
 * screen for every path - see "Submission" in that PRD). `session`/
 * `hasProfile` below decide which of Attachments/Authentication/New User
 * Details ends up being the last *content* screen before Confirm/Choose
 * Address; see `buildRecap`/`submitBooking`. Confirm is the only
 * screen that ever renders `OrderRecap` or shows the `"שלח הזמנה"` button -
 * an earlier version rendered the recap inline at the bottom of whichever
 * of Attachments/Authentication was last, but that combined layout doesn't
 * reliably fit `BottomSheet`'s `max-h-[92dvh]` on every viewport (observed
 * 2026-08-21 as a scrollbar inside the sheet on a laptop), so every path
 * now always takes one extra step to a plain, guaranteed-to-fit Confirm
 * screen instead - see `ConfirmStep`'s doc comment.
 */
export function BookingFlowSheet({
  open,
  query,
  timeSelection,
  categoryId,
  serviceId,
  categories,
  catalogServices,
  onClose,
}: BookingFlowSheetProps) {
  const [phase, setPhase] = useState<SheetPhase>("loading");
  const [history, setHistory] = useState<SheetPhase[]>([]);
  const [resolvedQuery, setResolvedQuery] = useState("");
  /**
   * The AI-matched/identified category label - shown on `SearchMatchStep`/
   * `no_price_yet` and used for `buildRecap`'s final `categoryLabel` (the
   * actual category the job books under). NOT the same thing as "the
   * category picked directly on `CategoryStep`" - see
   * `selectedCategoryLabel` below, which is what `CategoryServiceStep`'s
   * own header actually needs; conflating the two here (fixed 2026-09-06)
   * used to make that header silently show a *different* category after a
   * "הקודם" back from a `handleCategoryOtherNext` round trip that
   * reclassified into a different one.
   */
  const [categoryLabel, setCategoryLabel] = useState<string | null>(null);
  /** The AI-matched services shown on `SearchMatchStep` - see `categoryServices` below for why this is a separate state from the Time Pill entry's per-category catalog list. */
  const [services, setServices] = useState<SearchMatchServiceOption[]>([]);
  /**
   * `CategoryStep`'s picked category's full ≤10-service catalog, shown on
   * `CategoryServiceStep` - deliberately a *separate* state from `services`
   * above (fixed 2026-09-06; they used to be the same variable), because
   * `handleCategoryOtherNext`'s AI reclassification also writes into
   * `services` when its outcome is "services" (for the `match` phase) -
   * sharing one variable meant a "הקודם" back from that reclassification
   * silently swapped `CategoryServiceStep`'s original 10-service list for
   * whatever 1-3 services the AI just matched (possibly from a different
   * category entirely), which is what actually produced the "editing the
   * 'אחר' field back on this screen looks broken" symptom reported that
   * day - the field's own text was restoring correctly the whole time, but
   * the *service pills around it* had silently changed underneath it.
   */
  const [categoryServices, setCategoryServices] = useState<SearchMatchServiceOption[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  /**
   * Only set for the "no_price_yet" phase (see `runMatch` below) - the
   * category's diagnosis-priced placeholder service id, used purely to
   * satisfy `jobs.service_id`'s FK on submission (`submitBooking`).
   * Deliberately kept separate from `selectedServiceId`/`selectedService`
   * so `buildRecap`'s `serviceLabel` (derived from `selectedService`) never
   * picks up this placeholder's `label_he` - that population still shows no
   * service label, matching the confirmed 2026-08-21 product decision (see
   * copy-deck.md).
   */
  const [diagnosisServiceId, setDiagnosisServiceId] = useState<string | null>(null);
  /**
   * The category id picked on `CategoryStep` (Time Pill entry only) -
   * needed so `handleCategoryOtherNext` below can tell whether the AI's
   * own classification of the "אחר" field's free text lands back on this
   * same category or a different one (see `matchedCategoryDiffersFromSelection`).
   * `categoryLabel` alone isn't enough for that comparison since it gets
   * overwritten by the AI response either way.
   */
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  /**
   * The category label picked on `CategoryStep` - what `CategoryServiceStep`'s
   * own header ("המקצוע הנבחר:") always shows, *regardless* of what
   * `categoryLabel` (above) later gets reclassified to via the "אחר"
   * field. Kept as its own state (fixed 2026-09-06, same underlying bug as
   * `categoryServices`) rather than reusing `categoryLabel` for both.
   */
  const [selectedCategoryLabel, setSelectedCategoryLabel] = useState<string | null>(null);
  /**
   * Restores `CategoryServiceStep`'s "אחר" field text across a "הקודם"/
   * "הבא" round-trip through `match` - but only while `selectedCategoryId`
   * stays the same. Cleared by `handleCategoryNext` whenever a genuinely
   * *different* category is picked on Step 1 (added 2026-09-07) - a draft
   * written against one category's context shouldn't silently reappear
   * under a different one.
   */
  const [categoryOtherText, setCategoryOtherText] = useState("");
  /** True only while `handleCategoryOtherNext`'s fetch is in flight - disables `CategoryServiceStep`'s "הבא", same pattern as `submitting` on `ConfirmStep`. */
  const [analyzingOther, setAnalyzingOther] = useState(false);
  /**
   * Which entry produced the current `resolvedQuery`/`categoryLabel`/
   * `services` - `"search"` (Flow 1, the search box) or `"categoryOther"`
   * (Time Pill entry's `CategoryServiceStep` "אחר" field, added
   * 2026-09-06). Both land on the exact same `match`/`no_price_yet`/
   * `no_professionals` phases via the exact same AI classification call -
   * this only decides how `SearchMatchStep` labels the echoed text/
   * profession block (see its `headingOverride`/`professionLabelOverride`
   * props), nothing else.
   */
  const [matchSource, setMatchSource] = useState<"search" | "categoryOther">("search");
  /**
   * Computed once, when `handleCategoryOtherNext`'s response arrives -
   * whether the AI's classification landed on a different category than
   * the one already picked on `CategoryStep`. Drives whether
   * `SearchMatchStep`'s profession-match block shows at all for this
   * `matchSource` (per product decision 2026-09-06: showing it when the
   * category is unchanged from the customer's own Step 1 pick would just
   * be redundant - it only earns a callout when it disagrees).
   */
  const [matchedCategoryDiffersFromSelection, setMatchedCategoryDiffersFromSelection] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  /**
   * Frozen once per booking session (reset alongside everything else in
   * `reset()`), not re-derived from `new Date()` on every render - see
   * `scheduling.ts`'s doc comment on why a live "now" would make hour slots
   * shrink/disappear on Previous/Next round-trips through later steps.
   */
  const [flowNow, setFlowNow] = useState<Date>(() => new Date());
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);

  /**
   * Device auth state (Step 5's skip condition). Checked once per sheet
   * open, not per search query - the device either has a session or it
   * doesn't, independent of what's being booked. Updated again right after
   * a successful OTP verification (see `handleVerifyCode`), and flipped to
   * `true` right after a brand-new profile is created (see `submitBooking`)
   * so a second booking in the same sheet-open session doesn't re-ask.
   */
  const [session, setSession] = useState<Session | null>(null);
  const [hasProfile, setHasProfile] = useState(false);
  /**
   * Populated once `hasProfile` is true (see `loadReturningProfile`) - the
   * returning-population equivalent of `pendingProfileFields` below, since
   * that one is only ever set for a brand-new profile. Device/profile-level
   * like `hasProfile`, not per-order - not cleared by `reset()`.
   */
  const [returningProfile, setReturningProfile] = useState<UserBasicProfile | null>(null);
  /** All addresses the returning profile has saved (`ChooseAddressStep`'s list), oldest/first-added first (added 2026-09-03, see `fetchUserAddresses`'s doc comment) - stable order, independent of `is_default`. */
  const [addresses, setAddresses] = useState<Address[]>([]);
  /**
   * Cumulative counts backing `ChooseAddressStep`'s two caps (added
   * 2026-08-25) - deliberately includes soft-deleted addresses, unlike
   * `addresses` above; see `fetchAddressUsageCounts`'s doc comment.
   */
  const [usageCounts, setUsageCounts] = useState<AddressUsageCounts>({
    totalAddressesCount: 0,
    otherContactsCount: 0,
  });
  /**
   * Which addresses have ever actually been used in a submitted job (added
   * 2026-09-01) - see `fetchAddressIdsWithJobs`'s doc comment. Backs
   * `ChooseAddressStep`'s contact-field lock UI.
   */
  const [addressIdsWithJobs, setAddressIdsWithJobs] = useState<Set<string>>(new Set());
  /** Which saved address (by id) the current order will use - seeded to the default on load, changeable via `ChooseAddressStep`. */
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  /** The phone last sent a code, needed by `verifyOtp` - AuthenticationStep only exposes it via `onSendCode`'s argument. */
  const [pendingPhone, setPendingPhone] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  /** Remembered so "נסה שוב" on the submit-failed screen can retry the exact same call. */
  const [pendingProfileFields, setPendingProfileFields] = useState<NewUserDetailsValues | undefined>(
    undefined
  );
  /**
   * Which SLA the "job_created" screen promises (see `project-prd.md` §5
   * "Scheduled Job Matching," confirmed 2026-09-06) - set once, at the
   * moment `submitBooking` succeeds, from that same call's own
   * `recap.scheduledTime` vs. submission time; never recomputed from
   * `selectedDate`/`selectedHour` later, so it can't drift even if those
   * somehow changed before this phase's render (they don't, in practice -
   * nothing else in this component touches them once the sheet shows the
   * confirmation screen).
   */
  const [jobCreatedTier, setJobCreatedTier] = useState<"nearTerm" | "scheduled">("nearTerm");

  // Checked against both lists - the final pick could have come from
  // either `services` (an AI match, search box or "אחר") or
  // `categoryServices` (an ordinary Time Pill catalog pick).
  const selectedService =
    services.find((service) => service.id === selectedServiceId) ??
    categoryServices.find((service) => service.id === selectedServiceId) ??
    // Flow 4's `service_confirm` phase never populates `services`/
    // `categoryServices` (there's no matching/category-catalog step to
    // populate them) - this fallback resolves straight from the full
    // catalog prop instead, so `buildRecap`'s existing
    // `selectedService?.label_he` usage works for this flow too, with no
    // other change needed there.
    catalogServices.find((service) => service.id === selectedServiceId) ??
    null;
  /**
   * Derived directly from the `timeSelection` prop rather than copied into
   * state - it's stable for the whole sheet-open session (set once by
   * `ClientHomeScreen` before `open` flips true, cleared alongside it in
   * `handleCloseBooking`), so there's nothing to synchronize.
   */
  const isUrgentNow = timeSelection === "urgent_now";

  const reset = useCallback(() => {
    setPhase("loading");
    setHistory([]);
    setResolvedQuery("");
    setCategoryLabel(null);
    setServices([]);
    setCategoryServices([]);
    setSelectedServiceId(null);
    setDiagnosisServiceId(null);
    setSelectedCategoryId(null);
    setSelectedCategoryLabel(null);
    setCategoryOtherText("");
    setAnalyzingOther(false);
    setMatchSource("search");
    setMatchedCategoryDiffersFromSelection(false);
    setSelectedDate(null);
    setSelectedHour(null);
    setFlowNow(new Date());
    setNote("");
    setPhotos([]);
    setPendingPhone(null);
    setSubmitting(false);
    setPendingProfileFields(undefined);
    // `session`/`hasProfile`/`returningProfile`/`addresses`/`selectedAddressId`
    // deliberately survive a reset - they're device/profile-level, same
    // reasoning as `hasProfile` already not being cleared here (see
    // `checkAuth`'s doc comment): a second order in the same sheet-open
    // session shouldn't have to re-fetch what it already knows.
  }, []);

  /**
   * Loads a returning profile's name + saved addresses + cumulative cap
   * usage (Step 5/6's skip condition already established `hasProfile`; this
   * is what actually populates `ConfirmStep`'s recap for that population -
   * see `buildRecap`). Called once profile existence is confirmed
   * (`checkAuth`, `handleVerifyCode`) and again after every successful
   * submission (`submitBooking`) so the just-changed default/address
   * list/usage counts are reflected immediately if another order follows
   * in the same session.
   *
   * `ownPhone` is taken as a parameter (not read from `session` state)
   * because every call site already has the just-resolved session/phone in
   * hand at the moment it calls this - avoids a stale closure over `session`
   * from this `useCallback`'s empty dependency array.
   */
  const loadReturningProfile = useCallback(async (userId: string, ownPhone?: string | null) => {
    const [profile, userAddresses, counts, usedAddressIds] = await Promise.all([
      fetchUserBasicProfile(userId),
      fetchUserAddresses(userId),
      fetchAddressUsageCounts(userId, ownPhone),
      fetchAddressIdsWithJobs(userId),
    ]);
    setReturningProfile(profile);
    setAddresses(userAddresses);
    setUsageCounts(counts);
    setAddressIdsWithJobs(usedAddressIds);
    const defaultAddress = userAddresses.find((address) => address.is_default) ?? userAddresses[0] ?? null;
    setSelectedAddressId(defaultAddress?.id ?? null);
    // Returned (added 2026-09-03) so a caller deciding whether to route
    // through `choose_address` first (see "More than one saved address"
    // below) doesn't have to wait a render cycle for `addresses` state to
    // reflect what was just fetched.
    return userAddresses;
  }, []);

  /**
   * Re-fetches just the address-book slice of `loadReturningProfile` above
   * (added 2026-09-01, alongside immediate persistence) - called right
   * after `add_address`/`update_address` succeeds, so `addresses`/
   * `usageCounts`/`addressIdsWithJobs` reflect the just-saved change
   * immediately. Deliberately does NOT touch `returningProfile` or
   * `selectedAddressId` - unlike `loadReturningProfile`, this never runs at
   * the start of a session, only mid-flow after a save, and the caller
   * (`onSaveNewAddress`/`onSaveEdit` below) decides what `selectedAddressId`
   * should become next, not this helper.
   */
  const refreshAddressBook = useCallback(async (userId: string, ownPhone?: string | null) => {
    const [userAddresses, counts, usedAddressIds] = await Promise.all([
      fetchUserAddresses(userId),
      fetchAddressUsageCounts(userId, ownPhone),
      fetchAddressIdsWithJobs(userId),
    ]);
    setAddresses(userAddresses);
    setUsageCounts(counts);
    setAddressIdsWithJobs(usedAddressIds);
  }, []);

  /** Advance to a new phase, remembering the phase being left so "הקודם" can return to it. */
  const advanceTo = (nextPhase: SheetPhase) => {
    setHistory((h) => [...h, phase]);
    setPhase(nextPhase);
  };

  /**
   * Pops one entry and shows it - except a historical `"authentication"`
   * entry once `session` is already set, which gets skipped straight
   * through to whatever's under it. Without this, going back from
   * `NewUserDetailsStep`/`ConfirmStep` after verifying would
   * re-render `AuthenticationStep` from scratch (it unmounted, so its
   * local `phone`/`codeSent`/`code` state is gone) as a blank, unverified-
   * looking phone form - misleading, since the user already has a valid
   * session at that point - and inconsistent with forward navigation,
   * which already skips straight past "authentication" once `session`
   * exists (see `handleAttachmentsNext`). This is what caused the step to
   * "sometimes" reappear on the way back: whether it did depended only on
   * how many Previous taps it took to reach it, not on whether it was
   * actually still relevant.
   */
  const handlePrevious = () => {
    setHistory((h) => {
      let remaining = h;
      let target: SheetPhase | undefined;
      while (remaining.length > 0) {
        target = remaining[remaining.length - 1];
        remaining = remaining.slice(0, -1);
        if (target === "authentication" && session) continue;
        break;
      }
      if (target !== undefined) setPhase(target);
      return remaining;
    });
  };

  /**
   * Returns from `choose_address` to `confirm` (added 2026-09-03,
   * alongside routing a more-than-one-saved-address returning profile
   * through this screen before `confirm` is ever shown - see "More than
   * one saved address" below). Two different situations land on this
   * screen, needing opposite `history` handling to keep "הקודם" correct
   * either way:
   *   - Reached via `ConfirmStep`'s "שנה כתובת" - `confirm` is already the
   *     entry directly beneath this one on `history`, so pop back to it
   *     with `handlePrevious()`, exactly as before "שנה כתובת" existed.
   *   - Reached as a genuine forward step (multiple saved addresses,
   *     right after authentication/attachments, `confirm` never shown
   *     yet this order) - `advanceTo("confirm")` instead, a real forward
   *     move that leaves `choose_address` (and everything beneath it) on
   *     `history` for "הקודם" to unwind correctly afterward.
   */
  const finishChooseAddress = () => {
    if (history[history.length - 1] === "confirm") {
      handlePrevious();
    } else {
      advanceTo("confirm");
    }
  };

  /**
   * Whether `reset()` has already run for the *current* `open` session
   * (fixed 2026-09-07, was a `react-hooks/set-state-in-effect` error on
   * both effects below calling `reset()` directly in their body). Flips
   * back to `false` the render after `open` becomes `false`, so
   * re-opening - even with the exact same `query`/`timeSelection` as last
   * time - reliably resets again, matching the old effect-based
   * version's actual behavior (its dependency arrays included `open`
   * itself, so they re-ran on every open regardless of whether `query`/
   * `timeSelection` had actually changed from last time).
   *
   * Calling `reset()` here - during render, guarded so it only fires once
   * per open session - rather than inside a `useEffect`, follows react.
   * dev's documented "Resetting all state when a prop changes" pattern:
   * effects are for synchronizing with external systems, and an
   * unconditional prop-driven state reset isn't one - only `runMatch`'s
   * actual network request below still needs its own effect.
   */
  const [hasInitializedEntry, setHasInitializedEntry] = useState(false);
  if (!open && hasInitializedEntry) {
    setHasInitializedEntry(false);
  }
  if (open && !hasInitializedEntry && (query?.trim() || timeSelection || categoryId || serviceId)) {
    setHasInitializedEntry(true);
    reset();
    if (timeSelection) {
      // Flow 2 (Time Pill) needs no fetch, unlike the search path below -
      // `categories`/`catalogServices` are already-loaded props - so this
      // jumps straight to `CategoryStep`.
      setPhase("category");
    } else if (categoryId) {
      // Flow 3 (Category Card, added 2026-09-07) - same synchronous
      // half `handleCategoryNext` does (everything except the async
      // diagnosis-placeholder fetch, which can't run here - see the
      // dedicated effect below for that half, mirroring `runMatch`'s own
      // split between this render-time guard and its effect). Leaves
      // `phase` at "loading" until that effect lands on
      // `category_service` - there's no Step 1 to show first in this
      // flow, so nothing else needs to render in between.
      setSelectedCategoryId(categoryId);
      const category = categories.find((cat) => cat.id === categoryId);
      setCategoryLabel(category?.label_he ?? null);
      setSelectedCategoryLabel(category?.label_he ?? null);
      setCategoryServices(catalogServices.filter((service) => service.category_id === categoryId));
    } else if (serviceId) {
      // Flow 4 (Service Pill, added 2026-09-07) - fully synchronous,
      // unlike Flow 3's `categoryId` branch above: every service in
      // `catalogServices` is already `is_active = true` and never a
      // diagnosis placeholder (see `services.ts`'s doc comment -
      // placeholders are deliberately excluded from this list), so
      // there's nothing further to fetch, the service is always fully
      // real and priced. Lands directly on `service_confirm`, skipping
      // both `category`/`category_service` entirely.
      const service = catalogServices.find((s) => s.id === serviceId);
      setSelectedServiceId(serviceId);
      setCategoryLabel(service?.category?.label_he ?? null);
      setSelectedCategoryLabel(service?.category?.label_he ?? null);
      setPhase("service_confirm");
    }
  }

  /**
   * Flow 3 entry (Category Card, added 2026-09-07) - the async half of
   * the render-time guard above (`fetchDiagnosisPlaceholderServiceId`
   * can't run there, same reasoning as `runMatch`'s fetch below).
   * Mirrors `handleCategoryNext`'s own diagnosis-placeholder fetch
   * exactly, just landing directly on `category_service` instead of
   * `advanceTo`-ing there from `category` - there's no Step 1 in this
   * flow to advance from, and `advanceTo` would incorrectly push
   * whatever phase preceded this ("loading") onto `history`.
   */
  useEffect(() => {
    if (!open || !categoryId) return;
    // Narrowed into a local const - TS doesn't carry the guard above's
    // narrowing into `loadCategory`'s closure otherwise (`categoryId`
    // stays typed `string | null` there).
    const currentCategoryId = categoryId;
    let cancelled = false;

    async function loadCategory() {
      const placeholderId = await fetchDiagnosisPlaceholderServiceId(currentCategoryId);
      if (cancelled) return;
      setDiagnosisServiceId(placeholderId);
      setPhase("category_service");
    }

    void loadCategory();
    return () => {
      cancelled = true;
    };
  }, [open, categoryId]);

  useEffect(() => {
    if (!open || !query?.trim()) return;

    let cancelled = false;

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
          const placeholderId = data.categoryId
            ? await fetchDiagnosisPlaceholderServiceId(data.categoryId)
            : null;
          if (cancelled) return;
          setDiagnosisServiceId(placeholderId);
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
  }, [open, query]);

  // Step 5's skip condition - independent of the search/scheduling draft
  // above, so it's checked once per sheet open rather than per query.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function checkAuth() {
      const currentSession = await getBookingSession();
      if (cancelled) return;
      setSession(currentSession);

      if (!currentSession) {
        setHasProfile(false);
        return;
      }
      const profileExists = await hasUserProfile(currentSession.user.id);
      if (cancelled) return;
      setHasProfile(profileExists);
      if (profileExists) {
        await loadReturningProfile(currentSession.user.id, currentSession.user.phone);
      }
    }

    void checkAuth();
    return () => {
      cancelled = true;
    };
  }, [open, loadReturningProfile]);

  const handleClose = () => {
    onClose();
    reset();
  };

  /**
   * Advances past service selection into Scheduling (Step 3) - except for
   * the "urgent_now" Time Pill entry (added 2026-09-06), which pre-selects
   * "now" and skips Step 3 entirely (per `client-booking-flow-prd.md` §3
   * "Entry Point Mapping"): `selectedDate`/`selectedHour` simply stay
   * `null`, so `buildRecap`'s `scheduledTime` falls back to `new Date()`
   * (submission time) on its own - no separate "is now" flag needed, and
   * `submitBooking`'s SLA-tier check already treats a `scheduledTime` this
   * close to `flowNow` as the near-term tier for free (see that function).
   * Shared by every path that reaches Scheduling: `handleNext` (Flow 1,
   * AI-matched services) and `handleContinueWithoutPrice`/
   * `handleCategoryServiceNext` below (both "no priced service, continue
   * anyway" and Flow 2's ordinary service pick).
   */
  const advanceToScheduling = () => {
    advanceTo(isUrgentNow ? "attachments" : "scheduling_date");
  };

  /**
   * `ServiceConfirmStep`'s onNext (Flow 4, added 2026-09-07) - nothing left
   * to select at this point (both service and category were already known
   * from the pill tapped on Home), so this just advances straight to
   * Scheduling like every other path's service-selection step does.
   * `isUrgentNow` is correctly always `false` here (`timeSelection` is
   * null for this entry), so this always lands on `scheduling_date`, never
   * the urgent-now shortcut - matching the PRD's Flow 4 row.
   */
  const handleServiceConfirmNext = () => {
    advanceToScheduling();
  };

  const handleNext = (selectionId: string) => {
    setSelectedServiceId(selectionId);

    if (selectionId === NO_MATCH_OPTION_ID) {
      // Distinct from "no_professionals": the matcher DID find a
      // category/services to show here - the user just said none of the
      // shown pills fit, so the message points them at rephrasing instead
      // of implying there are no professionals in this field at all.
      advanceTo("no_service_match");
      return;
    }

    advanceToScheduling();
  };

  const handleContinueWithoutPrice = () => {
    advanceToScheduling();
  };

  /**
   * Step 1 → Step 2 for the Time Pill entry (Flow 2, added 2026-09-06) -
   * `CategoryStep`'s onNext. Filters the already-loaded `catalogServices`
   * prop down to the picked category into `categoryServices` (its own
   * state, deliberately distinct from `services` - see that state's doc
   * comment for why sharing one variable used to be a real bug) and
 * resolves that category's diagnosis-priced placeholder up front -
 * needed only if the "אחר" field's AI classification comes back
 * "category known without priced service", fetched here rather than
 * there so that screen's own Next handler stays sync. Also clears
 * `categoryOtherText`/`selectedServiceId` first if `categoryId` differs
 * from whatever was previously selected (added 2026-09-07) - see
 * `categoryOtherText`'s own doc comment.
 */
  const handleCategoryNext = async (categoryId: string) => {
    if (categoryId !== selectedCategoryId) {
      // A genuinely *different* category than whatever was picked before
      // (added 2026-09-07) - `CategoryServiceStep`'s own draft (a typed
      // "אחר" description, or a selected service pill) belonged to the
      // old category's context and shouldn't silently carry over into
      // this new one. Re-picking the *same* category is deliberately left
      // alone - `initialSelectedId`/`initialOtherText` below still
      // restore exactly as before in that case.
      setCategoryOtherText("");
      setSelectedServiceId(null);
    }
    setSelectedCategoryId(categoryId);
    const category = categories.find((cat) => cat.id === categoryId);
    // Both set to the same value here, then diverge only if the "אחר"
    // field later reclassifies (see `handleCategoryOtherNext`, which
    // overwrites `categoryLabel` alone) - for an ordinary catalog pill
    // pick, the category never changes, so both stay in sync and
    // `categoryLabel` is already correct for `buildRecap` without either
    // `handleCategoryServiceNext` or `buildRecap` needing to know which
    // case they're in.
    setCategoryLabel(category?.label_he ?? null);
    setSelectedCategoryLabel(category?.label_he ?? null);
    setCategoryServices(catalogServices.filter((service) => service.category_id === categoryId));
    const placeholderId = await fetchDiagnosisPlaceholderServiceId(categoryId);
    setDiagnosisServiceId(placeholderId);
    advanceTo("category_service");
  };

  /** Step 2's onNext for the Time Pill entry - an ordinary catalog service pick. */
  const handleCategoryServiceNext = (selectionId: string) => {
    setSelectedServiceId(selectionId);
    advanceToScheduling();
  };

  /**
   * `CategoryServiceStep`'s "אחר" field onNext (reworked 2026-09-06 from a
   * plain `NO_MATCH_OPTION_ID` pill into a typed free-text description,
   * per product decision - see that component's doc comment). Runs the
   * *exact same* AI classification `runMatch` uses for the search box,
   * against the same closed catalog, then routes to whichever of
   * `match`/`no_price_yet`/`no_professionals`/`error` its outcome implies -
   * there is no fourth "the customer picked this category directly"
   * variant anymore: once free text is being classified by the matcher,
   * "זיהינו ש..." is accurate regardless of entry point (see
   * `BookingMessageStep`'s doc comment).
   */
  const handleCategoryOtherNext = async (description: string) => {
    setCategoryOtherText(description);
    setMatchSource("categoryOther");
    setAnalyzingOther(true);
    try {
      const response = await fetch("/api/ai/match-services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: description }),
      });
      const data = (await response.json()) as MatchApiResponse;
      if (!response.ok) {
        advanceTo("error");
        return;
      }
      setResolvedQuery(data.query);
      setCategoryLabel(data.categoryLabel);
      setMatchedCategoryDiffersFromSelection(
        Boolean(data.categoryId && selectedCategoryId && data.categoryId !== selectedCategoryId),
      );
      // Cleared on every classification (not just the first): the "אחר"
      // field can be re-submitted more than once per sheet session (edit
      // the text on "הקודם", press "הבא" again), unlike `runMatch`'s
      // one-shot search-box entry - without this, a stale id from a
      // previous pass' `services` list could silently pre-satisfy
      // `SearchMatchStep`'s `canContinue` against a list that no longer
      // contains it.
      setSelectedServiceId(null);

      if (data.outcome === "services") {
        setServices(data.matches.map((match) => match.service));
        advanceTo("match");
        return;
      }
      if (data.outcome === "category_without_priced_service") {
        const placeholderId = data.categoryId
          ? await fetchDiagnosisPlaceholderServiceId(data.categoryId)
          : null;
        setDiagnosisServiceId(placeholderId);
        advanceTo("no_price_yet");
        return;
      }
      advanceTo("no_professionals");
    } catch {
      advanceTo("error");
    } finally {
      setAnalyzingOther(false);
    }
  };

  const handleDateSelected = (date: Date) => {
    // A previously-picked hour may not be valid for a newly-picked date
    // (e.g. Friday's shorter working hours) - only carry it forward when
    // the date is unchanged (the common "just going back and forth" case).
    if (!selectedDate || selectedDate.getTime() !== date.getTime()) {
      setSelectedHour(null);
    }
    setSelectedDate(date);
    // Only possible for today (incl. today being Friday) - the 1-hour lead
    // time can push its slot list to empty; every other date always has a
    // full day of slots. Caught here (not inside SchedulingHourStep) so the
    // dead end never renders as a Pills row with nothing in it.
    advanceTo(getHourSlots(date, flowNow).length > 0 ? "scheduling_hour" : "no_slots_for_date");
  };

  const handleScheduled = (scheduledTime: Date) => {
    setSelectedHour(scheduledTime.getHours());
    advanceTo("attachments");
  };

  /**
   * Builds the read-only recap for the (single, shared) `ConfirmStep`.
   * Assumes scheduling already happened - true for every phase that can
   * reach this (attachments onward) - and defensively falls back rather
   * than throwing if that's somehow not the case. Reads `note`/`photos`
   * state directly - safe because `Confirm` is only ever reached one
   * render after `handleAttachmentsNext` commits them (it never reads this
   * mid-keystroke), unlike the old design where Attachments/Authentication
   * could themselves be the submit screen and needed the just-typed values
   * before their own `setNote`/`setPhotos` calls had committed.
   *
   * `categoryLabel` (state) is the broad matched professional category and
   * is always known by this point regardless of path; `selectedService` -
   * the specific priced service - is only known for the normal "services"
   * match outcome, not the "no_price_yet" one (category matched, no priced
   * catalog row), which is why `serviceLabel` below can be absent (see its
   * doc comment on `OrderRecapProps`).
   *
   * `profileFields` is only passed for the new-phone population - it
   * appends the just-entered name/address as `OrderRecapProps.profile` (see
   * that prop's doc comment). For the other two populations (session+
   * profile complete, or just-verified with an existing profile),
   * `returningProfile`/`addresses` (loaded by `loadReturningProfile`) fill
   * the same `profile` slot instead, so every population now sees its name
   * + address on `ConfirmStep`, not just the brand-new one.
   */
  const buildRecap = (profileFields?: NewUserDetailsValues): OrderRecapProps => {
    // The `roundUrgentNowScheduledTime` fallback only ever applies to
    // "urgent now" (the only path that reaches `buildRecap` with both
    // `selectedDate`/`selectedHour` still null - see `advanceToScheduling`).
    // Rounds `flowNow` (frozen at sheet-open, not a fresh `new Date()`) so
    // this stays stable across re-renders of the Confirm screen and
    // matches exactly what `submitBooking`'s own `buildRecap` call below
    // sends to `submit_booking` - see that function's doc comment for why
    // a floor/no-rounding fallback would be wrong here.
    const scheduledTime = selectedDate ? new Date(selectedDate) : roundUrgentNowScheduledTime(flowNow);
    if (selectedHour !== null) scheduledTime.setHours(selectedHour, 0, 0, 0);

    // Always already fully up to date (added/edited addresses persist
    // immediately via `add_address`/`update_address`, refreshed into
    // `addresses` by `refreshAddressBook` the moment either succeeds) - no
    // separate staged-edit/staged-new-address merge is needed here anymore
    // (removed 2026-09-01; see this component's doc comment).
    const effectiveAddress = addresses.find((address) => address.id === selectedAddressId) ?? null;
    const profile = profileFields
      ? {
          fullName: `${profileFields.firstName} ${profileFields.lastName}`.trim(),
          addressLine: formatAddressLine(profileFields),
        }
      : returningProfile
        ? {
            fullName: `${returningProfile.firstName} ${returningProfile.lastName}`.trim(),
            addressLine: effectiveAddress ? formatSavedAddressLine(effectiveAddress) : "",
            contactName: effectiveAddress?.contact_name,
            contactPhone: effectiveAddress?.contact_phone,
          }
        : undefined;

    return {
      categoryLabel: categoryLabel ?? "",
      serviceLabel: selectedService?.label_he ?? null,
      priceMin: selectedService?.price_min ?? 0,
      priceMax: selectedService?.price_max ?? 0,
      // "no_price_yet" path has no selectedService - "price after
      // inspection" is the honest fallback for that population, same as a
      // real diagnosis-priced service.
      pricingType: selectedService?.pricing_type ?? "diagnosis",
      scheduledTime,
      hasNote: note.trim().length > 0,
      photosCount: photos.length,
      profile,
    };
  };

  /**
   * Submission (client-booking-flow-prd.md "Submission"): atomically
   * creates the profile/address (only when `profileFields` is provided -
   * the New User Details population) and the Job via the `submit_booking`
   * Postgres RPC (see `supabase/sql/booking_flow_auth.sql`).
   *
   * The "no_price_yet" population (category matched, no priced catalog
   * row) has no `selectedServiceId` - `diagnosisServiceId` (the category's
   * placeholder service, resolved in `runMatch`) satisfies `jobs.service_id`
   * for that population instead. Fixed 2026-08-21 - see
   * `supabase/sql/diagnosis_placeholder_services.sql`.
   *
   * `p_address_id` (added 2026-08-23, see `supabase/sql/address_book.sql`)
   * is only sent for a returning profile - simplified 2026-09-01, alongside
   * immediate persistence: by the time `ConfirmStep` is reached, any new or
   * edited address has already been saved via `add_address`/`update_address`
   * (see `onSaveNewAddress`/`onSaveEdit` below), so `selectedAddressId`
   * always already points at a real, fully-formed row - `submit_booking`
   * no longer needs to create or edit anything for a returning profile,
   * only look it up.
   */
  const submitBooking = async (profileFields?: NewUserDetailsValues) => {
    setPendingProfileFields(profileFields);
    setSubmitting(true);

    const recap = buildRecap(profileFields);
    const cityLabel = profileFields ? (CITIES.find((city) => city.value === profileFields.city)?.label ?? null) : null;
    // Near-term tier threshold: 2 hours - see `project-prd.md` §5 "Scheduled
    // Job Matching." Computed from this same call's `recap.scheduledTime`
    // against `flowNow` (frozen per session, see its own doc comment above)
    // rather than a fresh `Date.now()`/`new Date()` call here - consistent
    // with this file's one other "now" usage (`handleDateSelected`'s
    // `getHourSlots(date, flowNow)`), and avoids the impure-call-in-render
    // lint rule that a raw `Date.now()` trips even inside an event handler
    // closure like this one.
    const tier: "nearTerm" | "scheduled" =
      recap.scheduledTime.getTime() - flowNow.getTime() < 2 * 60 * 60 * 1000 ? "nearTerm" : "scheduled";

    try {
      // `data` is the new job's id (`submit_booking returns uuid`) - added
      // 2026-09-08 for photo persistence (Phase 3) below; previously
      // discarded entirely since nothing needed it yet.
      const { data: jobId, error } = await supabase.rpc("submit_booking", {
        p_service_id: selectedServiceId ?? diagnosisServiceId,
        p_scheduled_time: recap.scheduledTime.toISOString(),
        p_notes: note.trim() || null,
        p_first_name: profileFields?.firstName ?? null,
        p_last_name: profileFields?.lastName ?? null,
        p_city: cityLabel,
        p_street: profileFields?.street ?? null,
        p_building_number: profileFields?.buildingNumber ?? null,
        p_apartment: profileFields?.apartment || null,
        p_entrance_code: profileFields?.entranceCode || null,
        p_address_id: profileFields ? null : selectedAddressId,
      });

      if (error) {
        console.error("submit_booking error:", error);
        setPhase("submit_failed");
        return;
      }

      if (profileFields) {
        setHasProfile(true);
      }
      // Refreshes name/addresses (new default, or a newly-added address)
      // in case another order follows in this same sheet-open session -
      // see `loadReturningProfile`'s doc comment.
      if (session) {
        void loadReturningProfile(session.user.id, session.user.phone);
      }
      // Photo persistence (Phase 3, 2026-09-08) - fire-and-forget: per
      // `uploadJobAttachments`'s doc comment, a photo upload hiccup must
      // not block reaching "job created" for an already-successfully-
      // created job. Requires `supabase/sql/job_attachments.sql` to have
      // been run manually first (bucket/table/RLS).
      if (jobId && photos.length > 0) {
        void uploadJobAttachments(supabase, jobId, photos);
      }
      setJobCreatedTier(tier);
      setPhase("job_created");
    } catch (err) {
      console.error("submit_booking threw:", err);
      setPhase("submit_failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAttachmentsNext = (noteValue: string, photosValue: File[]) => {
    setNote(noteValue);
    setPhotos(photosValue);

    if (session && hasProfile) {
      // More than one saved address (confirmed 2026-09-03 - counts every
      // saved address, even one only saved and never yet submitted with
      // an order): route through the picker first rather than silently
      // reusing whichever one happens to be `is_default` - a customer who
      // doesn't carefully read `ConfirmStep`'s address line could easily
      // send an order to the wrong place without ever meaning to. Exactly
      // one address is still a non-choice, so it goes straight to
      // `confirm` as before.
      advanceTo(addresses.length > 1 ? "choose_address" : "confirm");
      return;
    }

    advanceTo(session ? "new_user_details" : "authentication");
  };

  const handleSendCode = async (phone: string): Promise<string | null> => {
    // `signInWithOtp` can both return `{ error }` (e.g. phone auth/SMS
    // provider not configured in Supabase) and throw (network-level
    // failures) - both must degrade to the same inline error, never an
    // uncaught rejection.
    try {
      const { error } = await supabase.auth.signInWithOtp({ phone });
      if (error) {
        console.error("signInWithOtp error:", error);
        return COPY.bookingFlow.authentication.errorSendFailed;
      }
      setPendingPhone(phone);
      return null;
    } catch (err) {
      console.error("signInWithOtp threw:", err);
      return COPY.bookingFlow.authentication.errorSendFailed;
    }
  };

  const handleVerifyCode = async (code: string): Promise<string | null> => {
    if (!pendingPhone) {
      return COPY.bookingFlow.authentication.errorSendFailed;
    }

    try {
      const { error } = await supabase.auth.verifyOtp({
        phone: pendingPhone,
        token: code,
        type: "sms",
      });

      if (error) {
        console.error("verifyOtp error:", error);
        return error.message?.toLowerCase().includes("expired")
          ? COPY.bookingFlow.authentication.errorExpiredCode
          : COPY.bookingFlow.authentication.errorInvalidCode;
      }

      const newSession = await getBookingSession();
      setSession(newSession);
      if (!newSession) {
        return COPY.bookingFlow.authentication.errorInvalidCode;
      }

      const profileExists = await hasUserProfile(newSession.user.id);
      setHasProfile(profileExists);
      // `userAddresses` (the just-fetched array, not `addresses` state -
      // see `loadReturningProfile`'s doc comment) decides whether to
      // route through `choose_address` first - same "more than one saved
      // address" rule as `handleAttachmentsNext` above.
      const userAddresses = profileExists
        ? await loadReturningProfile(newSession.user.id, newSession.user.phone)
        : [];
      advanceTo(!profileExists ? "new_user_details" : userAddresses.length > 1 ? "choose_address" : "confirm");
      return null;
    } catch (err) {
      console.error("verifyOtp threw:", err);
      return COPY.bookingFlow.authentication.errorInvalidCode;
    }
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

      {phase === "no_service_match" ? (
        <BookingMessageStep
          kind="noServiceMatch"
          onPrimaryAction={handleClose}
          onPrevious={history.length > 0 ? handlePrevious : undefined}
        />
      ) : null}

      {phase === "no_price_yet" ? (
        <BookingMessageStep
          kind="noPriceYet"
          categoryLabel={categoryLabel}
          onPrimaryAction={handleContinueWithoutPrice}
          onPrevious={history.length > 0 ? handlePrevious : undefined}
        />
      ) : null}

      {phase === "category" ? (
        <CategoryStep
          categories={categories}
          urgent={isUrgentNow}
          onNext={(categoryId) => void handleCategoryNext(categoryId)}
          initialSelectedId={selectedCategoryId}
          onPrevious={history.length > 0 ? handlePrevious : undefined}
        />
      ) : null}

      {phase === "category_service" ? (
        <CategoryServiceStep
          categoryLabel={selectedCategoryLabel ?? ""}
          services={categoryServices}
          onNext={handleCategoryServiceNext}
          onOtherNext={(description) => void handleCategoryOtherNext(description)}
          analyzing={analyzingOther}
          // Guarded (not a bare `selectedServiceId`) because that id could
          // belong to a *different* category's service picked on
          // `SearchMatchStep` after an "אחר" reclassification landed on a
          // different category than this one - restoring it here would
          // silently pre-select nothing visible while still counting as
          // "selected" for `canContinue`.
          initialSelectedId={categoryServices.some((service) => service.id === selectedServiceId) ? selectedServiceId : null}
          initialOtherText={categoryOtherText}
          onPrevious={history.length > 0 ? handlePrevious : undefined}
        />
      ) : null}

      {phase === "service_confirm" && selectedService ? (
        <ServiceConfirmStep
          categoryLabel={selectedCategoryLabel ?? ""}
          service={selectedService}
          onNext={handleServiceConfirmNext}
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

      {phase === "no_slots_for_date" ? (
        <BookingMessageStep kind="noSlotsForDate" onPrimaryAction={handlePrevious} />
      ) : null}

      {phase === "scheduling_hour" && selectedDate ? (
        <SchedulingHourStep
          date={selectedDate}
          now={flowNow}
          initialHour={selectedHour}
          onNext={handleScheduled}
          onPrevious={history.length > 0 ? handlePrevious : undefined}
        />
      ) : null}

      {phase === "attachments" ? (
        <AttachmentsStep
          initialNote={note}
          initialPhotos={photos}
          onNext={handleAttachmentsNext}
          onPrevious={history.length > 0 ? handlePrevious : undefined}
          onDraftChange={(noteValue, photosValue) => {
            setNote(noteValue);
            setPhotos(photosValue);
          }}
        />
      ) : null}

      {phase === "authentication" ? (
        <AuthenticationStep
          onSendCode={handleSendCode}
          onVerifyCode={handleVerifyCode}
          onPrevious={history.length > 0 ? handlePrevious : undefined}
        />
      ) : null}

      {phase === "new_user_details" ? (
        <NewUserDetailsStep
          onNext={(values) => {
            setPendingProfileFields(values);
            advanceTo("confirm");
          }}
          initialValues={pendingProfileFields}
          onPrevious={history.length > 0 ? handlePrevious : undefined}
        />
      ) : null}

      {phase === "confirm" ? (
        <ConfirmStep
          recap={{
            ...buildRecap(pendingProfileFields),
            // Only offered once there's an actual saved address to switch
            // between/add to - a brand-new profile this same session has
            // none yet (its one address is still just-typed, unsaved).
            onChangeAddress: addresses.length > 0 ? () => advanceTo("choose_address") : undefined,
          }}
          onSubmit={() => void submitBooking(pendingProfileFields)}
          submitting={submitting}
          onPrevious={history.length > 0 ? handlePrevious : undefined}
        />
      ) : null}

      {phase === "choose_address" ? (
        <ChooseAddressStep
          addresses={addresses}
          selection={selectedAddressId ?? "new"}
          ownPhone={session?.user.phone}
          ownName={returningProfile ? `${returningProfile.firstName} ${returningProfile.lastName}`.trim() : undefined}
          ownFirstName={returningProfile?.firstName}
          ownLastName={returningProfile?.lastName}
          addressIdsWithJobs={addressIdsWithJobs}
          usageCounts={usageCounts}
          onChooseExisting={(addressId) => {
            setSelectedAddressId(addressId);
            finishChooseAddress();
          }}
          onSaveNewAddress={async (values) => {
            if (!session) return COPY.bookingFlow.chooseAddress.addAddressError;
            const cityLabel = CITIES.find((city) => city.value === values.city)?.label ?? null;
            const { data, error } = await supabase.rpc("add_address", {
              p_city: cityLabel,
              p_street: values.street,
              p_building_number: values.buildingNumber,
              p_apartment: values.apartment || null,
              p_entrance_code: values.entranceCode || null,
              p_contact_name: values.contactName || null,
              p_contact_phone: values.contactPhone || null,
            });
            if (error || !data) {
              console.error("add_address error:", error);
              return COPY.bookingFlow.chooseAddress.addAddressError;
            }
            await refreshAddressBook(session.user.id, session.user.phone);
            // Points straight at the just-created row - this is also what
            // fixes the "עדכן כתובת from ConfirmStep lands on a blank form"
            // bug: `selection` above simplifies to `selectedAddressId`, and
            // a just-saved address is now a real row `ChooseAddressStep`
            // can select in its list, not a staged draft with nowhere to
            // reopen into.
            setSelectedAddressId(data as string);
            finishChooseAddress();
            return null;
          }}
          onSaveEdit={async (addressId, values) => {
            if (!session) return COPY.bookingFlow.chooseAddress.updateAddressError;
            const cityLabel = CITIES.find((city) => city.value === values.city)?.label ?? null;
            const { error } = await supabase.rpc("update_address", {
              p_address_id: addressId,
              p_city: cityLabel,
              p_street: values.street,
              p_building_number: values.buildingNumber,
              p_apartment: values.apartment || null,
              p_entrance_code: values.entranceCode || null,
              p_contact_name: values.contactName || null,
              p_contact_phone: values.contactPhone || null,
            });
            if (error) {
              console.error("update_address error:", error);
              return COPY.bookingFlow.chooseAddress.updateAddressError;
            }
            await refreshAddressBook(session.user.id, session.user.phone);
            setSelectedAddressId(addressId);
            // No `handlePrevious()` here - the edit view's own footer
            // already moves itself back to list mode on success (see
            // `ChooseAddressStep`'s doc comment).
            return null;
          }}
          onPrevious={history.length > 0 ? handlePrevious : undefined}
        />
      ) : null}

      {phase === "job_created" ? (
        <BookingMessageStep kind="jobCreated" jobCreatedTier={jobCreatedTier} onPrimaryAction={handleClose} />
      ) : null}

      {phase === "submit_failed" ? (
        <BookingMessageStep
          kind="submitFailed"
          onPrimaryAction={() => void submitBooking(pendingProfileFields)}
          onPrevious={history.length > 0 ? handlePrevious : undefined}
        />
      ) : null}

      {phase === "match" ? (
        <SearchMatchStep
          query={resolvedQuery}
          categoryLabel={matchSource === "categoryOther" && !matchedCategoryDiffersFromSelection ? null : categoryLabel}
          services={services}
          onNext={handleNext}
          initialSelectedId={selectedServiceId}
          onPrevious={history.length > 0 ? handlePrevious : undefined}
          headingOverride={
            matchSource === "categoryOther"
              ? { heading: COPY.bookingFlow.categoryService.requestedServiceHeading, text: resolvedQuery }
              : undefined
          }
          professionLabelOverride={
            matchSource === "categoryOther" ? COPY.bookingFlow.categoryService.differentProfessionHeading : undefined
          }
        />
      ) : null}
    </BottomSheet>
  );
}
