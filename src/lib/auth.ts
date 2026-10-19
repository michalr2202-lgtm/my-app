import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

/**
 * Real per-customer identity for Server Components (Home Screen, Orders
 * Screen) - implemented 2026-09-08, replacing the previous hardcoded
 * `return null` stub. That stub's own doc comment used to explain this
 * needed "cookie-based SSR session reading (`@supabase/ssr` + middleware)"
 * as separate infrastructure - `src/proxy.ts` + `src/lib/supabase/server.ts`
 * are exactly that, now built.
 *
 * Takes the request-scoped server client (see `createSupabaseServerClient`)
 * rather than importing a singleton, since a Server Component needs a
 * fresh, cookie-bound client per request - there's no module-level client
 * this function could reuse the way the Booking Flow's browser client
 * does. Uses `getUser()`, not `getSession()`, since only `getUser()`
 * revalidates the token against Supabase Auth itself rather than trusting
 * a possibly-stale locally-decoded JWT - important here because this
 * result directly gates which `jobs` rows a query is allowed to return.
 */
export async function getCurrentCustomerId(serverClient: SupabaseClient): Promise<string | null> {
  const {
    data: { user },
  } = await serverClient.auth.getUser();
  return user?.id ?? null;
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
