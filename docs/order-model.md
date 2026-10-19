# Order Model

---

# Document Scope

This document defines the business model of an Order.

It does not define:

- UI
- User flows
- Screen layouts
- Bottom Sheets
- Database implementation
- API contracts

Those concepts are documented elsewhere.

This document defines only the business structure of an Order.

---

## Purpose

This document defines the business structure of an Order.

It is intentionally independent from:

- UI
- Screens
- Bottom Sheets
- Components
- Database implementation

Its purpose is to describe the Order as the central business object of the platform.

This document evolves together with the product.

Only document decisions that have been confirmed.

Never speculate.

---

# Core Principle

Everything in the application revolves around a single Order.

Customers create Orders.

Professionals receive Orders.

Notifications reference Orders.

Payments belong to Orders.

Statuses belong to Orders.

Support handles Orders.

Analytics measure Orders.

The Order is the primary business entity of the system.

---

# Order Lifecycle

Every Order progresses through predefined business states.

Initial lifecycle:

Draft

↓

Searching Professional

(the job has been broadcast to eligible professionals in the matching category; see `project-prd.md` Section 5 for matching behavior, including the "Now" job deadline)

↓

Pending Approval

(a professional has accepted; brief transitional state before the assignment is finalized. This does not require any action or approval from the customer - the name refers to the professional's acceptance, not a customer decision)

↓

Confirmed

↓

Professional On The Way

↓

Professional Arrived

↓

Work In Progress

↓

Completed

Possible alternative states:

Cancelled

Rescheduled

Waiting for Customer

Waiting for Professional

Incomplete Work

Future states may be added only after product decisions.

---

## Confirmed Transition Graph (v1)

The lifecycle above describes the happy path plus a flat list of
"possible alternative states" - it does not say *from* which state each
alternative may be entered, or what may follow it. As of 2026-09-09 this
is now enforced in code (`supabase/sql/job_transitions.sql`'s
`accept_job`/`advance_job_status` RPCs, mirrored for UI-filtering in
`src/lib/jobStatusTransitions.ts`), so this section documents exactly
what that code enforces. Status names below use the DB/`JobStatus`
snake_case form (e.g. `on_the_way`), not this document's Title Case
labels, since this section is specifically about the enforced graph.

- `draft` → `searching_professional` only (via `submit_booking`, not a
  status-transition RPC - a job is created directly in
  `searching_professional`, never actually created as `draft` today)
- `searching_professional` → `confirmed` (via `accept_job` only, first
  professional to accept wins), `cancelled`
- `pending_approval` - unreachable in practice; `accept_job` intentionally
  skips modeling it as its own step (see "Initial lifecycle" above)
- `confirmed` → `on_the_way`, `cancelled`, `rescheduled`
- `on_the_way` → `arrived`, `waiting_for_customer`, `cancelled`,
  `rescheduled`
- `arrived` → `in_progress`, `waiting_for_customer`, `cancelled`,
  `rescheduled`
- `waiting_for_customer` → `on_the_way`, `arrived`, `cancelled` (resumes
  into whichever of the two it paused from)
- `in_progress` → `completed`, `rescheduled`, `waiting_for_professional`,
  `cancelled`
- `waiting_for_professional` → `in_progress`, `cancelled`
- `rescheduled` → `confirmed` (once a new `scheduled_time` is set,
  rejoins the normal happy path)
- `completed`, `cancelled` - terminal, no outgoing transitions

### Confirmed decisions behind this graph

- **`cancelled` is permanently terminal** - once cancelled, a job can
  never be revived into any other status (confirmed by the customer,
  2026-09-09).
- **`rescheduled` always resolves back to `confirmed`** once a new time is
  set - this is also the path for "professional started the job but
  couldn't finish it this session" (`in_progress` → `rescheduled`,
  confirmed 2026-09-09), and for "ran into a problem before starting
  work" (`on_the_way`/`arrived` → `rescheduled`, confirmed for
  `on_the_way` 2026-09-09; extended to `arrived` as the same kind of
  moment, not separately confirmed - see open questions below).
