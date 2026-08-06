# PRD – Client Booking Flow (Bottom Sheet)

## Screen Description

This document describes the shared, multi-step Bottom Sheet flow that collects the information required to create a Job (Order).

It is entered from multiple buttons across the Client app (currently: the Home Screen), and defines:

- the single canonical step sequence
- how each entry point maps onto that sequence (starting step + pre-filled/skipped steps)
- what information each step collects
- which Order section each step's data belongs to
- flow-level states and edge cases

This is a **draft** produced from existing approved documentation (`project-prd.md`, `home-screen-prd.md`, `order-model.md`) plus confirmed product decisions from review. Sections marked **Needs Confirmation** still require a decision before implementation of those specific pieces begins.

Visual implementation (once approved) must follow Figma exactly, as usual. This document defines business/flow behavior only - not visual design.

# Related Documents

This flow depends on:

- /docs/project-prd.md (Section 4: Core Customer Flow - source of the master sequence; Section 10/19: AI Matching / Service Mapping)
- /docs/order-model.md (Order sections and Data Ownership - source of the Data Mapping section)
- /docs/home-screen-prd.md (Section 5: Flows - source of entry points and Rule 1)
- /docs/copy-deck.md (user-facing copy for this flow, when populated)
- /docs/architecture/frontend-architecture.md
- /docs/architecture/design-system.md
- /docs/architecture/component-library.md

Do not duplicate information from those documents. This document is the single source of truth for the **booking flow's step sequence and per-entry-point skip logic** only.

---

## 1. Goal

Enable a customer to go from any entry point (free-text search, urgency selection, category, or specific service) to a created Job, through the shortest path possible given what is already known at the entry point - without ever re-asking a question the user has effectively already answered.

Per `home-screen-prd.md` Rule 1: **all entry points open a Bottom Sheet.** This document defines what that Bottom Sheet actually is: one flow, reused everywhere.

---

## 2. Master Step Sequence

This is the full path, as if entering with zero prior context. Every entry point is a shortcut into this same sequence - never a different flow.

Confirmed order:

1. Category Selection
2. Service Selection
3. Scheduling
4. Attachments (Photos / Notes) — optional to fill
5. Authentication (phone + OTP) — only if no active session
6. New User Details — only if the verified phone is new
7. Confirm & Submit → Job created

### Step 1: Category Selection

- Shown when the target category is not yet known.
- User selects a category.
- Advances to Step 2.

### Step 2: Service Selection

- Shown when the target service is not yet known.
- Shows services within the resolved category (or, coming from AI matching, up to 3 suggested services - see Entry Point Mapping / Search).
- User selects a service, and quantity if relevant (per `project-prd.md` Step 3).
- Displays price range from the catalog, or "price after inspection" for diagnosis-type pricing.
- Advances to Step 3.

### Step 3: Scheduling

- A date question followed by a time-slot question (Figma: `OrderBottomSheet_Scheduling`, node `8412:6072`) - two separate screens per Rule 5 (Step Screen Reveal Rule): the hour question only appears after "הבא" is pressed on the date screen. There is no separate "Now vs. later" toggle inside this step - urgency is resolved before reaching it:
  - **Home Screen Time Pill entry (Flow 2, "דחוף עכשיו"):** pre-selects immediate/"Now" and **skips this step entirely** (per Entry Point Mapping below). Matching/arrival deadlines then run after Step 7 - see `project-prd.md` Section 5 ("Immediate ('Now') Job Matching").
  - **Every other entry point** (Search, Category Card, Service Pill) reaches this step and picks a date + time slot, including **today** - selecting today does not require the soonest slot; it books a specific hour later the same day (confirmed: today is a normal, always-available date option, not reserved for the "Now" flow).
- Date range (confirmed):
  - Offer **6 selectable dates**, in calendar order starting from and including today (e.g. if today is Sunday: today, Monday, Tuesday, Wednesday, Thursday, Friday - Saturday is skipped and does not count toward the 6).
  - **Exclude Saturday only** - Friday is a normal selectable day (with shortened hours, see below).
- Time slots (confirmed): **1-hour windows** (per Figma; supersedes the old "2-hour window" assumption - `project-prd.md` Step 4 updated to match).
  - Working hours: **08:00-18:00** on every day except Friday.
  - **Friday: 08:00-14:00** (shortened hours before Shabbat) - last selectable slot is 13:00-14:00.
  - When today is selected, slots that have already started are not offered.
- Persists to `jobs.scheduled_time` (`timestamptz` - start of the chosen 1-hour window; confirmed against the live schema 2026-08-06 - the column was previously `scheduled_date`/`date`-only and has been migrated).
- Advances to Step 4.

