# Component Library

Documents components introduced while building the Client Home Screen (`/docs/home-screen-prd.md`). Update this file whenever a reusable component is added or changed on a future screen — do not duplicate an existing entry's functionality without reusing it first.

---

## `components/ui` — primitives

### `Pill`
`src/components/ui/Pill.tsx`

Generic rounded-full button primitive.

- **Layout:** `rounded-full`, `px-4 py-3` (16/12px), hug-width, no max-width (wraps its text as one line, `whitespace-nowrap`).
- **Typography:** `text-sm font-medium tracking-[0.21px] leading-[1.4]`.
- **Props:** `children`, `colorClassName` (default `bg-surface-pill text-brand-primary`), `style`, plus all native `<button>` props (`onClick`, `disabled`, ...).
- **States:** default, `active:scale-[0.96] active:brightness-95` (pressed), `disabled:opacity-50`.
- **Used by:** `TimePill` (via `TimePillsRow`), `ServicePill`, `ExpandServicesButton` (Popular Services show more/less toggle).

### `Button`
`src/components/ui/Button.tsx`

Full-width-capable rounded CTA.

- **Props:** `children`, `variant` (`sheetNext` | `sheetPrevious` | `primary`), plus native `<button>` props.
- **`sheetNext`:** Bottom Sheet mid-flow CTA. Inactive/disabled = `bg-surface-pill text-text-secondary`. Active/enabled = `bg-surface-selected text-brand-primary`.
- **`sheetPrevious`:** Bottom Sheet mid-flow secondary action, paired next to `sheetNext` in a row (`BookingStepFooter`). Transparent background, `text-brand-primary`, always rendered active — no disabled state.
- **`primary`:** brand-filled CTA (`bg-brand-primary text-surface-bg shadow-button`) — reserved for final / "instant" moments; also usable until more sheet variants arrive.
- **States:** default, pressed (`active:scale-[0.96] active:brightness-95`), disabled.

### `BottomSheet`
`src/components/ui/BottomSheet.tsx`

Reusable overlay shell (scrim + bottom panel + optional close). See design-system.md "Bottom Sheet".

- **Props:** `open`, `onClose`, `children`, `showCloseButton?` (default true).
- **Behavior:** locks body scroll while open; Escape and scrim tap call `onClose`.

### `Card`
`src/components/ui/Card.tsx`

Generic rounded surface container.

- **Layout:** `w-full`, `rounded-card` (24px), `shadow-card`. Padding is NOT baked in (children control their own padding) since not every future card usage may need the same 24/20px padding as ActiveJobCard.
- **Props:** `children`, `interactive` (adds press feedback: `active:brightness-95`), plus all native `<div>` props.
- **Used by:** `ActiveJobCard`.

### `StatusBar`
`src/components/ui/StatusBar.tsx`

Small rounded status-label pill (name preserved exactly from the Figma layer name — represents a **job status label**, not a device status bar).

- **Layout:** `rounded-full`, `px-3 py-1.5` (12/6px), hug-width.
- **Typography:** `text-sm tracking-[0.21px] leading-[1.4]`, `text-surface-bg` (white) on `bg-brand-primary`.
- **Props:** `children`.
- **Used by:** `ActiveJobCard` (job status: "בדרך אלייך", "הגיע", etc. — see `src/lib/jobStatus.ts`).

---

## `components/shared` — cross-screen components

### `ActiveJobCard`
`src/components/shared/ActiveJobCard.tsx`

Shown when the customer has a job that isn't `completed`/`cancelled`. See `/docs/home-screen-prd.md` 3.1.

- **Layout:** built on `Card`; internal `flex-col gap-6 px-6 py-5`. Row spacing is **not** a uniform gap between all 3 rows - verified via `get_design_context` on the isolated Figma node (2026-07-31): category/date row and name/time row are grouped together with `gap-1` (4px) between them, then `gap-4` (16px) before the service/price row, then `gap-6` (24px) before the centered `StatusBar`.
- **Background:** dynamic, via `resolveCategoryBackground()` (see design-system.md category color decision).
- **Props:** `job: ActiveJob`, `onClick?`.
- **States:** default, pressed (`active:brightness-95` via `Card interactive`).
- **Behavior notes:** date shows "היום" if the scheduled date is today, else "יום ה', DD.MM" (`src/lib/formatDate.ts`). Time window is scheduled time → +2h, per the PRD's documented 2-hour slot rule (the Figma sample shows a 1-hour example, treated as illustrative, not a rule). Currency/time strings use `dir="ltr"` to avoid RTL bidi reordering.

