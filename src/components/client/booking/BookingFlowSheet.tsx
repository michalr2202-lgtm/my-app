"use client";

import type { Session } from "@supabase/supabase-js";
import { useCallback, useEffect, useState } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import {
  SearchMatchStep,
  type SearchMatchServiceOption,
} from "@/components/client/booking/SearchMatchStep";
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
import { ChooseAddressStep, type AddressEditValues } from "@/components/client/booking/ChooseAddressStep";
import { ConfirmStep } from "@/components/client/booking/ConfirmStep";
import type { OrderRecapProps } from "@/components/client/booking/OrderRecap";
import { fetchUserBasicProfile, getBookingSession, hasUserProfile, type UserBasicProfile } from "@/lib/auth";
import { fetchDiagnosisPlaceholderServiceId } from "@/lib/queries/services";
import { fetchAddressUsageCounts, fetchUserAddresses, type AddressUsageCounts } from "@/lib/queries/addresses";
import { CITIES } from "@/lib/addresses";
import { COPY } from "@/lib/copy";
import { NO_MATCH_OPTION_ID, type MatchOutcomeKind } from "@/lib/ai/matchTypes";
import { getHourSlots } from "@/lib/scheduling";
import { supabase } from "@/lib/supabase";
import type { Address } from "@/lib/types";

type SheetPhase =
  | "loading"
  | "match"
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
  query: string | null;
  onClose: () => void;
}

/**
 * Human-readable one-line address for `OrderRecap.profile`. Takes
 * `AddressOnlyValues` (not full `NewUserDetailsValues`) so it also covers
 * `pendingNewAddress` (an existing profile adding a second address via
 * `ChooseAddressStep`) - `NewUserDetailsValues` satisfies this shape too,
 * so the brand-new-profile call site below is unaffected.
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
 * Search path: match priced services → pick (+ Next) → Scheduling (date → hour);
 * "אין התאמה" + Next → no-service-match message (distinct from the
 * no-professionals message below - the matcher DID find services to show,
 * the user just said none fit, so this points them at rephrasing instead);
 * matcher couldn't identify any category at all → no-professionals message;
 * category known without priced service → no-price-yet message → continue → Scheduling.
 * Scheduling (date, then hour, each its own screen; date → no_slots_for_date
 * instead of hour if today no longer has any 1-hour-lead-time slots left)
 * → Attachments (one screen, notes + photos both always visible - see
 * AttachmentsStep) → Authentication (Step 5, skipped if a session already
 * exists on this device) → New User Details (Step 6, skipped if the
 * verified/known phone already has a `public.users` profile) → Confirm
 * (Step 7, always the final screen for every path - see "Submission" in
 * that PRD). `session`/`hasProfile` below decide which of Attachments/
 * Authentication/New User Details ends up being the last *content* screen
 * before Confirm; see `buildRecap`/`submitBooking`. Confirm is the only
 * screen that ever renders `OrderRecap` or shows the `"שלח הזמנה"` button -
 * an earlier version rendered the recap inline at the bottom of whichever
 * of Attachments/Authentication was last, but that combined layout doesn't
 * reliably fit `BottomSheet`'s `max-h-[92dvh]` on every viewport (observed
 * 2026-08-21 as a scrollbar inside the sheet on a laptop), so every path
 * now always takes one extra step to a plain, guaranteed-to-fit Confirm
 * screen instead - see `ConfirmStep`'s doc comment.
 */
