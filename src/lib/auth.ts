import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

/**
 * TODO: Replace with real authentication/session lookup once the customer
 * auth flow (phone + OTP, per /docs/project-prd.md section 5) is
 * implemented. Until then there is no way to identify "the current
 * customer", so screens must gracefully render their empty state.
 *
 * This one specifically backs `src/app/page.tsx` (Home Screen Active Job
 * Card), a Server Component - detecting a real session there needs
 * cookie-based SSR session reading (`@supabase/ssr` + middleware), which is
 * separate, larger infrastructure not covered by the Booking Flow
 * Authentication work below. `getBookingSession`/`hasUserProfile` below are
 * for the Booking Flow's own Client Component context, which doesn't have
 * this limitation - see /docs/client-booking-flow-prd.md Step 5/6.
 */
export function getCurrentCustomerId(): string | null {
  return null;
}

/**
 * Booking Flow session check (Step 5 - "Shown only if there is no active
 * session on the current device"). Must be called from a Client Component -
 * relies on the browser Supabase client's persisted session (localStorage
 * by default), via `supabase.auth.getSession()`.
 */
export async function getBookingSession(): Promise<Session | null> {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error("getBookingSession error:", error);
      return null;
    }
    return data.session;
  } catch (err) {
    console.error("getBookingSession threw:", err);
    return null;
  }
}

/**
 * Whether the given (already-authenticated) user id has a completed
 * `public.users` profile row - the Step 6 skip condition. Only ever
 * meaningful to call with a verified `session.user.id`: this intentionally
 * cannot be checked against an unverified, client-typed phone number - see
 * client-booking-flow-prd.md Step 5 ("can only be checked after
 * verification succeeds ... per Row Level Security").
 */
export async function hasUserProfile(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("hasUserProfile error:", error);
      return false;
    }
    return data !== null;
  } catch (err) {
    console.error("hasUserProfile threw:", err);
    return false;
  }
}

export interface UserBasicProfile {
  firstName: string;
  lastName: string;
}

/**
 * Name for an already-verified profile - only ever meaningful once
 * `hasUserProfile` is `true`. Lets `ConfirmStep`'s recap show a returning
 * customer's name too (previously only the brand-new-profile population,
 * fresh out of `NewUserDetailsStep`, had one to show - see
 * `BookingFlowSheet.buildRecap`).
 */
export async function fetchUserBasicProfile(userId: string): Promise<UserBasicProfile | null> {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("first_name, last_name")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("fetchUserBasicProfile error:", error);
      return null;
    }
    if (!data) return null;
    return { firstName: data.first_name as string, lastName: data.last_name as string };
  } catch (err) {
    console.error("fetchUserBasicProfile threw:", err);
    return null;
  }
}
