"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Phone } from "lucide-react";
import { BottomNavigation } from "@/components/shared/BottomNavigation";
import { ReportProblemSheet } from "@/components/client/orders/ReportProblemSheet";
import { CircleFloatButton } from "@/components/ui/CircleFloatButton";
import { ImageLightbox } from "@/components/ui/ImageLightbox";
import { Pill } from "@/components/ui/Pill";
import { StatusBar } from "@/components/ui/StatusBar";
import { COPY } from "@/lib/copy";
import { getCategoryBorderClass, getProfessionalCharacterSrc } from "@/lib/categoryVisuals";
import { formatJobDate, formatTimeWindow, isWithinHoursBefore } from "@/lib/formatDate";
import { getContextualStatusLabel, HISTORY_STATUSES } from "@/lib/jobStatus";
import { formatFinalPrice, formatPriceRange } from "@/lib/servicePricing";
import { ACTIVE_NOW_STATUSES } from "@/lib/queries/jobRow";
import { SUPPORT_PHONE_NUMBER } from "@/lib/support";
import type { ActiveJob } from "@/lib/types";

export interface JobDetailsScreenProps {
  job: ActiveJob | null;
  /**
   * Signed display URLs for this job's attached photos (0-3, upload
   * order) - see `fetchJobPhotoUrls` in `src/lib/queries/jobAttachments.ts`.
   * Fetched as its own screen-specific query rather than folded onto the
   * shared `ActiveJob` type, since no card kind needs it and the private
   * Storage bucket requires an async signed-URL exchange `ActiveJob`'s
   * other, synchronous mapping doesn't do.
   */
  photoUrls: string[];
}

/**
 * Attached-photo layout (72px each, 12px gap, up to 3 - see the photos row
 * below). The "ההערה שלך" note box opens at exactly this same total width
 * (240px = 72*3 + 12*2) per product direction, so it lines up with the
 * photo row beneath it rather than picking its own independent size -
 * defined here, derived from those same two numbers, so the two stay in
 * sync if the photo size/gap ever changes.
 */
const PHOTO_SIZE_PX = 72;
const PHOTO_GAP_PX = 12;
const MAX_PHOTOS = 3;
const NOTE_BOX_WIDTH_PX = PHOTO_SIZE_PX * MAX_PHOTOS + PHOTO_GAP_PX * (MAX_PHOTOS - 1);

/** "Call the professional" button appears starting this many hours before `scheduled_time` - see the block's own doc comment below. */
const CALL_BUTTON_HOURS_BEFORE = 2;

/**
 * Customer self-service cancellation cutoff - see
 * `docs/cancellation-and-rescheduling.md`'s "Customer-Side Cancellation"
 * (confirmed/revised 2026-10-01, was 1.5 hours). Drives
 * `canSelfServiceCancel` below, which decides which of the "נתקלת
 * בבעיה?" `Pill` (opens `ReportProblemSheet`'s two-option choice) or the
 * direct-dial "חייג לשירות לקוחות" `Pill` (skips straight to `tel:`,
 * no Sheet) actually renders.
 */
const CANCELLATION_CUTOFF_HOURS_BEFORE = 2;

