"use client";

import { useState } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import { AddressFields, type AddressOnlyValues } from "@/components/client/booking/AddressFields";
import { BookingStepFooter } from "@/components/client/booking/BookingStepFooter";
import { COPY } from "@/lib/copy";
import { cn } from "@/lib/cn";
import type { Address } from "@/lib/types";
import type { AddressUsageCounts } from "@/lib/queries/addresses";
import { CITIES, MAX_OTHER_CONTACT_ADDRESSES, MAX_TOTAL_ADDRESSES, type NewUserCity } from "@/lib/addresses";
import { phoneNumbersMatch } from "@/lib/phone";

/**
 * Only the fields `submit_booking`'s edit path actually allows changing -
 * see its "Edit path" comment for why `city`/`street` are excluded.
 * `contactName`/`contactPhone` are only meaningful when the address being
 * edited currently has none set - see `AddressEditValues`'s usage in
 * `ChooseAddressStep`'s edit view, and the same function's "Filling in a
 * previously-unset contact" comment for why this can only ever fill a
 * blank, never replace an existing value.
 */
export interface AddressEditValues {
  buildingNumber: string;
  apartment: string;
  entranceCode: string;
  contactName?: string;
  contactPhone?: string;
}

export interface ChooseAddressStepProps {
  addresses: Address[];
  /** Currently staged choice - an existing address id, or `"new"` if a not-yet-saved address is staged. */
  selection: string | "new";
  /** Only meaningful while `selection === "new"` - prefills the add-new-address view on reopen. */
  pendingNewAddress?: AddressOnlyValues;
  /** A staged (not-yet-submitted) edit of one saved address, if any - prefills the edit view on reopen, same idea as `pendingNewAddress`. */
  pendingAddressEdit?: { addressId: string } & AddressEditValues;
  /** The account holder's own verified phone (E.164) - see `isOtherContact`'s doc comment. */
  ownPhone?: string | null;
  /**
   * Cumulative counts backing both caps (added 2026-08-25) - deliberately
   * NOT derived from `addresses.length`/`addresses` above, since those only
   * reflect currently-visible (non-deleted) rows while the caps themselves
   * must count every address ever created - see `fetchAddressUsageCounts`'s
   * doc comment for why.
   */
  usageCounts: AddressUsageCounts;
  onChooseExisting: (addressId: string) => void;
  onSaveNewAddress: (values: AddressOnlyValues) => void;
  onSaveEdit: (addressId: string, values: AddressEditValues) => void;
  /**
   * Soft-deletes one saved address (added 2026-08-25, see `delete_address`
   * in `supabase/sql/address_book.sql`) - resolves to an error message on
   * failure (e.g. the defense-in-depth "can't delete your only address"
   * check), or `null` on success.
   */
  onDeleteAddress: (addressId: string) => Promise<string | null>;
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

function formatContactSummary(address: Address): string | null {
  if (!address.contact_name && !address.contact_phone) return null;
  return `${COPY.bookingFlow.orderRecap.contactLabel}: ${[address.contact_name, address.contact_phone].filter(Boolean).join(", ")}`;
}

/**
 * Address picker reached from `ConfirmStep`'s "שנה כתובת" link (added
 * 2026-08-23, see supabase/sql/address_book.sql) - only ever relevant for a
 * profile that already exists (a brand-new profile has no saved addresses
 * yet to choose between; it only ever has the one it's about to create via
 * `NewUserDetailsStep`).
 *
 * Three internal views, same "one component, several states" pattern
 * `AuthenticationStep` already uses for phone vs OTP - not separate step
 * components, since the whole point of factoring `AddressFields` out was
 * to keep this one small: a list (existing saved addresses, most-recently-
 * used first per `fetchUserAddresses`), an "add new address" view (same
 * fields `NewUserDetailsStep` uses), and an "edit" view for one existing
 * address (added 2026-08-24, reached via that row's own "ערוך" link - see
 * below). Neither view ever needs to scroll - the list is expected to stay
 * short (a handful of addresses at most for a home-services app, unlike a
 * food-delivery app's daily-use address list) - see BottomSheet.tsx's no-
 * scrolling rule.
 *
 * Select-then-confirm (reworked 2026-08-25, replacing an earlier "tap a row
 * -> immediately return to ConfirmStep" design): tapping a row only stages
 * it locally (`stagedSelectionId`, marked with the leading checkmark) - the
 * customer then presses the footer's "המשך לביצוע ההזמנה" to actually
 * commit and return, matching the "select, then press the bottom CTA"
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
 * actually wrong" one. The edit view always allows changing
 * `buildingNumber`/`apartment`/`entranceCode` (city/street stay disabled
 * via `AddressFields`' `disableLocationFields`); `contact_name`/
 * `contact_phone` are independently fillable (added 2026-08-25) - each
 * locked only once that specific field already has a value, so e.g. a
 * phone-only contact still allows adding the missing name - never allowing
 * either to be *replaced* once set. Its footer (added 2026-08-25) is
 * "חזור" (discards the in-progress edit, returns to the list) and "עדכן
 * כתובת" (commits via `onSaveEdit`, also returns to the list) - never back
 * to `ConfirmStep` directly, keeping the list the one place a selection is
 * actually confirmed. See `submit_booking`'s "Edit path" comment in
 * `supabase/sql/address_book.sql` for the full server-side reasoning,
 * enforced there too, not just here.
 *
 * Deleting (added 2026-08-25, a `Trash2` icon per row, hidden entirely when
 * it's the account's only remaining address) soft-deletes via
 * `onDeleteAddress` - see that prop's doc comment and
 * `supabase/sql/address_book.sql`'s `delete_address` for why this is a soft
 * delete that never frees up a capped slot. Tapping it swaps that row's
 * "ערוך"/trash pair for an inline "מחק"/"ביטול" confirmation rather than a
 * separate modal, consistent with this sheet's no-extra-screens style.
 *
 * Nothing here is persisted until the final "שלח הזמנה" tap on `ConfirmStep`
 * - selecting an existing row, filling in a new one, or editing an
 * existing one all only stage a choice in `BookingFlowSheet` state
 * (`selectedAddressId`/`pendingNewAddress`/`pendingAddressEdit`), mirroring
 * how `NewUserDetailsStep`'s fields stay unsaved until `submit_booking`
 * runs.
 */
export function ChooseAddressStep({
  addresses,
  selection,
  pendingNewAddress,
  pendingAddressEdit,
  ownPhone,
  usageCounts,
  onChooseExisting,
  onSaveNewAddress,
  onSaveEdit,
  onDeleteAddress,
  onPrevious,
}: ChooseAddressStepProps) {
  const [mode, setMode] = useState<"list" | "new" | "edit">(selection === "new" ? "new" : "list");
  const [city, setCity] = useState<NewUserCity | null>(pendingNewAddress?.city ?? null);
  const [street, setStreet] = useState(pendingNewAddress?.street ?? "");
  const [buildingNumber, setBuildingNumber] = useState(pendingNewAddress?.buildingNumber ?? "");
  const [apartment, setApartment] = useState(pendingNewAddress?.apartment ?? "");
  const [entranceCode, setEntranceCode] = useState(pendingNewAddress?.entranceCode ?? "");
  const [contactName, setContactName] = useState(pendingNewAddress?.contactName ?? "");
  const [contactPhone, setContactPhone] = useState(pendingNewAddress?.contactPhone ?? "");
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  /**
   * List mode's own staged choice (added 2026-08-25) - seeded from
   * `selection` but never written back to it directly; only committed via
   * `onChooseExisting` when "המשך לביצוע ההזמנה" is pressed. See this
   * component's doc comment for why row taps no longer commit immediately.
   */
  const [stagedSelectionId, setStagedSelectionId] = useState<string | null>(selection !== "new" ? selection : null);
  /** Which row is showing the inline "מחק"/"ביטול" confirmation, if any. */
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Derived, not synced via an effect (avoids a setState-in-effect render
  // cascade) - falls back to whatever the current default is if the staged
  // choice ever points at a row no longer in `addresses`, e.g. deleting the
  // currently-staged row (`handleConfirmDelete` refreshes `addresses` via
  // `onDeleteAddress`'s caller).
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
    const staged = pendingAddressEdit?.addressId === address.id ? pendingAddressEdit : null;
    setEditingAddressId(address.id);
    setCity(cityValue);
    setStreet(address.street);
    setBuildingNumber(staged?.buildingNumber ?? address.building_number);
    setApartment(staged?.apartment ?? address.apartment ?? "");
    setEntranceCode(staged?.entranceCode ?? address.entrance_code ?? "");
    setContactName(staged?.contactName ?? address.contact_name ?? "");
    setContactPhone(staged?.contactPhone ?? address.contact_phone ?? "");
    setMode("edit");
  };

  const handleConfirmDelete = async (addressId: string) => {
    setDeleteBusy(true);
    setDeleteError(null);
    const error = await onDeleteAddress(addressId);
    setDeleteBusy(false);
    if (error) {
      setDeleteError(error);
      return;
    }
    setDeletingId(null);
  };

  if (mode === "edit") {
    const editingAddress = addresses.find((address) => address.id === editingAddressId) ?? null;
    // Independent locks (see this component's doc comment) - a still-blank
    // half stays fillable even if the other one is already set.
    const hasContactName = Boolean(editingAddress?.contact_name);
    const hasContactPhone = Boolean(editingAddress?.contact_phone);
    // Same reasoning as the "new" view below - only counts against the cap
    // if it would actually name someone other than the account holder.
    // Filling in a name alone never touches this cap - only a phone does.
    const wouldBeOtherContact = !hasContactPhone && isOtherContact(contactPhone, ownPhone);
    const otherContactLimitReached =
      wouldBeOtherContact && usageCounts.otherContactsCount >= MAX_OTHER_CONTACT_ADDRESSES;
    const canSave = buildingNumber.trim().length > 0 && !otherContactLimitReached;

    const handleSaveEdit = () => {
      if (!editingAddressId || !canSave) return;
      onSaveEdit(editingAddressId, {
        buildingNumber,
        apartment,
        entranceCode,
        ...(hasContactName ? {} : { contactName: contactName.trim() || undefined }),
        ...(hasContactPhone ? {} : { contactPhone: contactPhone.trim() || undefined }),
      });
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
          <AddressFields
            city={city}
            street={street}
            buildingNumber={buildingNumber}
            apartment={apartment}
            entranceCode={entranceCode}
            onCityChange={() => {}}
            onStreetChange={() => {}}
            onBuildingNumberChange={setBuildingNumber}
            onApartmentChange={setApartment}
            onEntranceCodeChange={setEntranceCode}
            disableLocationFields
            showContactFields
            contactName={contactName}
            contactPhone={contactPhone}
            onContactNameChange={setContactName}
            onContactPhoneChange={setContactPhone}
            contactNameDisabled={hasContactName}
            contactPhoneDisabled={hasContactPhone}
          />
          {otherContactLimitReached ? (
            <p className="w-full text-right text-xs leading-[1.4] text-notification-red">
              {COPY.bookingFlow.chooseAddress.otherContactLimitReached.replace(
                "{max}",
                String(MAX_OTHER_CONTACT_ADDRESSES)
              )}
            </p>
          ) : null}
        </div>
        <BookingStepFooter
          onPrevious={() => setMode("list")}
          previousLabel={COPY.bookingFlow.chooseAddress.backLabel}
          nextLabel={COPY.bookingFlow.chooseAddress.updateAddress}
          onNext={handleSaveEdit}
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
      !otherContactLimitReached;

    const handleSave = () => {
      if (!canSave || !city) return;
      onSaveNewAddress({
        city,
        street,
        buildingNumber,
        apartment,
        entranceCode,
        contactName: contactName.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
      });
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
        </div>
        <BookingStepFooter
          onPrevious={addresses.length > 0 ? () => setMode("list") : onPrevious}
          nextLabel={COPY.bookingFlow.chooseAddress.saveNewAddress}
          onNext={handleSave}
          nextDisabled={!canSave}
        />
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-10">
      <div className="flex w-full flex-col gap-6">
        <div className="flex w-full flex-col gap-2 text-right text-text-secondary">
          <p className="w-full text-lg font-semibold leading-[1.4]">{COPY.bookingFlow.chooseAddress.heading}</p>
          <p className="w-full text-sm leading-[1.4]">{COPY.bookingFlow.chooseAddress.subheading}</p>
        </div>

        <div className="flex w-full flex-col gap-1 rounded-card border border-divider bg-surface-bg p-1">
          {addresses.map((address) => {
            const isSelected = effectiveStagedSelectionId === address.id;
            const isConfirmingDelete = deletingId === address.id;
            // Last remaining address can't be deleted (`delete_address`
            // refuses it server-side too) - hiding the icon entirely means
            // that case never needs to surface as an error, since there's
            // simply nothing to tap.
            const canDelete = addresses.length > 1;
            // Reflects a staged-but-not-yet-submitted edit of this exact
            // row immediately (e.g. returning to this list after editing,
            // then going back into it again) - same reasoning as
            // `BookingFlowSheet.buildRecap`'s own `effectiveAddress`.
            const displayAddress =
              pendingAddressEdit?.addressId === address.id
                ? {
                    ...address,
                    building_number: pendingAddressEdit.buildingNumber,
                    apartment: pendingAddressEdit.apartment || null,
                    entrance_code: pendingAddressEdit.entranceCode || null,
                  }
                : address;
            const contactSummary = formatContactSummary(displayAddress);
            return (
              <div key={address.id} className="flex w-full items-center gap-1">
                <button
                  type="button"
                  onClick={() => setStagedSelectionId(address.id)}
                  className={cn(
                    "flex min-w-0 flex-1 items-center gap-2 rounded-full px-3 py-3 text-right",
                    "transition-colors duration-150 hover:bg-surface-pill"
                  )}
                >
                  {/*
                    Checkmark leads the text (reading right-to-left, its
                    natural position ahead of what it's marking as selected)
                    rather than trailing it - confirmed 2026-08-24. A fixed-
                    size placeholder holds its spot when unselected so the
                    text doesn't shift left/right as selection changes.
                  */}
                  {isSelected ? (
                    <Check size={16} strokeWidth={2} className="mt-0.5 shrink-0" />
                  ) : (
                    <span className="mt-0.5 size-4 shrink-0" aria-hidden />
                  )}
                  <span className="flex min-w-0 flex-col items-start gap-0.5">
                    <span
                      className={cn(
                        "text-sm leading-[1.4]",
                        isSelected ? "font-medium text-text-primary" : "text-text-primary"
                      )}
                    >
                      {formatAddressSummary(displayAddress)}
                    </span>
                    {contactSummary ? (
                      <span className="text-xs leading-[1.4] text-text-secondary">{contactSummary}</span>
                    ) : null}
                  </span>
                </button>
                {isConfirmingDelete ? (
                  // Inline confirm, not a separate modal (added 2026-08-25) -
                  // consistent with this sheet's no-extra-screens style.
                  <div className="flex shrink-0 items-center gap-3 px-3">
                    <button
                      type="button"
                      disabled={deleteBusy}
                      onClick={() => void handleConfirmDelete(address.id)}
                      className="text-xs font-medium text-notification-red transition-opacity hover:opacity-70 disabled:opacity-50"
                    >
                      {COPY.bookingFlow.chooseAddress.deleteConfirmLabel}
                    </button>
                    <button
                      type="button"
                      disabled={deleteBusy}
                      onClick={() => setDeletingId(null)}
                      className="text-xs font-medium text-text-secondary transition-opacity hover:opacity-70 disabled:opacity-50"
                    >
                      {COPY.bookingFlow.chooseAddress.deleteCancelLabel}
                    </button>
                  </div>
                ) : (
                  <>
                    {/*
                      Separate from the row's own select tap (added
                      2026-08-24) - see this component's doc comment for why
                      editing isn't folded into the row tap itself. Styled to
                      match `OrderRecap`'s "שנה כתובת" link exactly (confirmed
                      2026-08-24), replacing an earlier icon-only pencil button.
                    */}
                    <button
                      type="button"
                      onClick={() => openEdit(address)}
                      className="shrink-0 px-3 text-xs font-medium text-brand-primary transition-opacity hover:opacity-70"
                    >
                      {COPY.bookingFlow.chooseAddress.editLinkLabel}
                    </button>
                    {canDelete ? (
                      <button
                        type="button"
                        aria-label={COPY.bookingFlow.chooseAddress.deleteAriaLabel}
                        onClick={() => {
                          setDeletingId(address.id);
                          setDeleteError(null);
                        }}
                        className="flex size-8 shrink-0 items-center justify-center text-text-secondary transition-colors hover:text-notification-red"
                      >
                        <Trash2 size={16} strokeWidth={1.75} />
                      </button>
                    ) : null}
                  </>
                )}
              </div>
            );
          })}

          <button
            type="button"
            onClick={() => setMode("new")}
            className={cn(
              "flex w-full items-center justify-start gap-2 rounded-full px-3 py-3 text-right text-sm font-medium leading-[1.4] text-brand-primary",
              "transition-colors duration-150 hover:bg-surface-pill"
            )}
          >
            <Plus size={16} strokeWidth={2} className="shrink-0" />
            <span>{COPY.bookingFlow.chooseAddress.addNewLabel}</span>
          </button>
        </div>
        {deleteError ? (
          <p className="w-full text-right text-xs leading-[1.4] text-notification-red">{deleteError}</p>
        ) : null}
      </div>

      <BookingStepFooter
        onPrevious={onPrevious}
        nextLabel={COPY.bookingFlow.chooseAddress.continueLabel}
        onNext={() => effectiveStagedSelectionId && onChooseExisting(effectiveStagedSelectionId)}
        nextDisabled={!effectiveStagedSelectionId}
      />
    </div>
  );
}
