# Home Services SaaS – PRD (MVP)

## Product Vision

Build the simplest, fastest and most reliable way for customers to book trusted home service professionals.

Customers should be able to describe their problem, receive the right service recommendation and schedule a professional within minutes with as little friction as possible.

Professionals should receive a steady flow of relevant jobs with minimal administrative work, allowing them to focus on their profession instead of coordination and scheduling.

The platform exists to simplify coordination, automate scheduling whenever possible, and create a smooth experience for both customers and professionals.

---

## Product Principles

Every product decision should support the following principles:

- Simplicity over flexibility
- Consistency over visual creativity
- Fast booking over feature richness
- Reduce customer decision-making whenever possible
- Reduce professional administrative work whenever possible
- Reuse existing UX patterns before introducing new ones
- Prefer automation only when it improves the user experience

---

## MVP Philosophy

The goal of the MVP is to validate the business model before optimizing every operational process.

During the MVP:

- Prefer simple solutions over complex ones.
- Prefer manual operations over unnecessary automation.
- Build only what is required for validating the product.
- Customer experience has higher priority than internal convenience.
- Features that can be handled manually should remain manual until proven necessary.

---

## MVP Geographic Scope

The platform operates only in **Herzliya** and **Ramat HaSharon** during the MVP.

Both customers and professionals are assumed to be located within these two cities.

Because of this, travel time between any professional and any customer is assumed to be a small, roughly fixed window (~10-15 minutes), regardless of exact addresses.

This assumption underlies the "Now" job matching behavior described in Section 5.

There is no geographic/proximity filtering in the data model at this stage - matching is by category only. This is an accepted MVP simplification given the limited geographic scope, not a long-term design decision.

---

## Business Responsibility

The platform coordinates home service bookings.

It does not replace professional judgment.

Professionals remain responsible for:

- diagnosis
- workmanship
- safety
- decisions made during the service
- pricing within the approved pricing range

The platform is responsible for:

- booking
- scheduling
- communication
- notifications
- job coordination

---

## 1. Product Overview

A platform that connects customers with home service professionals (electricians, plumbers, AC technicians, handymen) through fast, AI-assisted job matching and scheduling.

Core value:
- Customers: fast, frictionless booking (Wolt-like experience)
- Professionals: more jobs, minimal coordination

---

## 2. User Roles

### Customer
- Can create a job without prior login
- Provides details only at submission
- Can view active and past jobs
- Receives updates on job progress

### Professional
- Receives job requests
- Accepts jobs (first-come-first-serve)
- Manages jobs via Orders and Calendar
- Updates job status (start, delay, arrival, completion)

### Admin (MVP - manual only)
- Creates professionals manually via database
- Assigns category and details
- Manage professionals (create, edit, disable)
- View and manage jobs
- Override job assignment if needed
- Manage services and pricing ranges
- Monitor system behavior and failures

---

## 3. Navigation Structure

### Customer App

Bottom Navigation:
- Home
- Notifications 
- Orders
- Profile