/**
 * JobDetailsScreen - Flow 6 destination (`/orders/[jobId]` route), reached
 * from both `ClientHomeScreen`'s Active Job Card and `OrdersScreen`'s
 * cards. Rebuilt 2026-09-28 against a real Figma reference (node
 * 9220:6130) - an extension of everything `OrderCard` already shows, plus
 * the 2 fields no card shows (the booking-time note and attached photos).
 *
 * Deliberately has NO colored category card background (unlike every
 * other job surface in the app) - per this design, category is conveyed
 * by the professional-character illustration + label alone, not a tinted
 * `Card`.
 *
 * Two elements appear here for the first time anywhere in the app:
 * - `CircleFloatButton` - a real fixed overlay above scrolling content,
 *   staying both correctly pinned to the viewport *and* visually scoped to
 *   the `max-w-[480px]` column on desktop entirely on its own now (see its
 *   own doc comment, fixed 2026-09-30) - this screen doesn't need to do
 *   anything special to host it. (An earlier version had this screen's own
 *   root div carry `will-change-transform` for that scoping instead -
 *   removed the same day it turned out to have silently broken the
 *   button's "stays fixed while scrolling" guarantee, the entire reason it
 *   uses `fixed` at all; see `CircleFloatButton`'s doc comment for the
 *   full story.)
 * - The professional-character illustration gets a slow (4s), deep
 *   opacity pulse (fades to near-invisible, `animate-character-pulse`,
 *   `globals.css`) only while `job.status === "searching_professional"` -
 *   replacing an earlier
 *   static 3-dot indicator (`WaitingAnimation`, removed 2026-09-28) per
 *   product direction: the character itself "breathing" reads as
 *   "searching for a professional" more directly than generic loading
 *   dots, and its payoff (the pulse simply stopping, settling to fully
 *   opaque) doubles as the "found one!" moment once the status changes.
 *
 * "ההערה שלך" / "נתקלת בבעיה?" both start as `Pill` at its own default
 * styling (transparent background, `text-brand-primary`) - the same
 * "GhostButton" instance already used by `TimePillsRow` and `OrderRecap`'s
 * "שנה כתובת". **Hidden entirely once `HISTORY_STATUSES.includes(job.status)`**
 * (fixed 2026-09-30, reported live: it was showing on resolved
 * `completed`/`cancelled` jobs too) - "did something go wrong with this
 * appointment" isn't a real question once the job is already resolved one
 * way or another, same reasoning as the call button's own
 * `HISTORY_STATUSES` exclusion below.
 *
 * **"נתקלת בבעיה?" (built 2026-10-01, was a no-op stub before - see
 * `docs/cancellation-and-rescheduling.md`'s "Customer-Side Cancellation
 * UI" for the full confirmed design):** branches on
 * `canSelfServiceCancel` (derived from `CANCELLATION_CUTOFF_HOURS_BEFORE`,
 * currently 2 hours):
 * - **More than 2 hours before `scheduled_time`, or `status ===
 *   "searching_professional"` (unconditionally - no professional's
 *   calendar is locked in yet at that status, so there's nothing a late
 *   cancellation could disrupt):** renders as the ordinary "נתקלת
 *   בבעיה?" `Pill`, opening `ReportProblemSheet`. For `searching_professional`
 *   specifically, `cancelOnly` is also passed (confirmed 2026-10-01, per
 *   explicit product reasoning: "what's the likelihood of wanting to
 *   talk to support right after creating an order?") - skips the normal
 *   "מה תרצה לעשות?" two-option screen entirely, landing straight on the
 *   cancel-confirmation screen (no "ליצור קשר עם שירות הלקוחות" choice at
 *   all at this status - nothing committed yet for a human to get
 *   involved in). Every other qualifying status still gets the full
 *   two-option choice.
 * - **2 hours or less before `scheduled_time` (and not
 *   `searching_professional`):** the Pill itself is replaced by a direct
 *   `tel:` link, label "חייג לשירות לקוחות" (`callSupportButton`) -
 *   skips `ReportProblemSheet` entirely, since only one real action is
 *   left; the word "לבטל" deliberately never appears in this state (see
 *   that doc's "UI behavior" paragraph). Styled with the exact same
 *   classes `Pill` itself applies (not the `Pill` component directly -
 *   it only ever renders a `<button>`, and this needs a real `<a
 *   href="tel:">` for the same reason the call-professional button below
 *   is also a plain anchor, not a `Pill`).
 *
 * A successful cancel (`ReportProblemSheet`'s `onCancelled`) calls
 * `router.refresh()` - this is a Server Component page
 * (`/orders/[jobId]/page.tsx`), so there is no client-side job state to
 * update directly; refreshing re-runs `fetchJobById` and the newly
 * `cancelled` status then flows through every already-existing
 * `HISTORY_STATUSES` check on this screen on its own (status badge, this
 * very Pill disappearing, the service/price row's `cancelled` handling) -
 * nothing extra was needed here beyond the one `router.refresh()` call.
 *
 * "ההערה שלך" (added 2026-09-28) expands in place, replacing itself with a
 * read-only text box - same "expand-in-place" pattern `Combobox`/`NoteField`
 * already use, including click-outside-to-close (a document `click`
 * listener via `noteContainerRef` - deliberately `click`, not
 * `Combobox`'s `pointerdown`; see that effect's own doc comment, fixed
 * 2026-09-30, for why this screen specifically needs the difference). The box
 * is `Input`'s own box styling (`rounded-xl`, thin border) - not
 * `NoteField`'s pill/snackbar look - fixed at `NOTE_BOX_WIDTH_PX`
 * (240px, matching the photo row's width) but auto-height to however many
 * lines the note actually takes (plain text, not a real `<textarea>` -
 * this is read-only display of the booking-time note, not an edit field).
 * `noteOpen` is plain local state - closes on click-outside and resets to
 * closed on every fresh mount, so leaving and returning to this screen
 * always shows the collapsed link again. Its border color (`noteBorderClass`,
 * added 2026-09-29 - was a fixed `border-brand-primary`) is this job's own
 * category color instead (`getCategoryBorderClass`) - falls back to the
 * original brand blue for any category outside the 4 fixed ones.
 *
 * Each attached photo (added 2026-09-28) opens full-size in `ImageLightbox`
 * on tap - same scrim/dismiss pattern as `BottomSheet`, per product
 * direction, rather than only ever showing the small cropped 72px square.
 *

 * **Professional name + call button** (added 2026-09-29, Figma node
 * `9141:6135`): once a professional is assigned (`job.professionalName`
 * non-empty - the same signal `OrderCard`'s `showProfessionalName` already
 * relies on, since a `job_assignments` row only ever exists from
 * `confirmed` onward), their name renders directly under the category
 * label with an 8px gap (its own `flex-col gap-2` wrapper, distinct from
 * the screen's usual 40px inter-group gap), centered, `text-sm` regular -
 * matching the Figma reference exactly. Shown unconditionally as soon as
 * there's an assignment - never gated on time itself (confirmed
 * 2026-09-29: the name is visible immediately on confirmation, however far
 * out the appointment is).
 *
 * Below that, a circular call button (44px, `shadow-button`, lucide's
 * `Phone` icon - **not** a custom Figma-downloaded SVG, per explicit
 * correction 2026-09-29: icons here follow the same app-wide lucide
 * convention every other icon-only affordance uses, e.g. `IconButton`/
 * `CircleFloatButton`, not a one-off asset) appears once `job.professionalPhone`
 * is set AND `!HISTORY_STATUSES.includes(job.status)` (added 2026-09-29,
 * see below) AND `isWithinHoursBefore(job.scheduledTime,
 * CALL_BUTTON_HOURS_BEFORE)` is true. That last time check already covers
 * the "booked with less than 2 hours' notice" case for free - confirmation
 * for such a job only ever happens once it's already inside the 2-hour
 * window, so the button appears immediately alongside the name in that
 * case, with no separate branch needed. Renders as a real `tel:` link, not
 * a stub - `professionalPhone` is a real `public.users.phone` column/join
 * (`jobRow.ts`), so whatever phone a given professional's row actually has
 * (set manually by admin, per the MVP onboarding model) just works here;
 * only the *current test data* (this screen's seeded/dev jobs, and every
 * real job in this environment right now - see below) is placeholder, not
 * the wiring itself.
 *
 * **`HISTORY_STATUSES` exclusion (added 2026-09-29, explicit product
 * direction):** once a job is `completed`/`cancelled`/`incomplete_work`,
 * the call button never shows again, however recently it was resolved and
 * regardless of the 2-hour time check above (which, taken alone, would
 * happily show it forever for any past `scheduled_time` once one ever
 * passed - the "no upper bound" note that used to be here was describing
 * exactly that gap, now closed). This is a deliberate anti-disintermediation
 * measure: once there's no more reason for the customer to reach this
 * specific professional through the app, keeping their number visible only
 * invites contacting them directly for future work outside the platform.
 * The name (above) is unaffected - it's just a record of who did the job,
 * not a way to reach them.
 *
 * **Why you won't see this on any real order today:** every job in the
 * current Supabase data has no `job_assignments` row at all yet (no
 * professional app exists to create one) - `professionalName`/
 * `professionalPhone` are correctly empty for all of them, so this whole
 * block renders nothing, by design, until a real assignment exists (e.g.
 * via the `/dev/job-actions` harness's `accept_job`, once a test
 * professional row exists to accept as).
 *
 * **Service/price row visibility** (`showServiceRow`, fixed 2026-09-29):
 * same rule as `OrderCard`'s history-bucket row - shown for every
 * in-progress job (the usual `priceMin`-`priceMax` estimate range) and for
 * a `completed` job (its single real `finalPrice`), but hidden entirely
 * for `cancelled`/`incomplete_work` (no `finalPrice`, nothing was actually
 * charged) rather than falling back to a now-meaningless stale estimate.
 * A cancellation-reason field in that now-empty spot (e.g. "לא נמצא בעל
 * מקצוע") was explicitly considered and deferred per product direction
 * 2026-09-29 - see `docs/cancellation-and-rescheduling.md`'s "Cancellation
 * reason (planned, not yet built)" section for the reasoning.
 *
 * **Props:** `job` - sourced by `src/app/orders/[jobId]/page.tsx` from
 * `fetchJobById` (ownership-checked); `null` covers both "no such job" and
 * "not this customer's job". `photoUrls` - from `fetchJobPhotoUrls`,
 * always `[]` when `job` is `null`.
 */
