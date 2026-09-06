"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { AddressFields, type AddressOnlyValues } from "@/components/client/booking/AddressFields";
import { BookingStepFooter } from "@/components/client/booking/BookingStepFooter";
import { Input } from "@/components/ui/Input";
import { COPY } from "@/lib/copy";
import { cn } from "@/lib/cn";
import type { Address } from "@/lib/types";
import type { AddressUsageCounts } from "@/lib/queries/addresses";
import { CITIES, MAX_OTHER_CONTACT_ADDRESSES, MAX_TOTAL_ADDRESSES, type NewUserCity } from "@/lib/addresses";
import { formatOwnPhoneForDisplay, phoneNumbersMatch } from "@/lib/phone";

/**
 * Everything `update_address` (`supabase/sql/address_book.sql`) can
 * change - see that function's comments for the exact lock rules:
 * `entranceCode` is always editable; every other filled field is freely
 * editable only until that value has gone out in a submitted job
 * (`city`/`street` freeze as a pair once the address has any job;
 * `buildingNumber`/`apartment`/`contactName`/`contactPhone` lock
 * per-value, including clearing the latter two / apartment back to blank
 * while still unlocked).
 */
export interface AddressEditValues {
  city: NewUserCity;
  street: string;
  buildingNumber: string;
  apartment: string;
  entranceCode: string;
  contactName?: string;
  contactPhone?: string;
}

export interface ChooseAddressStepProps {
  addresses: Address[];
  /** Currently selected existing address id, or `"new"` as a defensive fallback if none is selected yet (see `BookingFlowSheet`). */
  selection: string | "new";
  /** The account holder's own verified phone (E.164) - see `isOtherContact`'s doc comment. */
  ownPhone?: string | null;
  /**
   * The account holder's own full name (added 2026-08-28) - pre-fills the
   * "new" view's contact-name field on the account's first-ever additional
   * address; see this component's doc comment for the "first additional
   * address" contact-field treatment. Always known by the time this
   * component can even render - `NewUserDetailsStep` requires both first
   * and last name before a profile exists at all.
   */
  ownName?: string | null;
  /**
   * The account holder's own first/last name, split (added 2026-09-01) -
   * shown as a locked, non-editable first line whenever the *primary*
   * address (`is_primary`) is opened for editing, exactly like
   * `NewUserDetailsStep`'s own name row. Distinct from the combined
   * `ownName` above, which stays purely for the additional-address
   * contact-field prefill.
   */
  ownFirstName?: string | null;
  ownLastName?: string | null;
  /**
   * Which addresses have ever actually been used in a submitted job (added
   * 2026-09-01) - see `fetchAddressIdsWithJobs`'s doc comment. Drives
   * `disableLocationFields` (city/street) only. Building/apartment/contact
   * locks come from each address's own `*_locked` columns.
   */
  addressIdsWithJobs: Set<string>;
  /**
   * Cumulative counts backing both caps (added 2026-08-25) - deliberately
   * NOT derived from `addresses.length`/`addresses` above, since those only
   * reflect currently-visible (non-deleted) rows while the caps themselves
   * must count every address ever created - see `fetchAddressUsageCounts`'s
   * doc comment for why.
   */
  usageCounts: AddressUsageCounts;
  onChooseExisting: (addressId: string) => void;
  /**
   * Persists immediately via `add_address` (added 2026-09-01) - resolves
   * to an error message to show inline, or `null` on success, same pattern
   * as `AuthenticationStep`'s `onSendCode`/`onVerifyCode`.
   */
  onSaveNewAddress: (values: AddressOnlyValues) => Promise<string | null>;
  /** Persists immediately via `update_address` (added 2026-09-01) - same error-message-or-null pattern as `onSaveNewAddress`. */
  onSaveEdit: (addressId: string, values: AddressEditValues) => Promise<string | null>;
  /** Omit on the first screen shown in a path; see BookingFlowSheet's history stack. */
  onPrevious?: () => void;
}

