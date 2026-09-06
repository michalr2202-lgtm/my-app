"use client";

import type { ChangeEvent } from "react";
import { Combobox } from "@/components/ui/Combobox";
import { Input } from "@/components/ui/Input";
import { CITIES, STREETS_BY_CITY, type NewUserCity } from "@/lib/addresses";
import { COPY } from "@/lib/copy";
import { formatIsraeliPhoneInput } from "@/lib/phone";

export interface AddressOnlyValues {
  city: NewUserCity;
  street: string;
  buildingNumber: string;
  apartment: string;
  entranceCode: string;
  /**
   * Optional - "who to expect/call here, if not you" (see
   * `supabase/sql/address_book.sql`). Left undefined by `NewUserDetailsStep`
   * (its `NewUserDetailsValues` structurally satisfies this type without
   * them) - only `ChooseAddressStep`'s "add new address" view collects
   * these, via `showContactFields` below.
   */
  contactName?: string;
  contactPhone?: string;
}

export interface AddressFieldsProps {
  city: NewUserCity | null;
  street: string;
  buildingNumber: string;
  apartment: string;
  entranceCode: string;
  onCityChange: (city: NewUserCity) => void;
  onStreetChange: (street: string) => void;
  onBuildingNumberChange: (value: string) => void;
  onApartmentChange: (value: string) => void;
  onEntranceCodeChange: (value: string) => void;
  /**
   * Disables city/street - `ChooseAddressStep`'s edit view, once this
   * address has actually been used in a submitted job (refined 2026-09-02).
   * Past that point a different street/city is a move, which
   * `update_address` no longer allows either.
   */
  disableLocationFields?: boolean;
  /**
   * Per-value locks for building number / apartment (added 2026-09-03) -
   * same signal as `contactNameDisabled`/`contactPhoneDisabled`. Entrance
   * code has no matching prop: it stays editable indefinitely.
   */
  buildingNumberDisabled?: boolean;
  apartmentDisabled?: boolean;
  /**
   * Renders the optional contact name/phone fields below apartment/entrance
   * code - only relevant when a returning profile might be saving this
   * address for someone else (`ChooseAddressStep`). `NewUserDetailsStep`
   * omits this: a brand-new profile's first address is always its own.
   */
  showContactFields?: boolean;
  contactName?: string;
  contactPhone?: string;
  onContactNameChange?: (value: string) => void;
  onContactPhoneChange?: (value: string) => void;
  /**
   * Shown once, below both contact fields as a pair (added 2026-08-28) -
   * `ChooseAddressStep` passes `contactFieldsHintFirstTime` on the
   * account's first-ever additional address, pre-filled with the account
   * holder's own details, so a pre-filled field still visibly says it can
   * be changed for someone else rather than silently implying it can't be.
   */
  contactFieldsHint?: string;
  /**
   * Independent locks (added 2026-08-25, replacing a single all-or-nothing
   * `contactFieldsDisabled` - see `ChooseAddressStep`'s doc comment for the
   * bug this fixed): each is disabled only once *that specific* field
   * already has a value on the address being edited - a still-blank field
   * stays fillable even if the other one is already set. Editing an
   * existing address never allows *replacing* a contact name/phone that's
   * already there, only filling in whichever half is still missing - see
   * `submit_booking`'s "Edit path" comment for why (preserving
   * `MAX_OTHER_CONTACT_ADDRESSES` as a real cap, not just a speed bump).
   */
  contactNameDisabled?: boolean;
  contactPhoneDisabled?: boolean;
}

/**
 * City/street/building/apartment/entrance-code fields, factored out of
 * `NewUserDetailsStep` (2026-08-23) so `ChooseAddressStep`'s "add new
 * address" view (an existing profile adding a second saved address) can
 * reuse the exact same fields/layout instead of duplicating them - see
 * `NewUserDetailsStep`'s doc comment for the layout rationale (city full-
 * width; street+building share a row; apartment+entrance-code share the
 * next row).
 *
 * Deliberately excludes first/last name - those only ever apply to
 * `NewUserDetailsStep`'s brand-new-profile case, never to adding another
 * address for an existing profile.
 */
