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
   * Disables city/street (only, not building number/apartment/entrance
   * code) - `ChooseAddressStep`'s edit view for an *existing* saved
   * address, where changing the street/city would mean this row is
   * actually a different physical place (a move), which `submit_booking`
   * doesn't allow this path to do at all (see its "Edit path" comment) -
   * disabling here just makes that restriction visible rather than
   * silently ignored server-side.
   */
  disableLocationFields?: boolean;
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
  showContactFields = false,
  contactName = "",
  contactPhone = "",
  onContactNameChange,
  onContactPhoneChange,
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
        />
      </div>

      <div className="flex w-full gap-3">
        <Input
          className="flex-1"
          label={COPY.bookingFlow.newUserDetails.apartmentLabel}
          value={apartment}
          onChange={(event) => onApartmentChange(event.target.value)}
        />
        <Input
          className="flex-1"
          label={COPY.bookingFlow.newUserDetails.entranceCodeLabel}
          value={entranceCode}
          onChange={(event) => onEntranceCodeChange(event.target.value)}
        />
      </div>

      {showContactFields ? (
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
      ) : null}
    </div>
  );
}