/** Whether a `contact_phone` names someone other than the account holder - see `MAX_OTHER_CONTACT_ADDRESSES`'s doc comment. */
function isOtherContact(contactPhone: string | null | undefined, ownPhone: string | null | undefined): boolean {
  return Boolean(contactPhone) && !phoneNumbersMatch(contactPhone, ownPhone);
}

/**
 * `address.city` is already the Hebrew display label (e.g. "הרצליה"), not
 * the internal `NewUserCity` value - `submit_booking` only ever stores the
 * label (see `BookingFlowSheet.submitBooking`'s existing `cityLabel`
 * lookup), so no `CITIES` lookup is needed here.
 */
function formatAddressSummary(address: Address): string {
  return `${address.city}, ${address.street} ${address.building_number}`;
}

/**
 * Address picker - only ever relevant for a profile that already exists (a
 * brand-new profile has no saved addresses yet to choose between; it only
 * ever has the one it's about to create via `NewUserDetailsStep`). Two
 * distinct ways to land here, both handled by `BookingFlowSheet`:
 *   - `ConfirmStep`'s "שנה כתובת" link (added 2026-08-23, see
 *     `supabase/sql/address_book.sql`) - the customer explicitly asks to
 *     reconsider the address already showing on the recap.
 *   - Automatically, as a forward step right after authentication/
 *     attachments, whenever the profile has more than one saved address
 *     at all (confirmed 2026-09-03, `BookingFlowSheet`'s
 *     `finishChooseAddress`) - silently defaulting to whichever address
 *     is `is_default` and relying on the customer to notice and correct
 *     it on `ConfirmStep` risked an order quietly going to the wrong
 *     place. Exactly one saved address is still a non-choice and skips
 *     straight to `ConfirmStep` as before.
 *
 * Three internal views, same "one component, several states" pattern `AuthenticationStep` already
 * uses for phone vs OTP - not separate step components, since the whole
 * point of factoring `AddressFields` out was to keep this one small: a list
 * (existing saved addresses, oldest/first-added first per
 * `fetchUserAddresses` - a stable order, changed 2026-09-03 from an
 * earlier `is_default`-based sort that reshuffled the list every time a
 * different address was last used; which row shows selected is still
 * `is_default`-driven, see `effectiveStagedSelectionId` below - just no
 * longer the same thing as display order), an "add new address" view (same fields
 * `NewUserDetailsStep` uses), and an "edit" view for one existing address
 * (added 2026-08-24, reached via that row's own "ערוך" link - see below).
 * Neither view ever needs to scroll - the list is expected to stay short (a
 * handful of addresses at most for a home-services app, unlike a food-
 * delivery app's daily-use address list) - see BottomSheet.tsx's no-
 * scrolling rule.
 *
 * Select-then-confirm (reworked 2026-08-25, replacing an earlier "tap a row
 * -> immediately return to ConfirmStep" design): tapping a row only stages
 * it locally (`stagedSelectionId`) - the customer then presses the
 * footer's "הבא" (`next` - reworded 2026-09-04 from the longer, custom
 * "המשך לביצוע ההזמנה", which was observed wrapping to two lines on a
 * narrow phone; every other step's forward button already just says
 * "הבא", so this brings the list view back in line with that instead of
 * carrying its own one-off wording) to actually commit and return,
 * matching the "select, then press the bottom CTA"
 * pattern every other step in this sheet already uses, rather than being
 * the one screen that reacts to a row tap alone. "הוסף כתובת חדשה" is the
 * one exception - it still saves and exits straight to `ConfirmStep` in one
 * action, since typing a whole new address has nothing else on this screen
 * left to reconsider once submitted.
 *
 * Editing (added 2026-08-24, confirmed after a customer asked how to fix a
 * typo'd building number on an already-saved address) is deliberately a
 * separate, explicit action - the row's own "ערוך" link, not the row tap -
 * rather than folding editability into the same tap: the common case above
 * needs to stay a single tap with no extra screen, and always landing on
 * an editable form first (even with everything already correct) would add
 * a step to that common case for the sake of the rarer "something's
 * actually wrong" one. The edit view's only always-editable field is
 * `entranceCode` (confirmed 2026-09-03 - a building code really does
 * change). Everything else follows the same "editable until submitted
 * while filled" rule: city/street via `disableLocationFields` /
 * `addressIdsWithJobs`; building/apartment/contact via each address's
 * own `*_locked` columns. A still-blank apartment or contact half stays
 * fillable even after earlier jobs used this address. Its footer (added
 * 2026-08-25) is "חזור" (discards the in-progress edit, returns to the
 * list) and "עדכן כתובת" (commits via `onSaveEdit`, also returns to the
 * list) - never back to `ConfirmStep` directly, keeping the list the one
 * place a selection is actually confirmed. See `update_address`'s
 * comments in `supabase/sql/address_book.sql` for the full server-side
 * reasoning, enforced there too, not just here.
 *
 * List row visuals (redesigned 2026-09-04 against Figma node `8549:6612`,
 * replacing the earlier leading-checkmark / two-line-with-contact-summary
 * design): each row is now the same "Snackbar but Cooler" pill family
 * `AttachmentsStep` already established (`rounded-full`, `px-6 py-3`,
 * `gap-3`), in one of three variants used across this whole file - see
 * `design-system.md`'s "Snackbar but Cooler" entry for all three named in
 * one place:
 *   - **Filled** (an unselected saved address): `bg-surface-notification` +
 *     `shadow-notification`, no border - the same look `AttachmentsStep`'s
 *     triggers use.
 *   - **Outlined** (the selected saved address): `border-brand-primary`,
 *     no background, no shadow - selection state moved from a leading
 *     checkmark to this border entirely, so a still-selected row visually
 *     "lifts" less than an unselected one rather than more.
 *   - **Plain** ("הוסף כתובת חדשה"): no border, no background, no shadow -
 *     just `text-brand-primary font-semibold` text sized/padded exactly
 *     like the other two variants (so its tap target and vertical rhythm
 *     match, even though nothing else about it reads as a "card") - not a
 *     bare text link, which is why it keeps the full `rounded-full`
 *     px-6/py-3 wrapper despite having no visible chrome of its own.
 * Each saved-address row also dropped its second line (the contact-name/
 * phone summary) - that's still visible, just one edit-tap away, not
 * duplicated here - and its "ערוך" text link became a plain `Pencil` icon
 * button trailing the address text inside the same pill (both per Figma;
 * `editLinkLabel` copy still exists, now as that button's `aria-label`
 * only - this is the second time this exact link has swung between a text
 * label and an icon-only button, see that key's doc comment in
 * `copy-deck.md`). The rows no longer sit inside a bordered/padded list
 * card either - each pill supplies its own visual boundary now, so they're
 * just siblings in the step's ordinary `gap-4` (16px) vertical flow,
 * matching Figma's flat list exactly instead of nesting a card-inside-a-
 * step.
 *
 * Deleting an address is deliberately not a customer-facing action here
 * (as of 2026-08-31 - a prior version had a per-row `Trash2` icon plus an
 * "archive"/restore view; both were removed) - `delete_address`/
 * `restore_address` still exist in `supabase/sql/address_book.sql` but are
 * no longer granted to `authenticated`, making this a service-side-only
 * capability. See "Deleting a saved address" in `client-booking-flow-
 * prd.md`'s "Address Book" for why.
 *
 * The primary address (`is_primary`, added 2026-09-01 - see that flag's
 * doc comment in `address_book.sql`) is a special case in the edit view:
 * it shows the account holder's own first/last name (`ownFirstName`/
 * `ownLastName`), locked/non-editable, as its first line - exactly how
 * `NewUserDetailsStep` originally captured it - and never shows contact
 * fields at all, since this address is definitionally the account
 * holder's own place. Every other (non-primary) address never shows this
 * name row, and always keeps the contact fields (see below).
 *
 * First additional address contact fields (added 2026-08-28, labels
 * reverted 2026-09-01): the very first time this account ever adds an
 * address beyond its primary one (`usageCounts.totalAddressesCount === 1`,
 * `isFirstAdditionalAddress` below - cumulative, so a since-deleted second
 * address still counts as "already been through this once"), the "new"
 * view's contact-name/contact-phone fields default to the account holder's
 * own name/phone (always known - see `ownName`'s doc comment), under the
 * ordinary "איש קשר בכתובת (אופציונלי)"/"טלפון איש קשר (אופציונלי)"
 * labels - only the *prefill*, not the labels, is special here. Pre-filled,
 * never locked/disabled - `contactFieldsHintFirstTime` says so explicitly -
 * so a first additional address that genuinely *is* for someone else (e.g.
 * a parent's home) can still be entered as such; `openNew` resets both
 * fields to this default every time "הוסף כתובת חדשה" is pressed, so a
 * previous "edit" visit's contact values can never leak into this form.
 * From the account's second additional address onward this reverts to the
 * ordinary blank fields (still the same labels), unchanged.
 *
 * Persisted immediately (changed 2026-09-01, replacing an earlier
 * stage-until-final-submit design that silently lost edits/new addresses
 * whenever that particular order was never actually submitted): "שמור
 * כתובת"/"עדכן כתובת" call `onSaveNewAddress`/`onSaveEdit`, which run
 * `add_address`/`update_address` right away - independent of whether the
 * order being built ever reaches `ConfirmStep`'s "שלח הזמנה". Only which
 * *existing* address this order will use (`selection`) stays a plain,
 * in-memory `BookingFlowSheet` choice until submission - there's nothing
 * to persist about a mere selection.
 */