- **Enforcement is intentionally two-layered** (customer decision,
  2026-09-09): the RPCs are the source of truth and reject illegal
  transitions outright; any UI (today, the dev-only test harness at
  `src/app/dev/job-actions/page.tsx`; later, the real professional app)
  only ever offers the currently-valid next statuses, so a legitimate
  user never hits the backend's rejection in normal use.

### Open questions (not yet decided - do not build against these)

- **Cancellation cutoff.** Whether *who* is cancelling (customer vs.
  professional) and a time-based point after which cancellation must go
  through customer support instead of the app, rather than being
  possible from the app at all - v1 allows `cancelled` from every
  non-terminal status above as a placeholder, not a real rule. The
  business rules for this (confirmed customer-side window, partially-open
  professional-side window, and the customer-service escalation path) now
  live in [docs/cancellation-and-rescheduling.md](cancellation-and-rescheduling.md)
  - that document, not this bullet, is the source of truth going forward.
- **Known mismatch (confirmed 2026-09-10, not yet fixed in code):** every
  `→ cancelled` edge in the graph above is written as if "cancel" always
  means the terminal, irreversible ending. It does not - a *professional*
  cancelling a job they'd already confirmed should return the job to
  `searching_professional` instead (the customer still wants the service,
  just needs a different professional), while a *customer* cancelling
  still ends in terminal `cancelled`. The RPCs can't yet tell these two
  triggering actions apart (no professional session/role exists), so this
  is deliberately left unfixed rather than guessed at - see
  [docs/cancellation-and-rescheduling.md](cancellation-and-rescheduling.md)'s
  "Reassignment on Professional Cancellation" section for the full
  reasoning.
- **`incomplete_work`'s fate.** This status still exists in `JobStatus`
  but is unreachable in the graph above - "didn't finish this session"
  now routes through `rescheduled` instead (see above). Whether
  `incomplete_work` is removed from `JobStatus` entirely, or repurposed
  for something else, is undecided.
- **Full professional-side "ran into a problem" flow.** The graph above
  only models the resulting status transition (`on_the_way`/`arrived` →
  `rescheduled` or `cancelled`); the actual professional-facing
  screen/flow that triggers it has not been designed yet.

---

# Order Sections

An Order is composed of logical information groups.

Current groups:

## Service Information

Describes what service the customer needs.

---

## Scheduling

Stores all date and time related information.

---

## Location

Stores where the service will be performed.

---

## Customer Information

Information provided by the customer.

---

## Professional Information

Information related to the assigned professional.

---

## Attachments

Images and files related to the Order.

May include:

- Customer images
- Professional work images

---

## Pricing

Price estimation.

Final price.

Payment information.

---

## Status

Current business status.

Status history.

Future timestamps.

---

# Data Ownership

Each section has an owner.

| Section | Created By | May Update |
|----------|------------|------------|
| Service Information | Customer | Customer (until confirmation) |
| Scheduling | Customer | Customer (until confirmation) |
| Location | Customer | Customer |
| Customer Information | Customer | Customer |
| Professional Information | System | System |
| Attachments (Customer) | Customer | Customer |
| Attachments (Professional) | Professional | Professional |
| Pricing | Professional / System | Professional / System |
| Status | System | System |

---

# Relationship With Booking Flow

The Booking Flow determines:

- which information is requested
- in what order

The Order Model does not define UI.

It only defines the business object that receives the collected information.

---

# Relationship With Bottom Sheets

Bottom Sheets collect Order information.

Each Bottom Sheet must define:

- what information is collected
- which Order section it belongs to

Every question presented to the customer must eventually update the current Order Draft.

---

# Order Draft

Before an Order is created, the application maintains an Order Draft.

The Order Draft is progressively updated after every completed booking step.

Only after all required information has been collected is the Draft converted into a real Order.

The exact fields of the Draft are intentionally not documented yet.

They will be introduced gradually as booking screens are implemented.

---

# Documentation Rules

Do not document fields before they exist.

Do not invent database columns.

Do not infer API structures.

Only document confirmed business concepts.

As new booking steps are implemented, update this document accordingly.

This document should evolve together with the product.