# Professional-Side Next Steps - Handoff Summary

Written 2026-10-19 as a handoff doc so a new chat can pick up exactly where this one left off, without re-deriving everything from scratch. This is a plan/discussion record, not yet executed - nothing below has been built yet except where explicitly marked "already built."

## Where we are

We decided to pivot from remaining client-side scaffolding (Notifications/Profile real content - already scoped as separate later work) to the **professional side** of DoorHub, because that's what actually blocks real end-to-end validation of already-built client logic (status transitions, cancellations, the "call professional" button). We are still in the planning stage - no professional-side code has been written yet. The very next concrete deliverable agreed on is the **Professional Orders screen**, built from a Figma design the user has but has not yet shared.

## Part 1 - The test professional identity already in Supabase (exact values)

A test professional was seeded once, manually, documented in `supabase/sql/job_transitions.sql` section 0 (already committed to this repo - **recheck this, since as of this conversation's start the file showed as untracked (`??`) in `git status`; confirm it's actually committed/pushed, or commit it, since it holds these values**):

- `id` (used identically in both `auth.users.id` and `public.users.id` - this schema requires them to match): `5a532701-1873-41cf-8b69-a0058ab979e6`
- phone (E.164 format as stored): `+972500000000`
- `first_name` / `last_name`: בדיקה / קבלן
- `role`: `professional`
- A matching `public.professionals` row exists with `user_id = '5a532701-1873-41cf-8b69-a0058ab979e6'`. Its own primary key (`professionals.id`, DIFFERENT from `user_id` - this is the actual `p_professional_id` value the RPCs below need) was returned once by the original seed INSERT (`returning id`) and was never recorded anywhere in the repo. **If this value is needed again, it must be looked up fresh**: `select id from public.professionals where user_id = '5a532701-1873-41cf-8b69-a0058ab979e6';` run directly in the Supabase SQL editor.

## Part 2 - How "logging in as the professional" actually works (the corrected understanding, detailed)

This took several rounds of correction this session - the final, accurate understanding is:

### Two different Supabase features, easy to conflate
1. **"Add User"** (Supabase Dashboard -> Authentication -> Users -> Add User) - directly inserts a row into `auth.users` with a chosen phone/email. This is how the test professional's `auth.users` row was originally created (per `job_transitions.sql`'s own instructions: "Create the auth user first... any placeholder phone/email works"). **This alone does NOT let you log in with that phone through the app's normal OTP flow** - it only creates the row so the `public.users`/`public.professionals` foreign keys have something to point at.
2. **"Test Phone Numbers" allowlist** (Supabase Dashboard -> Authentication -> sign-in/provider settings) - a separate list of phone numbers (real or fake) that bypass real SMS delivery during `signInWithOtp`/`verifyOtp`, verified instead with a fixed code (the user recalled using `123456` for her own customer test number). **A number must be in THIS list for OTP login to actually succeed for it.**

### What was actually tested before (and what wasn't)
- The RPCs `accept_job(p_job_id, p_professional_id)` and `advance_job_status(p_job_id, p_new_status)` (both in `supabase/sql/job_transitions.sql`, both `security definer`, both still `grant`ed to `authenticated`) take the acting professional's id as an **explicit parameter**, not read from `auth.uid()`. This means any signed-in session at all (e.g. the user's own customer session) can call them and pass the test professional's known id as the parameter - this is exactly how "testing professional approval of orders" previously worked, via a now-deleted dev-only harness page (`src/app/dev/job-actions/page.tsx` - confirmed via `Glob`/404 that this page no longer exists in the current codebase, despite being referenced in `docs/architecture/component-library.md` and `docs/order-model.md` as if it still does - **this doc/reality mismatch has not been fixed**).
- The user then specifically recalled **actually logging in** (not just calling an RPC with a parameter) as the professional, through that same now-deleted test screen. Since `+972500000000` cannot receive a real SMS, this can only make sense if that number was, at some point, added to the Test Phone Numbers allowlist (item 2 above) - meaning **this step is likely already done**, not something that needs setting up fresh.

### The immediate next action (not yet done, not yet confirmed)
**Try logging in with `+972500000000` through the app's existing login UI** (`AuthenticationStep` inside the booking flow, or `LoginSheet` - both call the same `supabase.auth.signInWithOtp`/`verifyOtp`, no new code needed) using whatever fixed code was used before (likely `123456`). If it succeeds, `auth.uid()` genuinely resolves to the professional's real id for that session - a real, non-faked professional session, for free, with zero new code or Dashboard configuration. Only if this fails does the Test Phone Numbers allowlist actually need to be (re-)configured for this number.

## Part 3 - Why a real session matters (not just the RPC-parameter trick) - concrete RLS findings

