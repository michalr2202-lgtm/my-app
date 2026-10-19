# Cancellation & Rescheduling

---

## Document Scope

This document governs **when and who can cancel or trigger a reschedule**,
and what happens as a result of that action.

It does not define the status-transition mechanics themselves (which
status can move to which) - those stay in
[docs/order-model.md](order-model.md)'s "Confirmed Transition Graph
(v1)" section. This document only adds the *business rules* layered on
top of that graph: time windows, who is allowed to act, and what happens
next.

This document evolves together with the product. As with
`order-model.md`: only document decisions that have been confirmed.
Never speculate - open items are listed explicitly in their own section
below rather than guessed at.

---

## Customer-Side Cancellation

**Confirmed (updated 2026-10-01, was 1.5 hours - see "Revision" below):**
self-service cancellation via the app ("נתקלת בבעיה?" → "לבטל הזמנה" on
`JobDetailsScreen`) is allowed up to **2 hours before the scheduled
window's start time**, and **only once the job actually has a committed
appointment** - i.e. `confirmed`/`pending_approval`/`rescheduled` and
every status after (the "active now" statuses too, though by the time a
job reaches those the 2-hour check below is essentially always already
true on its own). **Not** gated at all for `searching_professional` - no
professional's calendar is locked in yet at that stage, so there is
nothing a late cancellation could disrupt; the app always allows an
instant self-service cancel for that status regardless of how close
`scheduled_time` is.

Example: a `confirmed` job scheduled for the 15:00-16:00 window can be
self-cancelled through the app until 13:00.

**Revision (2026-10-01):** the original 1.5-hour figure above was
confirmed before this document's reasoning for *why* a cutoff exists at
all was fully articulated. Revisited once that reasoning was made
explicit: unlike the professional-side cutoff (an *operational* need -
there must be enough lead time left for a human to find a replacement),
the customer-side cutoff exists purely to introduce *friction* - once a
professional's calendar is already locked in for a specific time, a
cancellation close to that time should require an actual conversation
with a human (customer service), not feel like a consequence-free
button tap. 2 hours was chosen over the original 1.5 specifically to make
that friction meaningful (close enough to the professional's own
best-guess 2-3 hour cutoff that the "once we're inside the window,
cancelling - by either party - requires a human conversation" framing
holds for both sides at roughly the same point), while deliberately not
going as far as 3 hours, to avoid routing routine, non-disruptive
last-minute cancellations into a mandatory phone call.

**Confirmed (2026-10-01) - UI behavior once inside the 2-hour window:**
the self-service "לבטל הזמנה" option disappears entirely rather than
staying visible but redirecting - see `JobDetailsScreen`'s "נתקלת
בבעיה?" entry below for the exact mechanism (the trigger itself changes
to a direct "חייג לשירות לקוחות" dial action, skipping the two-option
Bottom Sheet altogether, since only one real action remains). The word
"לבטל" must not appear anywhere on screen in this state at all - a
deliberate choice to avoid even passively suggesting cancellation is an
available action once it isn't really a casual one anymore.

**Resolved (2026-10-01):** the support contact value is
`src/lib/support.ts`'s `SUPPORT_PHONE_NUMBER` - **currently a real
personal phone number, used only as a temporary placeholder.** The
product owner wants a real forwarding/"1-700"-style business number
instead (so her real number is never the one actually shown/dialed by
customers), which requires signing up with an actual telecom/VoIP
provider - that real-world setup step hasn't happened yet. Swap that one
constant once it has; nothing else needs to change at either call site.

**Known gap, not fixed (found 2026-10-01 while implementing the below):**
this scope line (`confirmed`/`pending_approval`/`rescheduled` and later)
assumed every one of those statuses could reach `cancelled` via
`advance_job_status`. `searching_professional`/`pending_approval` were
missing from that RPC's graph and have now been added (see
`job_transitions.sql`'s own comment) - but `rescheduled` was NOT, since
doing so would contradict the separately-confirmed "`rescheduled` always
resolves back to `confirmed`" decision (`order-model.md`). A
`rescheduled` job that happens to be more than 2 hours out would
currently show the normal two-option Sheet and let the customer pick
"לבטל הזמנה," only to hit a server-side error on confirm. Not fixed here
since `rescheduled` cannot occur in any real data today (no professional
app exists yet to put a job there) - revisit once it can.

---

## Customer-Side Cancellation UI (`JobDetailsScreen`'s "נתקלת בבעיה?")

