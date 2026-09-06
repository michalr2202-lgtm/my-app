/**
 * Normalizes an Israeli mobile number typed in the familiar local format
 * (with or without dashes/spaces, e.g. "050-1234567", "0501234567") into
 * E.164 (`+972501234567`) for Supabase Auth's `signInWithOtp`/`verifyOtp`.
 * Returns null if the input doesn't look like a valid Israeli mobile number
 * - the caller shows `bookingFlow.authentication.errorInvalidPhone` in that
 * case.
 *
 * Per client-booking-flow-prd.md Step 5: the user always types the local
 * format, never a `+972` prefix - normalization happens invisibly here, not
 * in the UI.
 */
export function normalizeIsraeliPhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");

  // Local mobile format: 0 + 2-digit prefix (50/52/53/54/55/58/...) + 7 digits.
  if (/^05\d{8}$/.test(digits)) {
    return `+972${digits.slice(1)}`;
  }

  // Already typed with the country code, just without the leading "+".
  if (/^9725\d{8}$/.test(digits)) {
    return `+${digits}`;
  }

  return null;
}

/**
 * Formats digits typed into the phone field as "050-1234567" (dash after
 * the 3-digit prefix, matching `bookingFlow.authentication.phonePlaceholder`
 * and this file's own doc comment) - purely a display concern.
 * `normalizeIsraeliPhone` above strips non-digit characters itself, so this
 * dash is never meaningful to validation, only to what the user sees while
 * typing. A single field with this formatting (rather than a separate
 * prefix dropdown + digits field) was a deliberate choice: Israelis type
 * their own number as one habitual sequence, and splitting it would add a
 * dropdown-tap most users don't need for something typed this often.
 */
export function formatIsraeliPhoneInput(input: string): string {
  const digits = input.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  return `${digits.slice(0, 3)}-${digits.slice(3)}`;
}

/**
 * The reverse of `normalizeIsraeliPhone` - turns the account's own E.164
 * phone (`+972501234567`, from Supabase Auth) back into the familiar local
 * format (`"050-1234567"`) for display/pre-fill inside a text input that
 * otherwise only ever holds locally-typed numbers (added 2026-08-28, for
 * `ChooseAddressStep`'s "new" view pre-filling the account holder's own
 * number into the contact-phone field on their first additional address -
 * see that component's doc comment). Returns `""` for anything that isn't
 * a recognizable Israeli E.164 number, same fail-soft behavior as an empty
 * field rather than showing something obviously wrong.
 */
export function formatOwnPhoneForDisplay(e164: string | null | undefined): string {
  const digits = (e164 ?? "").replace(/\D/g, "");
  if (!/^9725\d{8}$/.test(digits)) return "";
  return formatIsraeliPhoneInput(`0${digits.slice(3)}`);
}

/**
 * Whether two Israeli phone numbers are the same subscriber, regardless of
 * which format each is stored in - the account's own phone comes from
 * Supabase Auth as E.164 (`+972501234567`), while a saved address's
 * `contact_phone` is stored exactly as typed via `formatIsraeliPhoneInput`
 * (`"050-1234567"`). Both end in the same 9 digits (the leading `0` of the
 * local format and the `+972` country code are the only difference), so
 * comparing suffixes sidesteps normalizing either format outright.
 *
 * Used to tell "this saved address is for me" (empty/matching
 * `contact_phone`, unlimited) apart from "this saved address is for a
 * named other person" (see `ChooseAddressStep`'s other-contact cap,
 * `MAX_OTHER_CONTACT_ADDRESSES` in `src/lib/addresses.ts`, and the matching
 * server-side check in `supabase/sql/address_book.sql`).
 */
export function phoneNumbersMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const suffix = (value: string | null | undefined) => value?.replace(/\D/g, "").slice(-9) ?? "";
  const suffixA = suffix(a);
  const suffixB = suffix(b);
  return suffixA.length === 9 && suffixA === suffixB;
}
