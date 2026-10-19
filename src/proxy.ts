import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Session-refresh Proxy (2026-09-08) - see `src/lib/supabase/server.ts`'s
 * doc comment for why this exists at all: real per-customer identity on
 * Server Components (Home Screen, Orders Screen) needs the Supabase Auth
 * session available as a cookie, not just in the browser client's
 * `localStorage`. This is the standard `@supabase/ssr` Next.js pattern for
 * keeping that cookie's access/refresh tokens current on every request.
 *
 * Named `proxy.ts`/`proxy`, NOT `middleware.ts`/`middleware` - this
 * project's pinned Next.js version deprecated and renamed that file
 * convention (confirmed via `node_modules/next/dist/docs/.../proxy.md`
 * before writing this, per `AGENTS.md`'s "this is NOT the Next.js you
 * know" rule). Must live under `src/` (not the repo root) per
 * `src-folder.md`'s "If you're using Proxy, ensure it is placed inside
 * the src folder."
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  // Refreshes the session's access token if expired - required so a
  // still-logged-in customer's cookie stays valid across requests.
  // `getUser()` (not `getSession()`) revalidates against Supabase Auth
  // itself, not just the locally-decoded JWT.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  // Skip static assets/images - no session-dependent rendering there.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