### Step 4: Attachments (Photos / Notes)

- Optional to fill - the customer may skip without adding photos or notes.
- The step itself is always part of the sequence (shown regardless of entry point) unless a future decision says otherwise.
- Maps to the Order's Attachments section (per `order-model.md`: "Images and files related to the Order... may include Customer images").
- **Needs Confirmation:** maximum photo count (if any).
- Advances to Step 5.

### Step 5: Authentication

- Shown only if there is no active session on the current device. Authentication is a **device/session-level** check, not a per-order check - once verified, the user stays authenticated across app opens until they explicitly log out or the local session is cleared (app data deleted / reinstall / new device).
- Phone number input → OTP sent via Supabase → OTP verification (per `project-prd.md` Step 5).
- On successful OTP verification, a session is established on the device via Supabase Auth (mechanism detail belongs in `frontend-architecture.md` once implemented).
- Whether the phone number is new or already known in the `users` table determines whether Step 6 is shown next.
- If a valid session already exists on this device, this step is skipped entirely.
- Advances to Step 6.

### Step 6: New User Details

- Shown only if the phone number verified in Step 5 does not already exist in the `users` table (i.e., a genuinely new customer - regardless of device history).
- First name, last name, address (city, street, building number, apartment, entrance code optional) - per `project-prd.md` Step 5.
- If the phone number already has a profile (returning customer, even on a new device or after logout/reinstall), this step is skipped entirely - existing profile data is reused.
- Advances to Step 7.

### Step 7: Confirm & Submit

- Final review, submit triggers Job creation.
- Job is sent to all professionals in the relevant category; first to accept gets it (per `project-prd.md` Step 6 / `home-screen-prd.md` Flow 5).
- Flow ends; user sees Job Created confirmation.

---

## 3. Entry Point Mapping

Each entry point below corresponds to a Flow already named in `home-screen-prd.md` Section 5. This table defines where in the Master Step Sequence each entry point joins in, and what gets skipped.

| Entry Point (home-screen-prd.md Flow) | Starting Step | Skipped Steps | Notes |
|---|---|---|---|
| Search (Flow 1) - free text, AI match found | Step 2 (Service Selection) | Step 1 (Category) | AI classifies against the **predefined services catalog** in the database only (see `project-prd.md` Sections 10 and 19). Returns up to 3 services with catalog price ranges. Category is implied by the matched services; user still picks one of the suggestions. |
| Search (Flow 1) - no AI match | "Diagnosis at home" flow | - | **Needs Confirmation:** referenced in `home-screen-prd.md` but not yet specified. Out of scope until defined. |
| Time Pill - urgent now / schedule later (Flow 2) | Step 1 (Category) | none | Problem/category not yet known; full sequence runs. The pill choice pre-selects which Step 3 option is used. |
| Category Card (Flow 3) | Step 2 (Service Selection) | Step 1 (Category) | Category pre-filled from the clicked card. |
| Service Pill (Flow 4) | Step 3 (Scheduling) | Step 1 (Category), Step 2 (Service Selection) | Both category and exact service are already known. |
| Active Job Card (Flow 6) | N/A - not part of this flow | - | Navigates to a Job Details screen, not a Bottom Sheet. Out of scope. |
| Notification (Flow 7) | N/A - not part of this flow | - | Navigates to the relevant screen (context-dependent). Out of scope. |

Step 4 (Attachments) is always shown, regardless of entry point (optional to fill, not optional to reach). Steps 5, 6, and 7 are never skipped based on entry point - only based on authentication/user state, as defined in the Master Step Sequence.

### Search / AI Matching (within this flow)

- Input: free-text Hebrew problem description or service name from the Home Screen SearchBar (voice input later uses the same pipeline after speech-to-text).
- Matching is a **closed-set classification** against active services in the database (`id`, `label_he`, `keywords`, category, `pricing_type`) - the model must not invent services or prices, and must not use open-web search for discovery or pricing (see `project-prd.md` Sections 10 and 19).
- Pipeline: optional keyword/label prefilter → AI classification when needed → post-process (confidence threshold ~0.55, prefer category-consistent groups, max 3). Implemented in `src/lib/ai/matchServices.ts` / `POST /api/ai/match-services`.
- Output: up to 3 service matches (with catalog price ranges), plus a user-facing **"אין התאמה"** option on the sheet.
- Price shown after a catalog service is selected always comes from the catalog row, never from the model.
- The original user query should be retained on the Order draft (notes / problem description) when the booking flow persists it.

#### Match outcomes (confirmed)

