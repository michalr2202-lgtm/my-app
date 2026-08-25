"use client";

import { useState, type ChangeEvent } from "react";
import { AddressFields } from "@/components/client/booking/AddressFields";
import { BookingStepFooter } from "@/components/client/booking/BookingStepFooter";
import { Input } from "@/components/ui/Input";
import type { NewUserCity } from "@/lib/addresses";
import { COPY } from "@/lib/copy";

export type { NewUserCity };

export interface NewUserDetailsValues {
  firstName: string;
  lastName: string;
  city: NewUserCity;
  street: string;
  buildingNumber: string;
  apartment: string;
  entranceCode: string;
}

export interface NewUserDetailsStepProps {
  onNext: (values: NewUserDetailsValues) => void;
  /**
   * Repopulates the fields with a previous submission - set when returning
   * here via "הקודם" from `ConfirmStep`, so a round trip there and back
   * doesn't clear everything the user already typed.
   */
  initialValues?: NewUserDetailsValues;
  /** Omit on the first screen shown in a path; see BookingFlowSheet's history stack. */
  onPrevious?: () => void;
}

const EMPTY_VALUES: Omit<NewUserDetailsValues, "city"> = {
  firstName: "",
  lastName: "",
  street: "",
  buildingNumber: "",
  apartment: "",
  entranceCode: "",
};

/**
 * New User Details step (Step 6 - client-booking-flow-prd.md), shown only
 * for a genuinely new phone (no existing `public.users` profile). One
 * screen, all fields at once - this is one cohesive "who/where" question,
 * not a sequence of independent decisions like Scheduling, so it doesn't
 * follow the one-question-per-screen split. Never terminal itself: this
 * screen's own field list already fills the viewport, so it always
 * advances via `"הבא"` to the shared `ConfirmStep` instead of rendering
 * `OrderRecap` + `"שלח הזמנה"` itself (see "Submission" - every path ends
 * on `ConfirmStep`, not just this one).
 *
 * City and street are both `Combobox` selections, not free text (see
 * `src/lib/addresses.ts`) - the MVP only serves Herzliya/Ramat Hasharon, so
 * anything else would be an invalid address the professional couldn't be
 * matched against; street is restricted to that city's official street
 * registry for the same reason. Selecting a city resets any already-typed
 * street, since the street list is scoped per city.
 *
 * Street shares a row with building number (not city) - "street + number"
 * reads as one address unit (e.g. "הרצל 15"), the same pairing convention
 * used by most address forms, and it's the one field pairing here that
 * users fill in expecting a single line. Apartment/entrance code (both
 * optional) share the next row instead. This whole address layout lives in
 * `AddressFields` (factored out 2026-08-23) so `ChooseAddressStep`'s "add
 * new address" view - an existing profile saving a second address - reuses
 * it verbatim instead of duplicating it.
 *
 * No Figma reference yet for this screen - built against existing
 * design-system primitives (`Input`, `Combobox`, `BookingStepFooter`)
 * pending the real visual pass.
 */
export function NewUserDetailsStep({ onNext, initialValues, onPrevious }: NewUserDetailsStepProps) {
  const [values, setValues] = useState<Omit<NewUserDetailsValues, "city">>(() =>
    initialValues
      ? {
          firstName: initialValues.firstName,
          lastName: initialValues.lastName,
          street: initialValues.street,
          buildingNumber: initialValues.buildingNumber,
          apartment: initialValues.apartment,
          entranceCode: initialValues.entranceCode,
        }
      : EMPTY_VALUES
  );
  const [city, setCity] = useState<NewUserCity | null>(initialValues?.city ?? null);

  const canSubmit =
    values.firstName.trim().length > 0 &&
    values.lastName.trim().length > 0 &&
    city !== null &&
    values.street.trim().length > 0 &&
    values.buildingNumber.trim().length > 0;

  const updateField = (field: keyof typeof values) => (event: ChangeEvent<HTMLInputElement>) => {
    setValues((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleNext = () => {
    if (!canSubmit || !city) return;
    onNext({ ...values, city });
  };

  return (
    <div className="flex w-full flex-col gap-10">
      <div className="flex w-full flex-col gap-6">
        <div className="flex w-full flex-col gap-2 text-right text-text-secondary">
          <p className="w-full text-lg font-semibold leading-[1.4]">
            {COPY.bookingFlow.newUserDetails.heading}
          </p>
          <p className="w-full text-sm leading-[1.4]">{COPY.bookingFlow.newUserDetails.subheading}</p>
        </div>

        <div className="flex w-full flex-col gap-4">
          <div className="flex w-full gap-3">
            <Input
              className="flex-1"
              autoComplete="given-name"
              label={COPY.bookingFlow.newUserDetails.firstNameLabel}
              value={values.firstName}
              onChange={updateField("firstName")}
            />
            <Input
              className="flex-1"
              autoComplete="family-name"
              label={COPY.bookingFlow.newUserDetails.lastNameLabel}
              value={values.lastName}
              onChange={updateField("lastName")}
            />
          </div>

          <AddressFields
            city={city}
            street={values.street}
            buildingNumber={values.buildingNumber}
            apartment={values.apartment}
            entranceCode={values.entranceCode}
            onCityChange={setCity}
            onStreetChange={(street) => setValues((prev) => ({ ...prev, street }))}
            onBuildingNumberChange={(buildingNumber) => setValues((prev) => ({ ...prev, buildingNumber }))}
            onApartmentChange={(apartment) => setValues((prev) => ({ ...prev, apartment }))}
            onEntranceCodeChange={(entranceCode) => setValues((prev) => ({ ...prev, entranceCode }))}
          />
        </div>
      </div>

      <BookingStepFooter
        onPrevious={onPrevious}
        nextLabel={COPY.bookingFlow.newUserDetails.next}
        onNext={handleNext}
        nextDisabled={!canSubmit}
      />
    </div>
  );
}
