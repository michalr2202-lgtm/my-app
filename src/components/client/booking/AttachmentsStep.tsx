"use client";

import { useEffect, useRef, useState } from "react";
import { Image, StickyNote, X } from "lucide-react";
import { BookingStepFooter } from "@/components/client/booking/BookingStepFooter";
import { NoteField } from "@/components/client/booking/NoteField";
import { COPY } from "@/lib/copy";

const MAX_PHOTOS = 3;

export interface AttachmentsStepProps {
  /** Restores the note when returning to this screen via "הקודם". */
  initialNote?: string;
  /** Restores selected photos when returning to this screen via "הקודם". */
  initialPhotos?: File[];
  onNext: (note: string, photos: File[]) => void;
  /** Omit on the first screen shown in a path; see BookingFlowSheet's history stack. */
  onPrevious?: () => void;
  /**
   * Mirrors the current draft up to the orchestrator on every change, not
   * just on "הבא" - "הקודם" calls `onPrevious` directly without going
   * through `onNext`, so without this the orchestrator's `initialNote`/
   * `initialPhotos` would still be empty/stale the next time this screen
   * is reached, losing whatever was typed/added before navigating back.
   */
  onDraftChange?: (note: string, photos: File[]) => void;
}

/**
 * Attachments step (Step 4 - client-booking-flow-prd.md; visuals per Figma
 * node 8426:6072; trigger-row icon/color refined 2026-09-03 per Figma node
 * 8615:6739). One single screen, two independent optional affordances
 * (notes, photos) always visible together - never a second question hidden
 * behind the first, so the flow never needs to "ask about photos later"
 * just because the user only touched notes (or vice versa). The whole step
 * is optional, so "הבא" is always enabled.
 *
 * The add-note/add-photos rows reuse NotificationBanner's exact visual
 * language ("Snackbar but Cooler" in Figma - bg-surface-notification +
 * shadow-notification, rounded-full, icon-first RTL row with pr-6/gap-2/pl-3
 * padding) rather than the neutral bg-surface-pill used by selectable pills
 * elsewhere in this flow: these are action triggers, not selection chips,
 * and a full-width row in the sheet's default darker pill-gray reads as too
 * heavy - the same reasoning that led to the lighter surface-notification
 * token for the Home Screen banner applies here.
 *
 * Both trigger rows are `text-brand-primary` for icon AND label (refined
 * 2026-09-03, was `text-text-primary` label + generic `Plus`/`ImagePlus`
 * icons) - see design-system.md's "Text/icon color for interactive rows"
 * decision: these two rows are genuine actions (open the note editor, open
 * the native photo picker), not tappable content, so they get the same
 * blue as any other CTA in the app. `StickyNote`/`Image` are the exact
 * glyphs Figma uses (a plain image icon, not `ImagePlus` - the "add" intent
 * is already carried by the row's label and position, not the icon itself).
 * The already-filled note chip below is the deliberate contrast case: its
 * own note *text* stays `text-text-primary` (it's just displaying content
 * the user typed), while the Trash2/Pencil icons right next to it stay
 * `text-brand-primary` (deleting/editing genuinely are actions) - one row,
 * both rules, side by side.
 *
 * Notes auto-save to local state on every keystroke (no separate "שמירה"
 * step, consistent with how every other answer in this flow is captured).
 * The editing-textarea + filled-chip pair is `NoteField` (extracted
 * 2026-09-06) - this screen keeps only the trigger button and the local
 * `noteOpen`/`note` state; `CategoryServiceStep`'s "אחר" field reuses the
 * same `NoteField` for its own textarea/chip, per product decision.
 * Photos are held here as File objects for client-side preview only
 * (object URLs, max 3) - actual upload to Supabase Storage is intentionally
 * not wired yet (no bucket/policy defined, and the Order doesn't exist
 * until Step 7). TODO once storage exists: start the per-image upload
 * described in the PRD's States section as soon as a photo is added, not
 * deferred to submit.
 *
 * Always advances via `"הבא"` - never terminal itself. An earlier version
 * rendered `OrderRecap` inline here (with the footer swapping to `"שלח
 * הזמנה"`) whenever this screen ended up last for a given user; that was
 * moved out to a dedicated `ConfirmStep` (2026-08-21) after this combined
 * layout was observed overflowing `BottomSheet`'s `max-h-[92dvh]` on a
 * laptop viewport - see `ConfirmStep`'s doc comment.
 */