Checked every RLS policy across `supabase/sql/*.sql` this session. Two concrete findings:

1. **`job_attachments` (photo upload) RLS already requires a REAL professional session, by design.** `supabase/sql/job_attachments.sql`'s insert/select policies check `p.user_id = auth.uid()` (via a join through `job_assignments`/`professionals`) - i.e. the actually-authenticated user's own id, not a parameter. Its own comment states this was deliberately built so "a customer and a future professional uploader are handled by the exact same policy shape... without a schema change when the professional side is built." **The RPC-parameter trick cannot satisfy this** - photo upload can only ever be tested with a true professional session.
2. **`jobs` has NO select policy for professionals at all today.** `supabase/sql/booking_flow_auth.sql` only defines `"Customers can view their own jobs"` (`auth.uid() = customer_id`) plus a matching insert policy. **Nothing lets a professional see any job today, even one assigned to them**, regardless of login approach. This is new, required backend work no matter what.

Additionally: `jobs.final_price` and `jobs.notes` have **no write path (RPC) at all today** - only status transitions exist via `advance_job_status`. A new `security definer` RPC (same pattern as `accept_job`) is needed for "complete job with a final price + notes," validating the price against the service's `price_min`/`price_max` (per `project-prd.md` §11/§14).

## Part 4 - Agreed build order (current plan)

1. **Confirm login still works** - try signing in as the test professional via the existing login UI (Part 2 above). No new code.
2. **Add a new RLS select policy** on `jobs` (and likely `job_assignments`) so a professional can actually see jobs - e.g. `searching_professional`-status jobs generally, plus any job assigned to them via `job_assignments`. This is required before the Orders screen can show anything, regardless of login approach.
3. **Build the Professional Orders screen** from the user's Figma design (not yet shared - needed before this step starts). Agreed shape per the user: three buckets - **ממתינות לאישור** (pending approval), **מאושרות** (approved), **היסטוריה** (history) - with the approve action available directly on the card, not only after opening it. Built directly, no dedicated PRD first (same posture as the client Orders screen, which also skipped a PRD - see `docs/order-model.md`/inline code comments instead). Reuses `accept_job`/`advance_job_status` as-is for approve/cancel/reject.
4. **New `complete_job`-style RPC** (final price + notes) - built when actually reaching that specific action, not before.
5. **Photo upload** - reuses existing `job_attachments` infra completely as-is; confirmed no new backend work needed (see Part 3).
6. **Deferred for later, deliberately**: a dedicated "Professional Job Actions" PRD (Start Driving / Delay / Cannot Perform Job / Complete Job bottom-sheet flows - `project-prd.md` §5) - its existing PRD-level description is enough to start the Orders screen; write the detailed PRD only once actually building those specific multi-step flows. Also deferred: role-based post-login routing (a professional's login landing on professional screens automatically) - not required to start, since navigating directly to the new professional route works fine while a real test-professional session is active. Also deferred (unchanged from before this session): Professional Home + Calendar screens, since no doc defines their content yet.

## Part 5 - Outstanding blockers before building can start

- **The Figma file link/node for the Professional Orders screen** - the user has this designed but has not yet shared it.
- **Confirming login still works** for the test professional's number (Part 2's immediate next action) - not yet attempted this session.

## Part 6 - Other things resolved earlier this session (brief, already built/shipped - not part of the open professional-side work)

For completeness, since this was also discussed in this conversation before the professional-side planning started:

- Built the full customer-facing "נתקלת בבעיה?" (self-service cancellation / contact support) feature: `src/components/client/orders/ReportProblemSheet.tsx`, `src/lib/support.ts` (temporary placeholder support number, pending a real forwarding/"1-700"-style number), wiring in `src/components/client/orders/JobDetailsScreen.tsx`, copy in `copy.json`/`copy-deck.md`, and a real SQL bugfix in `job_transitions.sql` (`searching_professional`/`pending_approval` now correctly allow a `cancelled` transition, mirrored in `src/lib/jobStatusTransitions.ts`) - **the user must still manually re-run the updated `job_transitions.sql` in the Supabase SQL editor if not already done**, for this cancellation fix to take effect live. Fully documented in `docs/cancellation-and-rescheduling.md`.
- Verified (via live browser testing) that the unstyled popup seen when tapping "חייג לשירות לקוחות" on desktop is expected, correct `tel:` link behavior (desktop browser-chrome-level protocol prompt, invisible to the page's DOM) - on a real mobile device the same link correctly hands off to the native dialer. No code change needed or made.

## After reading this doc in a new chat

Pick up directly at Part 5 (outstanding blockers) / Part 4 step 1 (confirm login still works) - that is the very next action, pending the user trying it and sharing the Figma link.