**Confirmed and built (2026-10-01).** `JobDetailsScreen`'s existing
"נתקלת בבעיה?" `Pill` (previously a no-op stub, see `component-library.md`)
is now the entry point for both cancelling and reaching support -
replacing the stub with real behavior, which itself branches on the
2-hour window above. See `component-library.md`'s `ReportProblemSheet`
entry for the exact implementation (3 internal phases: choose → confirm
cancel / show support number).

**More than 2 hours before `scheduled_time`:** tapping "נתקלת בבעיה?"
opens a plain `BottomSheet` (this screen's first use of it - previously
booking-flow-only), title **"מה תרצה לעשות?"**, with two `Pill`s side by
side below it: **"לבטל הזמנה"** and **"ליצור קשר עם שירות הלקוחות"**.
Deliberately no reason-capture field of any kind here, unlike whatever
the eventual professional-side "ran into a problem" flow turns out to
need (not yet designed - see `order-model.md`) - there is no downstream
consumer for a customer-supplied cancellation reason today, consistent
with "Cancellation Reason (Client-Facing Display)" above already being
deferred for the same kind of reason. Tapping "לבטל הזמנה" asks for an
explicit confirmation (a second, final step - *not* an instant cancel on
the first tap, since `cancelled` is permanently terminal per
`order-model.md`) before actually calling `advance_job_status`.