| Outcome | When | UX |
|---|---|---|
| Priced services | Matcher returns 1–3 catalog services | Search match step → user picks a service (or "אין התאמה") → Next |
| Category without priced service | Category identified, but no suitable priced catalog row (e.g. "לתלות מדפים") | Message `bookingFlow.noPriceYet.*` — professionals exist in the field, price range not defined yet |
| Unresolved / user chose "אין התאמה" + Next | Outside known categories, or explicit no-match pill | Message `bookingFlow.noMatch.*` — no professionals in this field right now |

Selecting **"אין התאמה"** does **not** advance immediately — it enables Next like any other pill; Next then shows the no-professionals message.

---

## 4. Data → Order Draft Mapping

Per `order-model.md`, every Bottom Sheet must declare which Order section its data belongs to:

| Step | Order Section (per order-model.md) |
|---|---|
| Category Selection | Service Information |
| Service Selection | Service Information |
| Scheduling | Scheduling |
| Attachments (photos, notes) | Attachments |
| Authentication (phone, OTP) | Customer Information |
| New User Details (name, address) | Customer Information / Location |
| Confirm & Submit | Status (Draft → Searching Professional) |

Exact field names are intentionally not listed here, consistent with `order-model.md`: *"The exact fields of the Draft are intentionally not documented yet. They will be introduced gradually as booking screens are implemented."* Field-level detail belongs in `order-model.md`, added when each step is actually implemented.

---

## 5. States

- **Loading (AI matching):** State F in `home-screen-prd.md`; transition into Step 2 when matches exist.
- **Loading (OTP send / verify):** spinner on submit.
- **Error (OTP invalid / expired):** inline error, allow retry/resend.
- **Error (AI no match):** sheet content replaced with no-match message + back-home CTA (see Search / AI Matching above).
- **Loading (photo upload):** per-image upload progress.
- **Error (photo upload failed):** inline error, allow retry/remove.
- **Validation:** phone number format, required address fields, required category/service selection before advancing.
- **Post-submission (Now only):** after Step 7, while matching is in progress (up to 15 min) - see `project-prd.md` Section 5. Not part of the Bottom Sheet itself; surfaced via notifications per `notification_system_prd.md`.

---

## 6. Rules

### Rule 1

This is one flow with one implementation, regardless of entry point. Never build a separate Bottom Sheet per entry point (per `ai-engineering-workflow.md`: never create duplicate Components).

### Rule 2

An entry point may only ever skip steps because the corresponding information is already known - never for any other reason.

### Rule 3

Back navigation within the flow returns to the previous **shown** screen (skipped steps/screens remain skipped; they are not revisited going backward). Triggered by a "הקודם" (Previous) button next to that screen's "הבא", shown starting from the second screen in a path (never on the first screen reached in a given entry point) - always rendered active, no disabled state. Returning to a screen restores the answer previously given there (e.g. the picked service, date), rather than showing it empty.

### Rule 4

Closing/dismissing the Bottom Sheet before Step 7 discards the in-progress Order Draft (no partial Job is created). Aligns with `home-screen-prd.md` Rule 3 ("No state persistence if user exits mid-flow"). A "Discard changes?" confirm dialog may be added in a future version; MVP behavior is discard without persistence.

### Rule 5 — Step Screen Reveal Rule

Each Master Step Sequence step may render as one or more distinct **screens** inside the Bottom Sheet - e.g. Step 3 (Scheduling) is two screens (date, then hour), even though it is one step. A screen may show:

- any number of **informational blocks** (heading/subheading text, no pills) - always shown together as soon as the screen loads, and
- **exactly one question** (heading ± subheading + selectable pills).

Selecting a pill within that question may only reveal/update information already scoped to that same question (e.g. the price line after picking a service) - it must **never** reveal a new question. Advancing to the next screen (its own info blocks + next question) happens **only** when the user presses that screen's "הבא" (Next). This is why a step with more than one question (like Scheduling) must be split into that many screens, each with its own Next - never combined onto a single screen.

---

## 7. Edge Cases

- AI returns no match / user picks "אין התאמה" → no-match message + back-home CTA (confirmed).
- No selectable dates/slots within the 6-day window after excluding Fri/Sat (**Needs Confirmation** - undefined fallback).
- OTP delivery failure / timeout (**Needs Confirmation** - undefined exact UX; retry/resend is the minimum expected).
- User abandons flow mid-way (see Rule 4).

---

## Implementation Notes

- This document defines **what** is asked and **in what order**. The **how** (shared `BottomSheet` shell component, step orchestration pattern) belongs in `frontend-architecture.md` and `component-library.md`.
- Search entry path (match step + no-match end-state) is implemented as an overlay on Home — not a separate Next.js `page`.
- File location (confirmed): `docs/client-booking-flow-prd.md`.