export function JobDetailsScreen({ job, photoUrls }: JobDetailsScreenProps) {
  const router = useRouter();

  const characterSrc = job ? getProfessionalCharacterSrc(job.categoryColorKey) : null;
  const trimmedNote = job?.notes?.trim() ?? "";
  const isSearchingForProfessional = job?.status === "searching_professional";
  // See `CANCELLATION_CUTOFF_HOURS_BEFORE`'s doc comment above - whether
  // "נתקלת בבעיה?" still shows its normal two-option Sheet, or has
  // already been replaced by the direct-dial "חייג לשירות לקוחות" Pill.
  const canSelfServiceCancel = job
    ? isSearchingForProfessional || !isWithinHoursBefore(job.scheduledTime, CANCELLATION_CUTOFF_HOURS_BEFORE)
    : false;
  const [reportProblemOpen, setReportProblemOpen] = useState(false);
  // "ההערה שלך" box border, per this job's own category (added 2026-09-29 -
  // was a fixed `border-brand-primary`) - see `getCategoryBorderClass`.
  const noteBorderClass = job ? getCategoryBorderClass(job.categoryColorKey) : "border-brand-primary";

  // Service label + price row (added 2026-09-29, fixed 2026-09-29): shows
  // unconditionally for any job still in progress (range estimate, nothing
  // charged yet), but for a resolved (`HISTORY_STATUSES`) job only shows
  // when there's a real `finalPrice` - i.e. `completed`. A `cancelled`/
  // `incomplete_work` job has no price at all (nothing was done, nothing
  // was charged), so per explicit product direction the entire row
  // disappears rather than falling back to showing the stale estimate
  // range - mirrors `OrderCard`'s own `showServiceRow={job.finalPrice !=
  // null}` history-bucket behavior, just computed inline here since this
  // screen has no separate per-bucket call site.
  const showServiceRow = job ? !HISTORY_STATUSES.includes(job.status) || job.finalPrice != null : false;

  const [noteOpen, setNoteOpen] = useState(false);
  const noteContainerRef = useRef<HTMLDivElement>(null);

  // Which attached photo (by URL) is currently shown full-size in
  // `ImageLightbox`; `null` = closed. Just the URL, not an index - the
  // lightbox only ever needs the one already-known src to display.
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  // Click-outside-to-close - only listens while open, so it costs nothing
  // the rest of the time. Deliberately `click`, NOT `pointerdown` (unlike
  // `Combobox`'s otherwise-identical dropdown, fixed 2026-09-30, reported
  // live): this screen is a real scrolling page (unlike any Bottom Sheet
  // step, which per product decision never scrolls at all - see
  // `BottomSheet`'s own doc comment - so `Combobox`'s `pointerdown` never
  // faces this problem there). `pointerdown` fires the instant a finger
  // touches the screen, before the browser can tell a tap from the start
  // of a scroll - so starting to scroll anywhere outside the note (which,
  // on a page this long, is most of the screen) closed it immediately,
  // even with zero intent to interact with it at all. `click` doesn't
  // have this problem: browsers withhold the `click` event entirely once
  // there's been meaningful pointer movement between down and up - the
  // exact same signal the browser itself uses to distinguish a tap from a
  // scroll/drag - so a real tap outside the note still closes it (same
  // event type "ההערה שלך"'s own `onClick` already opens it with), but
  // starting to scroll past it no longer does.
  useEffect(() => {
    if (!noteOpen) return;
    const handleClick = (event: MouseEvent) => {
      if (noteContainerRef.current && !noteContainerRef.current.contains(event.target as Node)) {
        setNoteOpen(false);
      }
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [noteOpen]);

  return (
    <div className="relative flex w-full flex-1 flex-col items-center bg-surface-bg">
      <CircleFloatButton aria-label={COPY.bookingFlow.previous} onClick={() => router.back()} />

      <div className="flex w-full flex-1 flex-col items-center gap-10 px-4 pb-6 pt-10">
        {job ? (
          <>
            <div className="flex flex-col items-center gap-6">
              {characterSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={characterSrc}
                  alt=""
                  width={140}
                  height={210}
                  className={`h-[210px] w-[140px] object-cover ${
                    isSearchingForProfessional ? "animate-character-pulse" : ""
                  }`}
                />
              ) : (
                <div
                  className={`h-[210px] w-[140px] bg-surface-pill ${
                    isSearchingForProfessional ? "animate-character-pulse" : ""
                  }`}
                />
              )}
              <StatusBar
                variant={ACTIVE_NOW_STATUSES.includes(job.status) ? "active" : "default"}
                className="shadow-button"
              >
                {getContextualStatusLabel(job.status)}
              </StatusBar>
            </div>

            <div className="flex flex-col items-center gap-2">
              <p className="text-lg font-semibold leading-[1.4] text-text-primary">{job.categoryLabel}</p>
              {job.professionalName ? (
                <p className="text-sm leading-[1.4] text-text-primary">{job.professionalName}</p>
              ) : null}
              {job.professionalPhone &&
              !HISTORY_STATUSES.includes(job.status) &&
              isWithinHoursBefore(job.scheduledTime, CALL_BUTTON_HOURS_BEFORE) ? (
                <a
                  href={`tel:${job.professionalPhone}`}
                  aria-label={COPY.jobDetailsScreen.callProfessionalAriaLabel}
                  className="flex size-11 items-center justify-center rounded-full bg-surface-bg text-brand-primary shadow-button transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] active:scale-[0.96] active:brightness-95"
                >
                  <Phone size={24} strokeWidth={1.75} />
                </a>
              ) : null}
            </div>

            <div className="flex flex-col items-center gap-4">
              <div className="flex flex-col items-center gap-1">
                <p className="text-sm font-semibold leading-[1.4] text-text-primary">
                  {formatJobDate(job.scheduledTime)}
                </p>
                <p dir="ltr" className="text-sm font-semibold leading-[1.4] text-text-primary">
                  {formatTimeWindow(job.scheduledTime)}
                </p>
              </div>
              {showServiceRow ? (
                <div className="flex flex-col items-center gap-1">
                  <p className="text-sm leading-[1.4] text-text-primary">{job.serviceLabel}</p>
                  {/*
                    Single real `finalPrice` once set (added 2026-09-29, same
                    change/reasoning as `OrderCard`'s history row - a resolved
                    job has one concrete charged price, not an estimate range)
                    - falls back to the usual `priceMin`-`priceMax` range for
                    every job that hasn't been completed yet, i.e. every job
                    today, since no professional flow sets `final_price` yet.
                  */}
                  <p dir="ltr" className="text-sm leading-[1.4] text-text-primary">
                    {job.finalPrice != null ? formatFinalPrice(job.finalPrice) : formatPriceRange(job.priceMin, job.priceMax)}
                  </p>
                </div>
              ) : null}
              {trimmedNote ? (
                <div ref={noteContainerRef} className="flex flex-col items-center">
                  {noteOpen ? (
                    <p
                      style={{ width: NOTE_BOX_WIDTH_PX }}
                      className={`whitespace-pre-wrap rounded-xl border bg-surface-bg px-4 py-3 text-sm leading-[1.4] text-text-primary ${noteBorderClass}`}
                    >
                      {trimmedNote}
                    </p>
                  ) : (
                    <Pill className="font-semibold" onClick={() => setNoteOpen(true)}>
                      {COPY.jobDetailsScreen.yourNoteButton}
                    </Pill>
                  )}
                </div>
              ) : null}
              {photoUrls.length > 0 ? (
                <div className="flex items-center justify-center" style={{ gap: PHOTO_GAP_PX }}>
                  {photoUrls.map((url) => (
                    <button
                      key={url}
                      type="button"
                      aria-label={COPY.jobDetailsScreen.viewPhotoAriaLabel}
                      onClick={() => setLightboxSrc(url)}
                      style={{ width: PHOTO_SIZE_PX, height: PHOTO_SIZE_PX }}
                      className="overflow-hidden rounded-card bg-surface-pill transition-transform duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] active:scale-[0.96]"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="size-full object-cover" />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            {!HISTORY_STATUSES.includes(job.status) ? (
              canSelfServiceCancel ? (
                <Pill onClick={() => setReportProblemOpen(true)}>
                  {COPY.jobDetailsScreen.reportProblemButton}
                </Pill>
              ) : (
                // Same classes `Pill` itself applies - see this
                // component's doc comment on why this is a plain anchor,
                // not the `Pill` component (which only ever renders a
                // `<button>`).
                <a
                  href={`tel:${SUPPORT_PHONE_NUMBER}`}
                  aria-label={COPY.jobDetailsScreen.callSupportAriaLabel}
                  className="inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-full px-4 py-3 font-medium text-sm leading-[1.4] text-brand-primary transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] active:scale-[0.96] active:brightness-95"
                >
                  {COPY.jobDetailsScreen.callSupportButton}
                </a>
              )
            ) : null}

            <ReportProblemSheet
              open={reportProblemOpen}
              onClose={() => setReportProblemOpen(false)}
              jobId={job.id}
              cancelOnly={isSearchingForProfessional}
              onCancelled={() => router.refresh()}
            />
          </>
        ) : (
          <p className="w-full text-center text-sm text-text-secondary">{COPY.jobDetailsScreen.notFound}</p>
        )}
      </div>

      <div className="sticky bottom-0 flex w-full flex-col items-center bg-surface-bg">
        <div className="h-px w-full bg-divider" />
        <BottomNavigation activeTab="orders" />
      </div>

      <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
    </div>
  );
}