export function AttachmentsStep({
  initialNote = "",
  initialPhotos = [],
  onNext,
  onPrevious,
  onDraftChange,
}: AttachmentsStepProps) {
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState(initialNote);
  const [photos, setPhotos] = useState<File[]>(initialPhotos);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [photoPreviews, setPhotoPreviews] = useState<{ file: File; url: string }[]>([]);

  useEffect(() => {
    // Object URLs are created here (inside the effect), not via useMemo
    // during render: in Strict Mode, React mounts every effect twice
    // (setup -> cleanup -> setup) to surface exactly this class of bug. A
    // useMemo-computed URL would get revoked by the first cleanup pass and
    // never recreated, leaving <img> pointing at a dead blob: URL until
    // something else (e.g. adding/removing a photo) recomputed the memo -
    // which matched the reported symptom of thumbnails/notes rendering
    // empty right after navigating back into this step until any change
    // was made.
    //
    // `setPhotoPreviews` below is what trips `react-hooks/set-state-in-
    // effect` - deliberately suppressed (confirmed 2026-09-07, re-checked
    // against the two genuinely-fixable cases that same day in
    // `BookingFlowSheet.tsx`/`Combobox.tsx`), not left by oversight: this
    // effect IS synchronizing with a real external system (the browser's
    // object-URL lifecycle, create paired with revoke), which is exactly
    // what `useEffect` is for - the rule can't distinguish that from
    // "trivial derived state," and the actual bug-free alternative (a
    // ref-keyed URL cache read via `useMemo`, cleaned up in a separate
    // effect with no `setState` at all) added real complexity for zero
    // behavioral improvement over this already-working, already-tested
    // version.
    const previews = photos.map((file) => ({ file, url: URL.createObjectURL(file) }));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPhotoPreviews(previews);
    return () => {
      previews.forEach(({ url }) => URL.revokeObjectURL(url));
    };
  }, [photos]);

  useEffect(() => {
    onDraftChange?.(note, photos);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note, photos]);

  const handleFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newFiles = Array.from(files);
    setPhotos((current) => [...current, ...newFiles.slice(0, MAX_PHOTOS - current.length)]);
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((current) => current.filter((_, i) => i !== index));
  };

  const trimmedNote = note.trim();
  const photosMaxed = photos.length >= MAX_PHOTOS;

  return (
    <div className="flex w-full flex-col gap-10">
      <div className="flex w-full flex-col gap-4">
        <div className="flex w-full flex-col gap-2 text-right text-text-secondary">
          <p className="w-full text-lg font-semibold leading-[1.4]">
            {COPY.bookingFlow.attachments.heading}
          </p>
          <p className="w-full text-sm leading-[1.4]">{COPY.bookingFlow.attachments.subheading}</p>
        </div>

        <div className="flex w-full flex-col gap-3">
          {noteOpen || trimmedNote ? (
            <NoteField
              value={note}
              onChange={setNote}
              open={noteOpen}
              onOpenChange={setNoteOpen}
              placeholder={COPY.bookingFlow.attachments.notePlaceholder}
              editAriaLabel={COPY.bookingFlow.attachments.noteEditAriaLabel}
              deleteAriaLabel={COPY.bookingFlow.attachments.noteDeleteAriaLabel}
            />
          ) : (
            <button
              type="button"
              onClick={() => setNoteOpen(true)}
              className="flex w-full items-center gap-2 rounded-full bg-surface-notification py-3 pl-3 pr-6 shadow-notification transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] active:scale-[0.96] active:brightness-95"
            >
              <StickyNote size={24} strokeWidth={1.75} className="shrink-0 text-brand-primary" />
              <p className="min-w-0 flex-1 text-right text-sm font-medium leading-[1.4] text-brand-primary">
                {COPY.bookingFlow.attachments.addNoteButton}
              </p>
            </button>
          )}
        </div>

        <div className="flex w-full flex-col gap-4">
          <button
            type="button"
            disabled={photosMaxed}
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full items-center gap-2 rounded-full bg-surface-notification py-3 pl-3 pr-6 shadow-notification transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] active:scale-[0.96] active:brightness-95 disabled:pointer-events-none"
          >
            <Image
              size={24}
              strokeWidth={1.75}
              className={`shrink-0 ${photosMaxed ? "text-text-secondary" : "text-brand-primary"}`}
            />
            <p
              className={`min-w-0 flex-1 text-right text-sm font-medium leading-[1.4] ${
                photosMaxed ? "text-text-secondary" : "text-brand-primary"
              }`}
            >
              {COPY.bookingFlow.attachments.addPhotosButton}
            </p>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            /* sr-only, not `hidden` (display:none) - a display:none file
               input is unreliable to trigger programmatically (fileInputRef
               .click()) on some mobile browsers/webviews, which was the
               root cause of photo selection intermittently adding 0-1
               photos instead of up to MAX_PHOTOS. */
            className="sr-only"
            onChange={(event) => {
              handleFilesSelected(event.target.files);
              event.target.value = "";
            }}
          />

          {photosMaxed ? (
            <p className="w-full text-right text-sm leading-[1.4] text-text-secondary">
              {COPY.bookingFlow.attachments.maxPhotosReached}
            </p>
          ) : null}

          {photoPreviews.length > 0 ? (
            <div className="flex w-full flex-wrap items-start justify-start gap-4">
              {photoPreviews.map(({ url }, index) => (
                <div key={url} className="relative size-20 overflow-hidden rounded-card bg-surface-pill">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="size-full object-cover" />
                  <button
                    type="button"
                    aria-label={COPY.bookingFlow.attachments.photoDeleteAriaLabel}
                    onClick={() => handleRemovePhoto(index)}
                    className="absolute left-1 top-1 flex size-5 items-center justify-center rounded-full bg-overlay-scrim text-surface-bg transition-transform duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] active:scale-[0.96]"
                  >
                    <X size={12} strokeWidth={2} />
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <BookingStepFooter
        onPrevious={onPrevious}
        nextLabel={COPY.bookingFlow.attachments.next}
        onNext={() => onNext(trimmedNote, photos)}
      />
    </div>
  );
}
