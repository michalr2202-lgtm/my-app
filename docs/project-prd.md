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
- For jobs where the customer selected a specific future date/time: standard "Pending" queue behavior, no urgency deadline.
- For "Now" (immediate) jobs: broadcast simultaneously to all eligible professionals in the matching category (not sequential) - see "Immediate ('Now') Job Matching" below.

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
- Past jobs (last 3–5)

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
- id
- phone (unique)
- first_name
- last_name
- gender
- email (optional)
- role (customer / professional)
- created_at

### addresses
- id
- user_id
- city
- street
- building_number
- apartment
- entrance_code
- is_default

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
