import { supabase } from "@/lib/supabase";
import { phoneNumbersMatch } from "@/lib/phone";
import type { Address } from "@/lib/types";

/**
 * All addresses a customer has saved, oldest (first-ever-added) first -
 * backs `ChooseAddressStep`'s list view. Deliberately ordered by
 * `created_at` ascending, NOT `is_default` (changed 2026-09-03) - sorting
 * by `is_default` jumped the most-recently-*used* address to the top every
 * time it changed, which read as the list randomly reshuffling itself.
 * `created_at` never changes once a row exists, so the list order is now
 * stable for the lifetime of the account; which row is pre-selected in the
 * UI is a separate concern still driven by `is_default` (see
 * `loadReturningProfile`/`effectiveStagedSelectionId`) - see
 * `supabase/sql/address_book.sql`'s `created_at` comment for the full
 * reasoning. Safe to call directly from the browser: RLS
 * (`supabase/sql/booking_flow_auth.sql`) already scopes `public.addresses`
 * reads to `auth.uid() = user_id`.
 *
 * `deleted_at is null` (added 2026-08-25, see `supabase/sql/address_book.sql`'s
 * "Deleting a saved address" note): soft-deleted rows must never reach this
 * picker, even though they still exist server-side forever for cap-counting
 * purposes - see `fetchAddressUsageCounts` below for that cumulative count.
 */
export async function fetchUserAddresses(userId: string): Promise<Address[]> {
  const { data, error } = await supabase
    .from("addresses")
    .select(
      "id, city, street, building_number, apartment, entrance_code, contact_name, contact_phone, is_default, is_primary, contact_name_locked, contact_phone_locked, building_number_locked, apartment_locked"
    )
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("fetchUserAddresses error:", error);
    return [];
  }

  return (data ?? []) as Address[];
}

export interface AddressUsageCounts {
  /** Every address row this user has ever created, including soft-deleted ones. */
  totalAddressesCount: number;
  /** Of those, how many name a `contact_phone` other than the user's own. */
  otherContactsCount: number;
}

/**
 * Cumulative usage against both `address_book.sql` caps
 * (`MAX_TOTAL_ADDRESSES`/`MAX_OTHER_CONTACT_ADDRESSES` in
 * `src/lib/addresses.ts`) - deliberately counts EVERY address row this user
 * has ever created, including soft-deleted ones (unlike `fetchUserAddresses`
 * above), mirroring `submit_booking`'s own `v_total_count`/
 * `v_other_contacts_count` exactly. If this instead counted only the
 * currently-visible (non-deleted) list, deleting an address would silently
 * free up a slot client-side that the server would still reject - see
 * `supabase/sql/address_book.sql`'s "Deleting a saved address" note for why
 * that must never happen.
 *
 * Only ever used for `ChooseAddressStep`'s client-side pre-checks (so it can
 * explain a blocked save with a specific message instead of a raw RPC
 * error) - the server-side checks in `submit_booking` remain the actual
 * enforcement.
 */
export async function fetchAddressUsageCounts(
  userId: string,
  ownPhone: string | null | undefined
): Promise<AddressUsageCounts> {
  const { data, error } = await supabase.from("addresses").select("contact_phone").eq("user_id", userId);

  if (error) {
    console.error("fetchAddressUsageCounts error:", error);
    return { totalAddressesCount: 0, otherContactsCount: 0 };
  }

  const rows = data ?? [];
  return {
    totalAddressesCount: rows.length,
    otherContactsCount: rows.filter((row) => row.contact_phone && !phoneNumbersMatch(row.contact_phone, ownPhone))
      .length,
  };
}

/**
 * Which of this user's addresses have ever actually been used in a
 * submitted job - backs `ChooseAddressStep`'s `disableLocationFields`
 * (city/street lock) only (added 2026-09-01; scope narrowed 2026-09-02).
 * NOT used for the contact-field disabled state anymore - see
 * `Address.contact_name_locked`/`contact_phone_locked`'s doc comment for
 * why that needed its own, independent, per-value signal instead of this
 * per-address one (a contact name/phone added *after* an address already
 * had job history was wrongly locked instantly, purely because the
 * address had history, not because that value had ever itself been
 * submitted). A purely client-side UX hint either way - the server-side
 * check in `update_address` is the actual enforcement, this only decides
 * whether the field renders disabled.
 */
export async function fetchAddressIdsWithJobs(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase.from("jobs").select("address_id").eq("customer_id", userId);

  if (error) {
    console.error("fetchAddressIdsWithJobs error:", error);
    return new Set();
  }

  return new Set((data ?? []).map((row) => row.address_id as string));
}