**Status (confirmed 2026-09-29):** Notifications and Profile are scaffold-only routes (`NotificationsScreen`/`ProfileScreen` in `component-library.md`) — real, working tabs so the login prompt could be made consistent across every account-dependent screen (see `AccountLoginPrompt`'s "Login entry points" note in `component-library.md`), but neither has its real content built yet; that's separate, later work with its own design.

### Professional App

Bottom Navigation:
- Home
- Notifications 
- Orders
- Calendar
- Profile

---

## 4. Core Customer Flow

### Step 1 – Home Screen
- Text input: "Describe your problem"
- Trigger AI matching

### Step 2 – AI Matching
- Input: free text
- Output:
  - 2–3 relevant services
  - OR fallback (diagnosis / not supported)

### Step 3 – Service Selection
- Select service
- Select quantity (if relevant)
- Display price range OR "price after inspection"

### Step 4 – Scheduling
- Select time slot (1-hour window)
- Up to 7 days ahead (see `client-booking-flow-prd.md` Step 3 for the more specific confirmed rule: 6 days including today, excluding Saturday)

### Step 5 – Submit Job

If user is not authenticated:

Bottom Sheet 1:
- Phone number input

OTP Verification:
- Send OTP via Supabase
- Verify OTP

If new user:

Bottom Sheet 2:
- First name
- Last name
- Address:
  - City
  - Street
  - Building number
  - Apartment
  - Entrance code (optional)

→ Create user

### Step 6 – Job Created
- Job is sent to all professionals in the relevant category
- First professional to accept gets the job

---

## 5. Professional Flow

### Job Reception
- Job appears as "Pending"
- For jobs where the customer selected a specific future date/time: broadcast to eligible professionals with its own matching deadline (shorter than "no deadline") - see "Scheduled Job Matching" below.
- For "Now" (immediate) jobs: broadcast simultaneously to all eligible professionals in the matching category (not sequential) - see "Immediate ('Now') Job Matching" below.

### Scheduled Job Matching
Applies whenever the customer chose a specific future date/time instead of "Now" (confirmed 2026-09-06, replacing an earlier "no urgency deadline" placeholder - see "Immediate ('Now') Job Matching" below for the analogous "Now" rules this mirrors). A customer submitting a scheduled request still needs to know, within a bounded time, whether anyone will actually take the job - "no deadline at all" left them with no way to tell an order that's quietly never going to be accepted from one that's still being considered.

Two tiers, both measured from the customer's original submission (not from the scheduled time itself, except as the threshold that picks which tier applies):

- **Near-term tier** - scheduled start is **less than 2 hours** from submission (the tightest bookable slots, since same-day slots already require starting more than 1 hour from submission - see `client-booking-flow-prd.md` Step 3): **matching deadline: 15 minutes**, identical to the "Now" flow's own matching deadline - at this distance there's effectively no slack difference between "scheduled for very soon" and "right now," so the same window applies.
- **Far tier** - scheduled start is **2 hours or more** from submission, including multiple days out: **matching deadline: 1 hour**. This is an explicit **MVP-only** number, not a long-term design decision - it exists only because the professional pool is small enough right now that a genuinely fast response can't be guaranteed organically within 15 minutes for a request that isn't urgent for the professional either. **Planned future change:** once professional density/activity is high enough, this tier collapses into the near-term tier's 15-minute deadline too, removing the two-tier distinction entirely - do not treat "1 hour" as permanent when revisiting this section.
- **Checkpoint updates:** near-term tier at ~7 minutes (identical to "Now"); far tier at ~30 minutes (the midpoint, same proportion as the near-term tier's 7/15 split).
- **On expiry** (no acceptance within the applicable tier's deadline): the customer is prompted to either retry (starts a new matching window) or pick a different date/time instead - same UX pattern as "Now"'s expiry below, with copy that references the chosen time rather than "right now" (see `notification_system_prd.md` 5.14-5.16).
- **MVP operational mitigation:** if no professional responds through the app within the promised window, support manually calls professionals directly to secure a response within the committed SLA. This is a manual, temporary process - not automated, and not a substitute for eventually building real matching-deadline enforcement (no `expires_at` column or expiry job exists yet - see `client-booking-flow-prd.md`'s "Submission" section for what's actually implemented today vs. documented-only).

### Immediate ("Now") Job Matching
Applies only when the customer chose the "Now" option instead of a specific date/time.

Two separate deadlines, both measured from the customer's original submission (not from each other):

- **Matching deadline: 15 minutes.** If no professional has accepted within this window, the request expires. This bounds how long the customer waits just to find out whether anyone is available at all.
- **Arrival deadline: 60 minutes.** This is an absolute deadline from submission, not from acceptance. Since a professional can only accept within the first 15 minutes, at least 45 minutes always remain for travel - comfortably more than the ~10-15 minute travel time assumed under the MVP Geographic Scope.
- **Broadcast:** sent simultaneously to all eligible professionals in the matching category (not sequential).
- **Assignment:** first professional to accept is assigned the job. No customer approval step is required to confirm the match - the customer is only informed once a professional is found (see `notification_system_prd.md` 5.1 "Professional Assigned" - informational only).
- **Customer notifications during matching** (see `notification_system_prd.md` 5.11-5.13): immediate confirmation on submission, a checkpoint update at ~7 minutes, and the expiry outcome at 15 minutes.
- **On expiry** (15 minutes, no acceptance): the customer is prompted to either retry (starts a new 15-minute matching window) or switch to selecting a specific future date/time instead.

### Accept Job
- First-come-first-serve
- Moves to "Scheduled"
- **Backend implemented 2026-09-09** (`supabase/sql/job_transitions.sql`'s `accept_job`/`advance_job_status` RPCs), ahead of any real professional app existing - see `component-library.md`'s "Job status transition RPCs" section for what's real vs. still provisional (an explicit actor-id parameter instead of a real professional session, and a grant to `authenticated` that must be revoked once one exists). Everything else in this section (matching deadlines, broadcast, the professional app itself) remains documented only, per the "Scheduled Job Matching"/"Immediate ('Now') Job Matching" subsections above.

### Active Job States

#### Before Job
- "Start Driving" button disabled
- Enabled 90 minutes before scheduled time

#### Start Driving
- Opens bottom sheet:
  - Choose navigation:
    - Waze
    - Google Maps

#### Arrival
- Button changes to "Arrived"

#### Delay Option
- Always available
- Opens bottom sheet:
  - Select new ETA
  - Sends update to customer

#### Cannot Perform Job
- Bottom sheet:
  - Reason selection
  - Option:
    - Cancel
    - Reschedule

#### Complete Job
- Opens summary screen
- Update final price (within defined range)
- Submit

---

## 6. Orders Screen

### Customer
- Pending job (awaiting acceptance)
- Upcoming jobs
- Past jobs (last 5, fixed count-only cap - no time-based expiry; confirmed 2026-09-29, see `orders.ts`'s `HISTORY_LIMIT` doc comment for the reasoning)
- **Implemented 2026-09-08**, wired to real per-customer queries the same day, as `OrdersScreen` at the `/orders` route (Figma node 8057:6297): an un-headed "active now" card at top (identical to the Home Screen's `ActiveJobCard`), followed by 3 headed buckets built on a shared `OrderCard` component - "confirmed/upcoming" (`confirmed`/`pending_approval`/`rescheduled`), "pending acceptance" (`searching_professional`, professional name hidden), and "history" (`completed`/`cancelled`/`incomplete_work`, last 5, service/price row shown only for `completed` jobs, with a single real `final_price` instead of a range - see `component-library.md`'s `OrderCard` entry). See `component-library.md`'s `OrderCard` entry for the full status-to-bucket-to-variant mapping and `copy-deck.md`'s "Orders Screen" section for copy. Backed by `fetchActiveJob` + `fetchCustomerOrders` (`src/lib/queries/orders.ts`) against a real, cookie-authenticated per-customer session (`src/lib/supabase/server.ts` + `src/proxy.ts`) - see `component-library.md`'s "Server-side session + queries" section. `src/lib/dummyOrdersData.ts` is QA-only fallback now, not the primary data path.
- **Sort order (decided 2026-09-09) is intentionally different per bucket** - upcoming by soonest `scheduled_time`, pending by most recently *submitted* (`created_at` desc), history by most recently *occurred* (`scheduled_time` desc) - see `fetchCustomerOrders`'s doc comment in `src/lib/queries/orders.ts` for the full reasoning (it's one consistent rule - "most relevant to right now first" - not three arbitrary ones).
- **Layout is deliberately vertical/all-buckets-visible, with no tabs, filters, or search** - unlike the Professional section below, a customer has too few orders at once for tabs/filters/search to earn their complexity; revisit only if real usage shows otherwise.

### Professional
- Pending jobs
- Accepted jobs
- Filters:
  - Date
  - Time
- Search by text

---

## 7. Calendar (Professional)

- Views:
  - Day
  - Week (toggle)
- Shows:
  - Accepted jobs
  - Pending jobs (visual indication)

---

## 8. Job Synchronization

All updates from professional:
- Start driving
- Delay
- Arrival
- Completion

→ Reflected on customer side

Implementation (MVP):
- Polling / refresh-based updates

---

## 9. Services Model

Each service includes:
- Category
- Name
- Description
- Keywords (array)
- Price range (min/max)
- Pricing type:
  - Fixed
  - Diagnosis

---

## 10. AI Matching

Closed-set classification only. The model maps free text onto the predefined services catalog in Supabase. It must never invent services, categories, or prices, and must never use open-web / internet search as a source of truth for matching or pricing.

Input:
- Free text (Hebrew problem description or service name). Voice input later uses the same pipeline after speech-to-text.

Output:
- Up to 3 matching services from the catalog (each with a confidence score)
- OR empty result → fallback ("Diagnosis at home" - see booking-flow PRD; still Needs Confirmation for exact UX)

Pipeline (implementation: `src/lib/ai/matchServices.ts` + `POST /api/ai/match-services`):
1. Optional keyword / label prefilter against `services.keywords` and `label_he` (fast path when the user names a known service).
2. AI classification with **Claude Sonnet** (`ANTHROPIC_API_KEY`, model default `claude-sonnet-4-5` / override via `ANTHROPIC_MATCH_MODEL`) against the full active catalog when needed — linguistic understanding only; final choices must be catalog ids. Also returns a category when no priced service fits.
3. Category keyword hints as a fallback when AI is unavailable or uncertain.
4. Post-process: drop matches below confidence threshold (~0.55), prefer category-consistent groups, cap at 3.

Outcomes:
- Priced services found → show match step
- Category known, no priced service → "no price yet" message (professionals exist in field)
- Unresolved / user picks "אין התאמה" → "no professionals in this field" message

Uses:
- Predefined active services list (`id`, `label_he`, `keywords`, category, `pricing_type`)
- Keywords for deterministic hits
- Catalog `price_min` / `price_max` / `pricing_type` for display after a match is chosen — never model-generated prices

Rules:
- Max 3 services
- No free-text / invented services
- Persist the original user query on the Order (notes / problem description) once the booking flow stores it — helps professionals and future keyword tuning

---

## 11. Data Model (Supabase)

### users
- id (= `auth.users.id` - this table is a profile extension of Supabase Auth, not an independently-keyed identity; see `frontend-architecture.md` once the auth flow is implemented)
- phone (unique)
- first_name
- last_name
- email (optional)
- role (customer / professional)
- created_at

### addresses
- id
- user_id (one user may have several saved addresses, up to `MAX_TOTAL_ADDRESSES` per user - see "Address Book" in `client-booking-flow-prd.md`, added 2026-08-23. This cap - and the separate `MAX_OTHER_CONTACT_ADDRESSES` cap below - count every address row ever created for a user, including soft-deleted ones (`deleted_at` below), so deleting one never frees up a slot for a new one)
- city (locked once an address is saved - editing to a different city/street means a different physical place, i.e. a move, so that's a new address instead)
- street (locked, same reasoning as `city`)
- building_number (editable after creation via `ChooseAddressStep`'s "ערוך" link, added 2026-08-24)
- apartment (editable, same as `building_number`)
- entrance_code (editable, same as `building_number`)
- contact_name (optional - who to actually expect/call at this address, when it isn't the account holder, e.g. booking for a parent; added 2026-08-23, see `supabase/sql/address_book.sql`. Independently fillable after creation if left blank, but never replaced once set - added 2026-08-24, made independent of `contact_phone` on 2026-08-25)
- contact_phone (optional, same purpose and same fill-in-but-never-replace rule as `contact_name`, independently of it; addresses whose `contact_phone` names someone other than the account holder are capped at `MAX_OTHER_CONTACT_ADDRESSES` per user - see `client-booking-flow-prd.md`'s "Other-contact cap")
- is_default (means "most recently used", not a fixed pin - flipped by `submit_booking` onto whichever address each submission actually uses; reassigned by `delete_address` if the deleted row was the default)
- deleted_at (added 2026-08-25, soft delete via the `delete_address` RPC - `null` for a live address. Service-side only as of 2026-08-31: `authenticated` no longer has `execute` on `delete_address`/`restore_address`, so no customer session can trigger this anymore, only the Supabase service-role key (direct SQL / a future admin tool). Never hard-deleted: `jobs.address_id` may still reference an older address, and both caps above must keep counting a deleted row forever to prevent a delete-and-recreate cap bypass - see `client-booking-flow-prd.md`'s "Deleting a saved address")

### categories 
- id 
- name
- label
- icon text
- color_bg
- color_text
- sort_order
- is_active 

### professionals
- id
- user_id
- category
- years_of_experience
- is_active

### services
- id
- category
- name
- description
- keywords (array)
- price_min
- price_max
- pricing_type
- is_active

### professional_services
- id
- professional_id
- service_id

### jobs
- id
- customer_id
- address_id
- service_id
- scheduled_time (timestamptz - start of the 1-hour window, per Section 11 / `client-booking-flow-prd.md` Step 3)
- status
- notes
- created_at
- final_price

### job_assignments
- id
- job_id
- professional_id
- status

### job_updates
- id
- job_id
- type
- data (json)
- created_at

Both tables now have a real write path (2026-09-09, `accept_job`/`advance_job_status` in `supabase/sql/job_transitions.sql`) - previously read-only (via `job_assignments`'s join in `jobRow.ts`, `job_updates` for the urgent-notification banner), never written to by anything in this repo.

---

## 12. Media & Notes

Each job can include:
- Notes (text)
- Images (stored via Supabase Storage)


---

## 13. Pricing Strategy

- Prices are system-defined (not by professionals)
- Professionals only select which services they perform
- Final price can be adjusted within defined range

---

## 14. Professional Onboarding (MVP)

- Created manually via database
- No public signup

Future:
- Referral-based onboarding

---

## 15. Out of Scope (MVP)

- Push notifications
- Reviews / ratings
- Advanced availability conflict detection
- Public professional signup
- Full real-time updates

---

## 16. Tech Stack

- Frontend: React (Next.js)
- Backend: NestJS
- Database & Auth: Supabase
- AI: Anthropic Claude Sonnet (closed-set service/category matching)
- Maps: Waze / Google Maps deep links

---

## 17. Development Approach

This PRD defines the product.

Development should proceed screen-by-screen while maintaining consistency with all project documentation.

Business entities are documented in:

- order-model.md

Technical architecture is documented in:

- frontend-architecture.md

Reusable design decisions are documented in:

- design-system.md

Reusable UI Components are documented in:

- component-library.md

AI implementation workflow is documented in:

- ai-engineering-workflow.md

---

## 18. First Development Task

Customer Home Screen:
- Problem input
- AI trigger
- Service suggestions

---

## 19. Service Mapping System

- Predefined list of services per category (Supabase `services` + `categories`)
- Each service includes system-defined price range (`price_min` / `price_max`) and `pricing_type` (fixed range or diagnosis)
- AI maps user problem → up to 3 catalog services (closed-set; see Section 10)
- No free-text services allowed
- No open-internet price or service discovery — local catalog is the only source of bookable services and prices

---

## Related Project Documentation

This document defines the product.

Additional project documentation:

- order-model.md
- architecture/frontend-architecture.md
- architecture/design-system.md
- architecture/component-library.md
- ai-engineering-workflow.md