export function ChooseAddressStep({
  addresses,
  selection,
  ownPhone,
  ownName,
  ownFirstName,
  ownLastName,
  addressIdsWithJobs,
  usageCounts,
  onChooseExisting,
  onSaveNewAddress,
  onSaveEdit,
  onPrevious,
}: ChooseAddressStepProps) {
  // See this component's doc comment ("First additional address contact
  // fields") - computed up front since both the initial `useState` values
  // below and `openNew` need the same default.
  const isFirstAdditionalAddress = usageCounts.totalAddressesCount === 1;
  const defaultContactName = () => (isFirstAdditionalAddress ? ownName ?? "" : "");
  const defaultContactPhone = () => (isFirstAdditionalAddress ? formatOwnPhoneForDisplay(ownPhone) : "");

  const [mode, setMode] = useState<"list" | "new" | "edit">(selection === "new" ? "new" : "list");
  const [city, setCity] = useState<NewUserCity | null>(null);
  const [street, setStreet] = useState("");
  const [buildingNumber, setBuildingNumber] = useState("");
  const [apartment, setApartment] = useState("");
  const [entranceCode, setEntranceCode] = useState("");
  const [contactName, setContactName] = useState(defaultContactName());
  const [contactPhone, setContactPhone] = useState(defaultContactPhone());
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  /** Shared by both the "new" and "edit" views - see `handleSave`/`handleSaveEdit`. */
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  /**
   * List mode's own staged choice (added 2026-08-25) - seeded from
   * `selection` but never written back to it directly; only committed via
   * `onChooseExisting` when the footer's "הבא" is pressed. See this
   * component's doc comment for why row taps no longer commit immediately.
   */
  const [stagedSelectionId, setStagedSelectionId] = useState<string | null>(selection !== "new" ? selection : null);

  // Derived, not synced via an effect (avoids a setState-in-effect render
  // cascade) - falls back to whatever the current default is if the staged
  // choice ever points at a row no longer in `addresses`.
  const effectiveStagedSelectionId =
    stagedSelectionId && addresses.some((address) => address.id === stagedSelectionId)
      ? stagedSelectionId
      : (addresses.find((address) => address.is_default)?.id ?? addresses[0]?.id ?? null);

  const openEdit = (address: Address) => {
    // `address.city` is the Hebrew label (see `formatAddressSummary`'s doc
    // comment); `AddressFields`' city `Combobox` needs the internal
    // `NewUserCity` value to show it as selected (and, transitively, to
    // find `street` among that city's options) even though it renders
    // disabled here - reversing `CITIES`' own value→label mapping is
    // always exact since a saved address's city can only ever be one of
    // the two MVP-served cities' labels.
    const cityValue = CITIES.find((option) => option.label === address.city)?.value ?? null;
    setEditingAddressId(address.id);
    setCity(cityValue);
    setStreet(address.street);
    setBuildingNumber(address.building_number);
    setApartment(address.apartment ?? "");
    setEntranceCode(address.entrance_code ?? "");
    setContactName(address.contact_name ?? "");
    setContactPhone(address.contact_phone ?? "");
    setSaveError(null);
    setMode("edit");
  };

  const openNew = () => {
    // Resets every "add new address" field to its correct default any time
    // this view is (re-)entered from the list, rather than leaving behind
    // whatever `city`/`street`/.../`contactPhone` happened to still be
    // sitting in this component's state from a previous "edit" in the same
    // sheet visit - `openEdit` always overwrites all of these on its own
    // way in, but the list's "add new" button previously just flipped
    // `mode` with no equivalent reset, so editing one address and then
    // adding a new one could leak the edited address's fields into the new
    // one's form (fixed 2026-08-28, alongside adding the first-time
    // contact pre-fill below, which needs this same reset point to be
    // reliable).
    setCity(null);
    setStreet("");
    setBuildingNumber("");
    setApartment("");
    setEntranceCode("");
    setContactName(defaultContactName());
    setContactPhone(defaultContactPhone());
    setSaveError(null);
    setMode("new");
  };

  if (mode === "edit") {
    const editingAddress = addresses.find((address) => address.id === editingAddressId) ?? null;
    const isPrimary = Boolean(editingAddress?.is_primary);
    const hasExistingContactName = Boolean(editingAddress?.contact_name);
    const hasExistingContactPhone = Boolean(editingAddress?.contact_phone);
    // City/street lock: only truly locked once this ADDRESS has actually
    // been used in a submitted job (added 2026-09-01, see
    // `addressIdsWithJobs`'s doc comment).
    const isUsedInJob = Boolean(editingAddress && addressIdsWithJobs.has(editingAddress.id));
    // Contact field lock: independent per-value signal (added 2026-09-02,
    // replacing an `isUsedInJob`-based version that locked a brand-new
    // contact the instant its address had ANY job history, even though
    // that specific value had never itself gone out yet - see
    // `Address.contact_name_locked`'s doc comment). A still-blank half
    // always stays fillable regardless.
    const contactNameDisabled = Boolean(editingAddress?.contact_name_locked);
    const contactPhoneDisabled = Boolean(editingAddress?.contact_phone_locked);
    const buildingNumberDisabled = Boolean(editingAddress?.building_number_locked);
    const apartmentDisabled = Boolean(editingAddress?.apartment_locked);
    // Only a genuinely brand-new contact on this address - neither a name
    // nor a phone previously saved at all - can ever run into this cap
    // (independent of the lock above, which only governs *replacing* an
    // existing value, not whether adding one counts as new). Fixed
    // 2026-08-28: this used to key only on `!hasContactPhone`, so filling in
    // a phone for an address that already had a *name* saved (the exact
    // "same contact, missing one field" case this independent-locks feature
    // exists for) was wrongly treated as a brand-new other-contact and
    // checked against the cap - while the mirror case (filling in a name
    // for an address that already had a phone) never was, since that half
    // never ran this check at all. Once either half is already set, this
    // address has already been "spoken for" as this order's other-contact
    // slot - completing the other half is never a new addition. See
    // `update_address`'s matching logic in `supabase/sql/address_book.sql`.
    const wouldBeOtherContact =
      !isPrimary && !hasExistingContactPhone && !hasExistingContactName && isOtherContact(contactPhone, ownPhone);
    const otherContactLimitReached =
      wouldBeOtherContact && usageCounts.otherContactsCount >= MAX_OTHER_CONTACT_ADDRESSES;
    const canSave =
      city !== null && street.trim().length > 0 && buildingNumber.trim().length > 0 && !otherContactLimitReached && !saving;

    const handleSaveEdit = async () => {
      if (!editingAddressId || !canSave || !city) return;
      setSaving(true);
      setSaveError(null);
      const errorMessage = await onSaveEdit(editingAddressId, {
        city,
        street,
        buildingNumber,
        apartment,
        entranceCode,
        // Omitted (not just an empty string) whenever disabled - both here
        // and for a primary address - so `update_address` never mistakes
        // "this field is locked, don't touch it" for "the customer wants
        // to clear it". When NOT disabled, an intentionally emptied field
        // is sent through as `undefined` too, but that's fine: pre-lock,
        // `update_address` always overwrites with whatever it receives
        // (including nothing, meaning "clear it") - see that function's
        // "Contact name/phone clearing" comment.
        ...(isPrimary || contactNameDisabled ? {} : { contactName: contactName.trim() || undefined }),
        ...(isPrimary || contactPhoneDisabled ? {} : { contactPhone: contactPhone.trim() || undefined }),
      });
      setSaving(false);
      if (errorMessage) {
        setSaveError(errorMessage);
        return;
      }
      setStagedSelectionId(editingAddressId);
      setMode("list");
    };

    return (
      <div className="flex w-full flex-col gap-10">
        <div className="flex w-full flex-col gap-6">
          <div className="flex w-full flex-col gap-2 text-right text-text-secondary">
            <p className="w-full text-lg font-semibold leading-[1.4]">{COPY.bookingFlow.chooseAddress.editHeading}</p>
            <p className="w-full text-sm leading-[1.4]">{COPY.bookingFlow.chooseAddress.editSubheading}</p>
          </div>
          {isPrimary ? (
            // The primary address always shows the account holder's own
            // locked name as its first line, matching how
            // `NewUserDetailsStep` originally captured it - see this
            // component's doc comment and `is_primary`'s in
            // `address_book.sql`. Never editable - name changes aren't a
            // per-address concept at all.
            <div className="flex w-full gap-3">
              <Input
                className="flex-1"
                label={COPY.bookingFlow.newUserDetails.firstNameLabel}
                value={ownFirstName ?? ""}
                onChange={() => {}}
                disabled
              />
              <Input
                className="flex-1"
                label={COPY.bookingFlow.newUserDetails.lastNameLabel}
                value={ownLastName ?? ""}
                onChange={() => {}}
                disabled
              />
            </div>
          ) : null}
          <AddressFields
            city={city}
            street={street}
            buildingNumber={buildingNumber}
            apartment={apartment}
            entranceCode={entranceCode}
            onCityChange={(nextCity) => {
              setCity(nextCity);
              setStreet("");
            }}
            onStreetChange={setStreet}
            onBuildingNumberChange={setBuildingNumber}
            onApartmentChange={setApartment}
            onEntranceCodeChange={setEntranceCode}
            // City/street: locked once this address has been used in a
            // submitted job. Building/apartment: per-value `_locked`
            // columns, same as contact. Entrance code is never locked.
            disableLocationFields={isUsedInJob}
            buildingNumberDisabled={buildingNumberDisabled}
            apartmentDisabled={apartmentDisabled}
            showContactFields={!isPrimary}
            contactName={contactName}
            contactPhone={contactPhone}
            onContactNameChange={setContactName}
            onContactPhoneChange={setContactPhone}
            contactNameDisabled={contactNameDisabled}
            contactPhoneDisabled={contactPhoneDisabled}
          />
          {otherContactLimitReached ? (
            <p className="w-full text-right text-xs leading-[1.4] text-notification-red">
              {COPY.bookingFlow.chooseAddress.otherContactLimitReached.replace(
                "{max}",
                String(MAX_OTHER_CONTACT_ADDRESSES)
              )}
            </p>
          ) : null}
          {saveError ? (
            <p className="w-full text-right text-xs leading-[1.4] text-notification-red">{saveError}</p>
          ) : null}
        </div>
        <BookingStepFooter
          onPrevious={() => setMode("list")}
          previousLabel={COPY.bookingFlow.chooseAddress.backLabel}
          nextLabel={COPY.bookingFlow.chooseAddress.updateAddress}
          onNext={() => void handleSaveEdit()}
          nextDisabled={!canSave}
        />
      </div>
    );
  }

  if (mode === "new") {
    // Flat ceiling on every saved address, regardless of contact - see
    // `MAX_TOTAL_ADDRESSES`'s doc comment. Independent of, and checked
    // alongside, the other-contact cap below. Uses the cumulative
    // `usageCounts` (every address ever created, including soft-deleted
    // ones), not `addresses.length` (only the currently-visible list) - see
    // `usageCounts`'s doc comment for why that distinction matters.
    const totalLimitReached = usageCounts.totalAddressesCount >= MAX_TOTAL_ADDRESSES;
    // This new address only counts against the cap if it actually names
    // someone other than the account holder - see `MAX_OTHER_CONTACT_ADDRESSES`.
    const wouldBeOtherContact = isOtherContact(contactPhone, ownPhone);
    const otherContactLimitReached =
      wouldBeOtherContact && usageCounts.otherContactsCount >= MAX_OTHER_CONTACT_ADDRESSES;
    const canSave =
      city !== null &&
      street.trim().length > 0 &&
      buildingNumber.trim().length > 0 &&
      !totalLimitReached &&
      !otherContactLimitReached &&
      !saving;

    const handleSave = async () => {
      if (!canSave || !city) return;
      setSaving(true);
      setSaveError(null);
      const errorMessage = await onSaveNewAddress({
        city,
        street,
        buildingNumber,
        apartment,
        entranceCode,
        contactName: contactName.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
      });
      setSaving(false);
      // On success the parent already navigates away (back to
      // `ConfirmStep`) - nothing left to do here.
      if (errorMessage) setSaveError(errorMessage);
    };

    return (
      <div className="flex w-full flex-col gap-10">
        <div className="flex w-full flex-col gap-6">
          <div className="flex w-full flex-col gap-2 text-right text-text-secondary">
            <p className="w-full text-lg font-semibold leading-[1.4]">
              {COPY.bookingFlow.chooseAddress.newHeading}
            </p>
            <p className="w-full text-sm leading-[1.4]">{COPY.bookingFlow.chooseAddress.newSubheading}</p>
          </div>
          <AddressFields
            city={city}
            street={street}
            buildingNumber={buildingNumber}
            apartment={apartment}
            entranceCode={entranceCode}
            onCityChange={(nextCity) => {
              setCity(nextCity);
              setStreet("");
            }}
            onStreetChange={setStreet}
            onBuildingNumberChange={setBuildingNumber}
            onApartmentChange={setApartment}
            onEntranceCodeChange={setEntranceCode}
            showContactFields
            contactName={contactName}
            contactPhone={contactPhone}
            onContactNameChange={setContactName}
            onContactPhoneChange={setContactPhone}
            contactFieldsHint={
              isFirstAdditionalAddress ? COPY.bookingFlow.chooseAddress.contactFieldsHintFirstTime : undefined
            }
          />
          {/*
            Pre-empts the server-side checks in address_book.sql with a
            specific, actionable message instead of letting either surface
            as the generic "submit_failed" screen's error - see
            `MAX_TOTAL_ADDRESSES`'s and `MAX_OTHER_CONTACT_ADDRESSES`'s doc
            comments for why each cap exists (the total cap counts every
            address; the other-contact cap only counts addresses naming a
            *different* person, never the account holder's own).
          */}
          {totalLimitReached ? (
            <p className="w-full text-right text-xs leading-[1.4] text-notification-red">
              {COPY.bookingFlow.chooseAddress.totalAddressLimitReached.replace(
                "{max}",
                String(MAX_TOTAL_ADDRESSES)
              )}
            </p>
          ) : otherContactLimitReached ? (
            <p className="w-full text-right text-xs leading-[1.4] text-notification-red">
              {COPY.bookingFlow.chooseAddress.otherContactLimitReached.replace(
                "{max}",
                String(MAX_OTHER_CONTACT_ADDRESSES)
              )}
            </p>
          ) : null}
          {saveError ? (
            <p className="w-full text-right text-xs leading-[1.4] text-notification-red">{saveError}</p>
          ) : null}
        </div>
        <BookingStepFooter
          onPrevious={addresses.length > 0 ? () => setMode("list") : onPrevious}
          nextLabel={COPY.bookingFlow.chooseAddress.saveNewAddress}
          onNext={() => void handleSave()}
          nextDisabled={!canSave}
        />
      </div>
    );
  }

  // Gates "הוסף כתובת חדשה" itself, right here on the list (fixed
  // 2026-08-28, matching `AttachmentsStep`'s `photosMaxed` pattern) - not
  // just the "add new" view's own `totalLimitReached` further up (kept as
  // defense-in-depth). Previously this cap was only ever discovered *after*
  // tapping through to a whole new screen, which read as a dead end rather
  // than an explained limit.
  const totalLimitReached = usageCounts.totalAddressesCount >= MAX_TOTAL_ADDRESSES;

  return (
    <div className="flex w-full flex-col gap-10">
      <div className="flex w-full flex-col gap-4">
        <div className="flex w-full flex-col gap-2 text-right text-text-secondary">
          <p className="w-full text-lg font-semibold leading-[1.4]">{COPY.bookingFlow.chooseAddress.heading}</p>
          <p className="w-full text-sm leading-[1.4]">{COPY.bookingFlow.chooseAddress.subheading}</p>
        </div>

        {addresses.map((address) => {
          const isSelected = effectiveStagedSelectionId === address.id;
          // `address` is always already up to date (added/edited addresses
          // persist immediately - see this component's doc comment), so no
          // separate staged-edit merge is needed here anymore.
          return (
            <div
              key={address.id}
              className={cn(
                "flex w-full items-center gap-3 rounded-full px-6 py-3",
                isSelected ? "border border-brand-primary" : "bg-surface-notification shadow-notification"
              )}
            >
              <button
                type="button"
                onClick={() => setStagedSelectionId(address.id)}
                className="min-w-0 flex-1 truncate text-right text-sm leading-[1.4] text-text-primary"
              >
                {formatAddressSummary(address)}
              </button>
              {/*
                Separate from the row's own select tap (added 2026-08-24) -
                see this component's doc comment for why editing isn't
                folded into the row tap itself. Icon-only again as of
                2026-09-04 (Figma node `8549:6612`'s `ci:edit-pencil-01`,
                mapped to lucide's `Pencil` - see design-system.md's Icons
                section for why we never pull the Figma asset directly),
                trailing the address text inside the same pill.
              */}
              <button
                type="button"
                onClick={() => openEdit(address)}
                aria-label={COPY.bookingFlow.chooseAddress.editLinkLabel}
                className="flex size-6 shrink-0 items-center justify-center text-brand-primary transition-transform duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] active:scale-[0.96]"
              >
                <Pencil size={24} strokeWidth={1.75} />
              </button>
            </div>
          );
        })}

        <button
          type="button"
          disabled={totalLimitReached}
          onClick={openNew}
          className={cn(
            "flex w-full items-center rounded-full px-6 py-3 text-right text-sm font-semibold leading-[1.4]",
            totalLimitReached ? "text-text-secondary" : "text-brand-primary",
            "transition-colors duration-150 disabled:pointer-events-none"
          )}
        >
          {COPY.bookingFlow.chooseAddress.addNewLabel}
        </button>
        {/*
          Same "explain right where the disabled trigger is" placement as
          `AttachmentsStep`'s `maxPhotosReached` (added 2026-08-28, replacing
          an earlier version of this message that only ever appeared after
          tapping through into the now-unreachable "add new" view).
        */}
        {totalLimitReached ? (
          <p className="w-full text-right text-sm leading-[1.4] text-text-secondary">
            {COPY.bookingFlow.chooseAddress.totalAddressLimitReached.replace(
              "{max}",
              String(MAX_TOTAL_ADDRESSES)
            )}
          </p>
        ) : null}
      </div>

      <BookingStepFooter
        onPrevious={onPrevious}
        nextLabel={COPY.bookingFlow.chooseAddress.next}
        onNext={() => effectiveStagedSelectionId && onChooseExisting(effectiveStagedSelectionId)}
        nextDisabled={!effectiveStagedSelectionId}
      />
    </div>
  );
}