export function AddressFields({
  city,
  street,
  buildingNumber,
  apartment,
  entranceCode,
  onCityChange,
  onStreetChange,
  onBuildingNumberChange,
  onApartmentChange,
  onEntranceCodeChange,
  disableLocationFields = false,
  buildingNumberDisabled = false,
  apartmentDisabled = false,
  showContactFields = false,
  contactName = "",
  contactPhone = "",
  onContactNameChange,
  onContactPhoneChange,
  contactFieldsHint,
  contactNameDisabled = false,
  contactPhoneDisabled = false,
}: AddressFieldsProps) {
  const streetOptions = city
    ? STREETS_BY_CITY[city].map((streetName) => ({ value: streetName, label: streetName }))
    : [];

  const handleCityChange = (nextCity: string) => {
    onCityChange(nextCity as NewUserCity);
    onStreetChange("");
  };

  const handleBuildingNumberChange = (event: ChangeEvent<HTMLInputElement>) => {
    onBuildingNumberChange(event.target.value.replace(/\D/g, ""));
  };

  return (
    <div className="flex w-full flex-col gap-4">
      <Combobox
        label={COPY.bookingFlow.newUserDetails.cityLabel}
        placeholder={COPY.bookingFlow.newUserDetails.cityPlaceholder}
        value={city}
        onChange={handleCityChange}
        options={CITIES}
        disabled={disableLocationFields}
      />

      <div className="flex w-full gap-3">
        <Combobox
          className="min-w-0 flex-1"
          label={COPY.bookingFlow.newUserDetails.streetLabel}
          placeholder={COPY.bookingFlow.newUserDetails.streetPlaceholder}
          value={street || null}
          onChange={onStreetChange}
          options={streetOptions}
          searchable
          searchHint={COPY.bookingFlow.newUserDetails.streetSearchHint}
          disabled={!city || disableLocationFields}
        />
        {/*
          Fixed narrow width, not a flex share: a building number is
          1-3 digits, so it only ever needs about as much room as a
          Pill (~72px) - letting it flex would steal width from the
          street name, which is the field that actually needs it.
        */}
        <Input
          className="w-[72px] flex-none"
          inputMode="numeric"
          label={COPY.bookingFlow.newUserDetails.buildingNumberLabel}
          value={buildingNumber}
          onChange={handleBuildingNumberChange}
          disabled={buildingNumberDisabled}
        />
      </div>

      <div className="flex w-full gap-3">
        <Input
          className="flex-1"
          label={COPY.bookingFlow.newUserDetails.apartmentLabel}
          value={apartment}
          onChange={(event) => onApartmentChange(event.target.value)}
          disabled={apartmentDisabled}
        />
        <Input
          className="flex-1"
          label={COPY.bookingFlow.newUserDetails.entranceCodeLabel}
          value={entranceCode}
          onChange={(event) => onEntranceCodeChange(event.target.value)}
        />
      </div>

      {showContactFields ? (
        <div className="flex w-full flex-col gap-1.5">
          <div className="flex w-full gap-3">
            <Input
              className="flex-1"
              label={COPY.bookingFlow.chooseAddress.contactNameLabel}
              value={contactName}
              onChange={(event) => onContactNameChange?.(event.target.value)}
              disabled={contactNameDisabled}
            />
            <Input
              className="flex-1"
              inputMode="tel"
              label={COPY.bookingFlow.chooseAddress.contactPhoneLabel}
              value={contactPhone}
              onChange={(event) => onContactPhoneChange?.(formatIsraeliPhoneInput(event.target.value))}
              disabled={contactPhoneDisabled}
            />
          </div>
          {contactFieldsHint ? (
            <p className="w-full text-right text-xs leading-[1.4] text-text-secondary">{contactFieldsHint}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