export function BookingFlowSheet({ open, query, onClose }: BookingFlowSheetProps) {
  const [phase, setPhase] = useState<SheetPhase>("loading");
  const [history, setHistory] = useState<SheetPhase[]>([]);
  const [resolvedQuery, setResolvedQuery] = useState("");
  const [categoryLabel, setCategoryLabel] = useState<string | null>(null);
  const [services, setServices] = useState<SearchMatchServiceOption[]>([]);
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
  /** All addresses the returning profile has saved (`ChooseAddressStep`'s list), most-recently-used first. */
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
  /** Which saved address (by id) the current order will use - seeded to the default on load, changeable via `ChooseAddressStep`. */
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  /**
   * A brand-new address staged for an *existing* profile via
   * `ChooseAddressStep`'s "add new" view - the returning-population
   * equivalent of `pendingProfileFields`'s address fields. Per-order draft
   * state, cleared by `reset()`.
   */
  const [pendingNewAddress, setPendingNewAddress] = useState<AddressOnlyValues | undefined>(undefined);
  /**
   * A staged edit of one of `addresses`' already-saved rows, via
   * `ChooseAddressStep`'s per-row "ערוך" link (added 2026-08-24) - mutually
   * exclusive with `pendingNewAddress` (editing an existing row vs. adding
   * one), same per-order-draft lifecycle. `buildingNumber`/`apartment`/
   * `entranceCode` are always staged here; `contactName`/`contactPhone` only
   * when the address being edited had no contact yet - see
   * `AddressEditValues`'s doc comment and `submit_booking`'s "Edit path"
   * comment for why.
   */
  const [pendingAddressEdit, setPendingAddressEdit] = useState<({ addressId: string } & AddressEditValues) | undefined>(
    undefined
  );
  /** The phone last sent a code, needed by `verifyOtp` - AuthenticationStep only exposes it via `onSendCode`'s argument. */
  const [pendingPhone, setPendingPhone] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  /** Remembered so "נסה שוב" on the submit-failed screen can retry the exact same call. */
  const [pendingProfileFields, setPendingProfileFields] = useState<NewUserDetailsValues | undefined>(
    undefined
  );

  const selectedService = services.find((service) => service.id === selectedServiceId) ?? null;

  const reset = useCallback(() => {
    setPhase("loading");
    setHistory([]);
    setResolvedQuery("");
    setCategoryLabel(null);
    setServices([]);
    setSelectedServiceId(null);
    setDiagnosisServiceId(null);
    setSelectedDate(null);
    setSelectedHour(null);
    setFlowNow(new Date());
    setNote("");
    setPhotos([]);
    setPendingPhone(null);
    setSubmitting(false);
    setPendingProfileFields(undefined);
    setPendingNewAddress(undefined);
    setPendingAddressEdit(undefined);
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
   * submission or address deletion (`submitBooking`, `handleDeleteAddress`)
   * so the just-changed default/address list/usage counts are reflected
   * immediately if another order follows in the same session.
   *
   * `ownPhone` is taken as a parameter (not read from `session` state)
   * because every call site already has the just-resolved session/phone in
   * hand at the moment it calls this - avoids a stale closure over `session`
   * from this `useCallback`'s empty dependency array.
   */
  const loadReturningProfile = useCallback(async (userId: string, ownPhone?: string | null) => {
    const [profile, userAddresses, counts] = await Promise.all([
      fetchUserBasicProfile(userId),
      fetchUserAddresses(userId),
      fetchAddressUsageCounts(userId, ownPhone),
    ]);
    setReturningProfile(profile);
    setAddresses(userAddresses);
    setUsageCounts(counts);
    const defaultAddress = userAddresses.find((address) => address.is_default) ?? userAddresses[0] ?? null;
    setSelectedAddressId(defaultAddress?.id ?? null);
    setPendingNewAddress(undefined);
    setPendingAddressEdit(undefined);
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
  }, [open, query, reset]);

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

    advanceTo("scheduling_date");
  };

  const handleContinueWithoutPrice = () => {
    advanceTo("scheduling_date");
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
    const scheduledTime = selectedDate ? new Date(selectedDate) : new Date();
    if (selectedHour !== null) scheduledTime.setHours(selectedHour, 0, 0, 0);

    const selectedAddress = addresses.find((address) => address.id === selectedAddressId) ?? null;
    // Reflects a staged-but-not-yet-submitted edit (`ChooseAddressStep`'s
    // "ערוך" link) immediately, same as `pendingNewAddress` already does
    // for a brand-new address - see `pendingAddressEdit`'s doc comment.
    // `contact_name`/`contact_phone` only ever come from the staged edit
    // when the address had none to begin with (see `AddressEditValues`'s
    // doc comment), so falling back to the saved value is always a no-op
    // in the one case it could otherwise overwrite something.
    const effectiveAddress =
      selectedAddress && pendingAddressEdit?.addressId === selectedAddress.id
        ? {
            ...selectedAddress,
            building_number: pendingAddressEdit.buildingNumber,
            apartment: pendingAddressEdit.apartment || null,
            entrance_code: pendingAddressEdit.entranceCode || null,
            contact_name: selectedAddress.contact_name ?? pendingAddressEdit.contactName ?? null,
            contact_phone: selectedAddress.contact_phone ?? pendingAddressEdit.contactPhone ?? null,
          }
        : selectedAddress;
    const profile = profileFields
      ? {
          fullName: `${profileFields.firstName} ${profileFields.lastName}`.trim(),
          addressLine: formatAddressLine(profileFields),
        }
      : returningProfile
        ? {
            fullName: `${returningProfile.firstName} ${returningProfile.lastName}`.trim(),
            addressLine: pendingNewAddress
              ? formatAddressLine(pendingNewAddress)
              : effectiveAddress
                ? formatSavedAddressLine(effectiveAddress)
                : "",
            contactName: pendingNewAddress ? pendingNewAddress.contactName : effectiveAddress?.contact_name,
            contactPhone: pendingNewAddress ? pendingNewAddress.contactPhone : effectiveAddress?.contact_phone,
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
   * is only sent when neither `profileFields` nor `pendingNewAddress` is
   * set - i.e. a returning profile reusing one of its already-saved
   * addresses rather than creating a new one via either path.
   *
   * `pendingAddressEdit` (added 2026-08-24) is the third case sharing that
   * same `p_address_id` slot: a returning profile reusing an existing
   * address but with `buildingNumber`/`apartment`/`entranceCode` staged
   * changes, and optionally a `contactName`/`contactPhone` filled in for
   * the first time (never city/street, and never a *replacement* contact -
   * see `AddressEditValues`'s doc comment). It's what makes
   * `p_building_number` non-null alongside `p_address_id`, which is
   * exactly the signal `submit_booking`'s "Edit path" branch keys off - see
   * that comment for the full server-side reasoning.
   */
  const submitBooking = async (profileFields?: NewUserDetailsValues) => {
    setPendingProfileFields(profileFields);
    setSubmitting(true);

    const recap = buildRecap(profileFields);
    const newAddressFields = profileFields ?? pendingNewAddress;
    const editingSelected =
      !newAddressFields && pendingAddressEdit?.addressId === selectedAddressId ? pendingAddressEdit : null;
    const cityLabel = newAddressFields
      ? (CITIES.find((city) => city.value === newAddressFields.city)?.label ?? null)
      : null;

    try {
      const { error } = await supabase.rpc("submit_booking", {
        p_service_id: selectedServiceId ?? diagnosisServiceId,
        p_scheduled_time: recap.scheduledTime.toISOString(),
        p_notes: note.trim() || null,
        p_first_name: profileFields?.firstName ?? null,
        p_last_name: profileFields?.lastName ?? null,
        p_city: cityLabel,
        p_street: newAddressFields?.street ?? null,
        p_building_number: newAddressFields?.buildingNumber ?? editingSelected?.buildingNumber ?? null,
        p_apartment: newAddressFields?.apartment || editingSelected?.apartment || null,
        p_entrance_code: newAddressFields?.entranceCode || editingSelected?.entranceCode || null,
        p_address_id: newAddressFields ? null : selectedAddressId,
        p_contact_name: pendingNewAddress?.contactName || editingSelected?.contactName || null,
        p_contact_phone: pendingNewAddress?.contactPhone || editingSelected?.contactPhone || null,
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
      setPhase("job_created");
    } catch (err) {
      console.error("submit_booking threw:", err);
      setPhase("submit_failed");
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Soft-deletes one saved address (added 2026-08-25, `ChooseAddressStep`'s
   * per-row trash icon - see `delete_address` in
   * supabase/sql/address_book.sql for the full reasoning). Refreshes the
   * address list/usage counts/default selection via `loadReturningProfile`
   * on success, same as after a submission - e.g. if the deleted row was
   * `is_default`, this immediately reflects whichever row `delete_address`
   * promoted in its place.
   */
  const handleDeleteAddress = async (addressId: string): Promise<string | null> => {
    if (!session) return COPY.bookingFlow.chooseAddress.deleteError;

    const { error } = await supabase.rpc("delete_address", { p_address_id: addressId });
    if (error) {
      console.error("delete_address error:", error);
      return COPY.bookingFlow.chooseAddress.deleteError;
    }

    await loadReturningProfile(session.user.id, session.user.phone);
    return null;
  };

  const handleAttachmentsNext = (noteValue: string, photosValue: File[]) => {
    setNote(noteValue);
    setPhotos(photosValue);

    if (session && hasProfile) {
      advanceTo("confirm");
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
      if (profileExists) {
        await loadReturningProfile(newSession.user.id, newSession.user.phone);
      }
      advanceTo(profileExists ? "confirm" : "new_user_details");
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
          selection={pendingNewAddress ? "new" : (selectedAddressId ?? "new")}
          pendingNewAddress={pendingNewAddress}
          pendingAddressEdit={pendingAddressEdit}
          ownPhone={session?.user.phone}
          usageCounts={usageCounts}
          onChooseExisting={(addressId) => {
            setSelectedAddressId(addressId);
            setPendingNewAddress(undefined);
            setPendingAddressEdit(undefined);
            handlePrevious();
          }}
          onSaveNewAddress={(values) => {
            setPendingNewAddress(values);
            setSelectedAddressId(null);
            setPendingAddressEdit(undefined);
            handlePrevious();
          }}
          onSaveEdit={(addressId, values) => {
            // No `handlePrevious()` here (added 2026-08-25) - the edit
            // view's own footer now manages returning to the list mode
            // itself (see ChooseAddressStep's doc comment); this only
            // stages the change for whenever the list/Confirm eventually do
            // exit.
            setPendingAddressEdit({ addressId, ...values });
            setSelectedAddressId(addressId);
            setPendingNewAddress(undefined);
          }}
          onDeleteAddress={handleDeleteAddress}
          onPrevious={history.length > 0 ? handlePrevious : undefined}
        />
      ) : null}

      {phase === "job_created" ? <BookingMessageStep kind="jobCreated" onPrimaryAction={handleClose} /> : null}

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