**Confirmed (2026-10-01) - `searching_professional` is cancel-only, no
choice screen at all:** unlike every other qualifying status above, a
`searching_professional` job skips the two-option "מה תרצה לעשות?"
screen entirely - "נתקלת בבעיה?" lands straight on the cancel-
confirmation screen, with no "ליצור קשר עם שירות הלקוחות" option anywhere
in the flow. Reasoning (customer's own, 2026-10-01): no professional is
committed yet at this status, so there's nothing for a human at customer
service to actually help with - "what's the likelihood of wanting to
talk to support right after creating an order?" This is in addition to
(not instead of) `searching_professional` already being unconditionally
self-cancelable regardless of the 2-hour window above.

**Revised (2026-10-01, during implementation):** "ליצור קשר עם שירות
הלקוחות" does **not** dial directly the instant it's tapped on the
`"choose"` screen either - by the same reasoning as "לבטל הזמנה" just
above (a stray tap inside this two-option menu must never silently
place a phone call), it instead advances to one further in-Sheet screen
first: title "שירות הלקוחות" with the real number shown as the actual
`tel:` link - only *that* second tap (on the number itself) places the
call.

**2 hours or less before `scheduled_time`** (and status is not
`searching_professional`): the `Pill` itself changes - label becomes
**"חייג לשירות לקוחות"**, and tapping it skips the Bottom Sheet
entirely and dials support directly. No menu is shown because there is
only one real action left; showing "לבטל הזמנה" as a dead end (visible
but redirecting elsewhere) was explicitly rejected in favor of not
offering it at all once it isn't a real option - see the "UI behavior"
paragraph above. The word "לבטל" never appears in this state.

**Still open:**
- The exact support contact value (phone number or other) - same open
  item as above, shared by both states.
- Whether a cancellation performed this way should capture a reason at
  all (currently: no) - revisit if/once there's a real downstream use
  for one (see "Cancellation Reason" section above).

---

## Professional-Side Cancellation

**Partially open:** cancellation via the app/button is allowed up to
some cutoff before the scheduled window's start time. The current
best-guess figure is **2-3 hours before start**, but this range is
**explicitly not finalized** - do not build against it as a confirmed
number.

**Confirmed:** once that cutoff has passed, the cancel action is **not
available to the professional through the app at all**. From that point,
cancellation only happens by the professional calling customer service
directly, so a human can, given how close to the job time it is:

- personally look for a replacement professional, and
- personally call the customer to let them know.

This is a deliberate difference from the customer-side flow above - a
late professional cancellation is treated as materially more disruptive
(the customer is expecting someone to arrive soon) than a late customer
cancellation.

**Confirmed (2026-09-10):** a professional cancelling a job **does not
use the terminal `cancelled` status at all** - see "Reassignment on
Professional Cancellation" immediately below.

---

## Reassignment on Professional Cancellation

**Confirmed (2026-09-10):** when a professional cancels a job they had
already confirmed (before their app cutoff above), the job does **not**
move to the terminal `cancelled` status. It moves back to
`searching_professional`, so another professional can pick it up - the
customer still wants the service, they just need a different
professional. This is a materially different action from a *customer*
cancelling (who no longer wants the service at all, and does end in
terminal `cancelled`) - both currently share the label "cancel" in the
dev test harness, but they are not the same business event.

**Known code/doc mismatch - not yet fixed:** `advance_job_status`'s v1
graph (`supabase/sql/job_transitions.sql`, documented in
[order-model.md](order-model.md)'s "Confirmed Transition Graph (v1)")
currently routes `confirmed → cancelled` (and every other `→ cancelled`
edge) to the terminal status regardless of who triggered it or why. That
graph needs a real update once there is a way to distinguish "customer
cancelled entirely" from "professional backed out of a confirmed job" -
deliberately not fixed yet, since doing so before the professional app
exists (and can actually tell the RPC which of the two happened) risks
guessing at the wrong shape.

**Still open - not detailed yet:**
- The exact matching/rebroadcast mechanics once a job returns to
  `searching_professional` this way (does it get the same matching
  deadline as a fresh job? See [project-prd.md](project-prd.md) §5
  ("Professional Flow") for the original broadcast logic this would
  build on) - not decided.
- Whether a professional backing out *after* their app cutoff (i.e. via
  the customer-service escalation path above) also results in
  `searching_professional`, or something else, once support has already
  gotten involved.

---

## Incomplete Work → New Date

**Partially confirmed.** [order-model.md](order-model.md)'s "Confirmed
Transition Graph (v1)" already documents the status mechanics for this
case: `in_progress` → `rescheduled` → `confirmed` once a new
`scheduled_time` is set - this is the path for "the professional started
the job but couldn't finish it this session."

**Open - not detailed yet:** the actual *coordination* flow around that
transition - who proposes the new date/time, how the customer confirms
or adjusts it, and any professional-side scheduling/calendar interaction
- is not yet designed. Only the end-state status transition is decided
today.

---

## Cancellation Reason (Client-Facing Display)

**Confirmed (2026-09-29): deferred, not built yet.** `JobDetailsScreen`
hides the service-label/price row entirely for a `cancelled`/
`incomplete_work` job (no `final_price` - nothing was charged, so nothing
real to show there). The idea of using that now-empty spot to instead show
*why* the job was cancelled (e.g. "לא נמצא בעל מקצוע" / no professional
found, or one of the several other real causes a professional might log
on-site) was raised and explicitly deferred rather than built as a
placeholder.

**Why deferred instead of a hardcoded placeholder string:** a cancellation
can happen for materially different reasons - the customer cancelling
directly, the system giving up after no professional accepted in time, or
a professional who arrived and couldn't complete the job for any number of
their own reasons (wrong parts, access issue, etc. - see
[order-model.md](order-model.md)'s "Full professional-side 'ran into a
problem' flow" open item, still undesigned). A single fixed placeholder
shown for every cancellation would misrepresent most of them - actively
misleading, not just incomplete - so showing nothing (today's behavior) is
preferable until there's a real reason to show.

**Planned shape, once built:** a real `cancellation_reason` column (or
similar - exact shape TBD), populated by whichever flow actually triggers
the cancellation:
- the customer's own in-app cancel action could capture a reason
  code/free-text at that point;
- the professional-side "ran into a problem" flow (not yet designed -
  see `order-model.md`) would supply its own, once it exists.

`JobDetailsScreen` would then show that real value in place of the
service/price row specifically for `cancelled`/`incomplete_work` jobs that
have one - same "real column, correctly absent until the producing flow
exists" pattern as `professionalPhone`/`final_price` elsewhere in this
codebase, not a new pattern.

---

## Open Questions

Collected here for visibility - none of these should be treated as
decided:

1. Exact professional-side cancellation cutoff (current best guess:
   2-3 hours before scheduled start; not finalized).
2. ~~What the customer sees/can do after their own cutoff has passed~~ -
   resolved and built 2026-10-01, see "Customer-Side Cancellation UI"
   above.
3. Rebroadcast/matching-deadline mechanics when a job returns to
   `searching_professional` after a professional backs out.
4. The new-date coordination flow following incomplete work.
5. Whether professional cancellation past the app cutoff (support
   escalation) still results in `searching_professional`, or something
   else.
6. **Code fix still pending:** `job_transitions.sql`'s `advance_job_status`
   currently sends every `→ cancelled` edge to the real terminal
   `cancelled` status, with no way yet to route a professional's
   "backed out of a confirmed job" action to `searching_professional`
   instead (no professional session/role exists to distinguish the two
   triggering actions) - see "Reassignment on Professional Cancellation"
   above.
7. Whether this document should later be split into separate
   customer-side and professional-side documents, if it grows large
   enough to warrant that. Deliberately not decided now - revisit only
   if this single document becomes unwieldy.
