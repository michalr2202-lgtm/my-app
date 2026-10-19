import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Per-request, cookie-authenticated Supabase client for Server Components
 * (added 2026-09-08, alongside `src/proxy.ts`) - the piece that was
 * missing for `getCurrentCustomerId()`/`fetchActiveJob`/`fetchCustomerOrders`
 * to ever see a real signed-in customer. The plain `supabase` singleton in
 * `src/lib/supabase.ts` carries no session server-side, so every query run
 * through it is anonymous - the `jobs` RLS policy ("Customers can view
 * their own jobs") then silently returns zero rows regardless of what
 * `customer_id` filter is passed in code. This client instead reads the
 * session from the request's cookies (kept fresh by `proxy.ts`), so
 * Postgrest calls made with it run authenticated as that customer.
 *
 * Must be created fresh per request (not module-level singleton like the
 * browser client) - `cookies()` is only valid inside a request's own
 * render, per Next.js's Server Component rules.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // A Server Component can't set cookies (Next.js will throw if
          // this runs during rendering) - safe to ignore here since
          // `proxy.ts` already refreshes the session on every request
          // before this ever runs. Only a Server Function/Route Handler
          // would need this to actually take effect.
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Ignore - see comment above.
          }
        },
      },
    }
  );
}