### `NotificationBanner`
`src/components/shared/NotificationBanner.tsx`

Single top urgent/critical banner. Built generically against the **full** icon/tone system in `/docs/notification_system_prd.md` (not just the one "cancelled" example from Figma) — see `src/lib/notificationVisuals.ts` for the type → icon/tone mapping.

- **Layout:** `rounded-full`, `py-3 pl-3 pr-6`, `gap-2`, icon (24px, first, **right**) + `flex-1` message text (second, **left**) — final result confirmed on 2026-08-02 via direct pixel measurement of Figma's rendered export (node `8168:6167`): icon's right edge sits exactly `24px` from the container's right edge; the text node is a fixed `275px`-wide box with the ink **right-aligned inside it** (so the visible glyphs don't reach the box's left edge - don't assume ink-width == box-width when doing this math). Two earlier passes got this backwards (first assumed the "typical" text-right/icon-left arrangement, then over-corrected the padding after confirming icon-right/text-left but before accounting for the text box's true width) - if re-deriving this from scratch, verify against actual rendered pixels, not just the raw exported class names or `get_metadata` node widths taken at face value.
- **Props:** `message`, `icon` (LucideIcon) and/or `iconSrc` (custom SVG, takes precedence), `tone` (`success | live | reminder | problem | info`), `unread?` (bold vs. regular text, **defaults to `false`**), `onClick?`.
- **States:** unread = `font-semibold`, read/default = `font-normal`. Default changed from `true` to `false` on 2026-07-31: Figma's only concrete reference (a critical "cancelled" banner) renders regular weight, not bold, so that's the safer default absent a confirmed read/unread source for this specific banner. Pressed = `active:brightness-95`.
- **Icon note (2026-07-31):** the "cancelled" type uses a custom SVG (`public/icons/notification-cancelled.svg`, downloaded directly from the Figma node) instead of a `lucide-react` icon, since Figma's `CancelIcon` is a solid/filled glyph that looks meaningfully different from lucide's outline-style `XCircle`. Other types still use `lucide-react` icons (tinted via `tone`) as first-pass placeholders, since Figma provides no reference for them yet — swap to custom SVGs the same way once real examples exist.
- **Open item:** `job_updates.type` → icon mapping slugs in `notificationVisuals.ts` are a first-pass inference (the PRD only gives one literal example, `type: 'delay'`) — confirm/standardize once real `job_updates` rows exist.

### `CategoryCard`
`src/components/shared/CategoryCard.tsx`

One category shortcut. `w-[72px]` fixed width, 72×72px icon (custom SVG from `/public/icons`, mapped by `category.name_en`) + `text-sm font-medium` label below.

- **Props:** `category`, `iconSrc`, `onClick?`.
- **States:** pressed = `active:scale-[0.96]`.

### `BottomNavigation`
`src/components/shared/BottomNavigation.tsx`

Fixed (sticky), always-visible full navigation bar — not a bottom sheet. Order (right→left, RTL): בית, הזמנות, התראות, פרופיל.

- **Props:** `activeTab` (`home | orders | notifications | profile`), `hasUnreadNotifications?` (boolean - shows the badge; trigger/business logic owned by `/docs/notification_system_prd.md`).
- **States:** active tab = `text-brand-primary` (icon + label together), inactive = `text-text-secondary`. No background/scale/shadow changes on nav items (per the global interaction rules).
- **Badge (visual):** solid `bg-notification-red` dot, `size-2`, `absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full` (horizontally centered over the icon, 2px gap above it). Appears only on the Notifications tab.

---

## `components/client/home` — Home Screen-specific

- **`ClientHomeScreen`** — top-level orchestrator (`'use client'`); composes all sections; owns the stubbed click handlers (`console.log` + `TODO` comments) for the not-yet-built Bottom Sheet flows.
- **`SearchSection`** — wraps `SearchBar` + `TimePillsRow`, `gap-6`.
- **`SearchBar`** — controlled text input; only triggers `onSearch` on Enter or clicking the search icon (no auto-search, per PRD 3.3).
- **`TimePillsRow`** — the 2 scheduling entry pills, DOM order "דחוף עכשיו" (first, right) then "לקבוע למועד אחר" (second, left) — matches an isolated Figma node screenshot exactly (verified 2026-07-31; visually non-obvious, don't re-swap without re-checking).
- **`CategorySection`** — heading + row of `CategoryCard`, `justify-between`. Display order for the 4 known categories is fixed via `sortCategoriesForDisplay()` in `src/lib/categoryVisuals.ts` (right→left: electrician, ac, plumber, handyman — matches Figma exactly), **not** `categories.sort_order` from the DB, since the DB's sort_order produces a different order than the design.
- **`PopularServicesSection`** — collapsed (4 pills) / expanded (up to 12 pills) toggle, `flex-wrap justify-start` (packs each wrapped row to the right in this RTL context — see design-system.md "RTL Layout Notes" for why `justify-end` is wrong here). Selection logic in `src/lib/selectPopularServices.ts`: since `services` has no popularity field, uses a deterministic round-robin across categories (ordered by `category.sort_order`) instead of true randomness, so the pill set doesn't reshuffle between renders/expand-toggle.
- **`ServicePill`** — one service pill; background = category color (via the same `resolveCategoryBackground()` used by `ActiveJobCard`/`CategoryCard`), text always `text-brand-primary`.

---

## `components/client/booking` — Client Booking Flow

- **`BookingFlowSheet`** — single orchestrator overlay for the entire booking flow, opened from Home entry points (first: Search). One continuous flow behind the scenes; swapping the step-content component shown inside the same sheet is purely a UX presentation of that one flow, not separate flows/sheets. Each step component it renders is exactly one "screen" per the Step Screen Reveal Rule (`client-booking-flow-prd.md`) — never two questions on the same screen. Runs match API, then steps through match → (optional message) → scheduling date → scheduling hour → (not yet built: attachments, auth, confirm).
- **`SearchMatchStep`** — Figma `OrderBottomSheet_SearchBar`: echo query, category, selectable services + "אין התאמה", price line, Next (enabled after any selection including no-match).
- **`BookingMessageStep`** — title-styled message + active CTA (`noProfessionals` → back home | `noPriceYet` → continues the same flow into Scheduling).
- **`SchedulingDateStep`** / **`SchedulingHourStep`** — Figma `OrderBottomSheet_Scheduling`: two separate step screens (date question, then hour question), each its own heading/subheading + pill row + Next — the hour screen only renders after the date screen's Next (per the Step Screen Reveal Rule). Selectable day/hour options come from `src/lib/scheduling.ts`, per the business rules in `client-booking-flow-prd.md` Step 3.
- **`SelectableServicePill`** — booking-only selectable pill (neutral / selected cyan), reused for service, date, and hour pills; does **not** replace Home `ServicePill`.
- **`BookingStepFooter`** — shared footer for every step screen above (Figma node `8421:6074`). Props: `onPrevious?`, `nextLabel`, `onNext`, `nextDisabled?`. With `onPrevious`, renders `sheetPrevious` + `sheetNext` side by side (`flex-1` each, 8px gap); without it, renders the `sheetNext` CTA alone at full width.

---

## Not yet built (intentionally)

`Input`, `IconButton` remain minimal stubs until a screen needs a fuller API.

---

## Temporary: `src/lib/devPreviewData.ts`

QA-only fallback data for `ActiveJobCard`/`NotificationBanner`, used only when `NEXT_PUBLIC_PREVIEW_HOME_STATES=true` in `.env.local` (default `false`) and the real Supabase query returns null — see the file's own header comment. **Not permanent mock data**: nothing is written to Supabase, and the flag must be explicitly enabled to see it. Delete this file + its 2 usages in `src/app/page.tsx` once real `jobs`/`job_updates` rows exist and this fallback is no longer needed for QA.
