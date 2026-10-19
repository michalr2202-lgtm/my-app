import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Browser Supabase client - swapped 2026-09-08 from plain `createClient`
 * (`@supabase/supabase-js`) to `createBrowserClient` (`@supabase/ssr`).
 * Same client API surface (`.auth.*`, `.from()`, `.rpc()` all unchanged -
 * every existing call site keeps working as-is), but the session is now
 * also synced to cookies (via `src/proxy.ts`), not just `localStorage` -
 * that's what lets a Server Component (`src/lib/supabase/server.ts`) see
 * the same signed-in session the Booking Flow's OTP step establishes here.
 */
export const supabase = createBrowserClient(supabaseUrl, supabaseKey);
