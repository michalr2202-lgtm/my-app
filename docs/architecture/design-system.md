# Design System

Source of truth: Figma ("Home Service UI Kit — DoorHub — Community", Client Home Screen frame). Extracted via Figma MCP `get_variable_defs` / `get_design_context` on 2026-07-30. All tokens live as CSS-native Tailwind v4 theme values in `src/app/globals.css` (`@theme` block) — this document describes what they mean and when to use them; it is not a duplicate config.

---

## Colors

| Token | CSS variable | Hex | Tailwind utility | Usage |
|---|---|---|---|---|
| Brand primary | `--color-brand-primary` | `#1f3ed6` | `bg-brand-primary`, `text-brand-primary` | CTAs, links, active nav, pill text, StatusBar background |
| Text primary | `--color-text-primary` | `#1a1a1a` | `text-text-primary` | Default body/heading text |
| Text secondary | `--color-text-secondary` | `#535763` | `text-text-secondary` | Placeholder text, inactive nav labels |
| Surface bg | `--color-surface-bg` | `#ffffff` | `bg-surface-bg` | Page/app background |
| Surface pill | `--color-surface-pill` | `#efeeee` | `bg-surface-pill` | Neutral pills (TimePill, ExpandServicesButton, booking selectable pills default) |
| Surface selected | `--color-surface-selected` | `#d3ebfe` | `bg-surface-selected` | Selected booking service pill; active Bottom Sheet `sheetNext` button background |
| Surface searchbar | `--color-surface-searchbar` | `#ffffff` | `bg-surface-searchbar` | SearchBar background |
| Surface notification | `--color-surface-notification` | `#fafafa` | `bg-surface-notification` | NotificationBanner background (raw hex in Figma, not a bound variable there — promoted to a token here since banners are reused app-wide) |
| Overlay scrim | `--color-overlay-scrim` | `rgb(0 0 0 / 70%)` | `bg-overlay-scrim` | Dim layer behind Bottom Sheet (covers home + bottom nav) |
| Notification red | `--color-notification-red` | `#ef4444` | `bg-notification-red`, `text-notification-red` | Unread badge dot, "problem" tone notification icons |
| Search caret | `--color-search-caret` | `#5cb8ff` | `bg-search-caret` | Decorative accent bar inside SearchBar |
| Divider | `--color-divider` | `#ededed` | `bg-divider` | NavigationDivider line above BottomNavigation |

### Category colors

| Category (`name_en`) | Token | Hex |
|---|---|---|
| handyman | `--color-category-handyman` | `#ffe6ed` |
| plumber | `--color-category-plumber` | `#e3ddfe` |
| electrician | `--color-category-electrician` | `#fff9c4` |
| ac | `--color-category-ac` | `#e0f7fa` |

**Decision (confirmed 2026-07-30):** these are fixed design tokens, matched pixel-perfect to Figma. The live `categories.color_bg` / `categories.color_text` DB columns currently hold *different* values (e.g. plumber is `#E0F2FE` in the DB) — the Home Screen intentionally ignores the DB colors for these 4 categories and uses the tokens above instead, via `resolveCategoryBackground()` in `src/lib/categoryVisuals.ts`. For any category **outside** this fixed set (e.g. a professional's category shown on `ActiveJobCard` that isn't one of the 4 Home Screen categories), the DB's `color_bg` is used as a fallback, since no fixed token exists for it. Revisit this if/when the DB colors are aligned with Figma.

---

## Typography

- Font family: **Rubik** (Google Font, self-hosted via `next/font/google`), subsets `latin` + `hebrew`, weights `400/500/600`.
- Line height: **140%** on all in-app typography (`leading-[1.4]`, also set as the `body` default).
- Type scale (matches Tailwind's default scale exactly — no custom `--text-*` tokens needed):

| Tailwind class | Size | Weight used | Example usage |
|---|---|---|---|
| `text-lg` | 18px | `font-semibold` (600) | Section headings, ActiveJobCard category name |
| `text-base` | 16px | `font-normal` (400) | SearchBar input/placeholder |
| `text-sm` | 14px | 400 / 500 / 600 | Body text, pill labels, ActiveJobCard rows |
| `text-xs` | 12px | `font-normal` (400) | BottomNavigation labels |

- **Letter spacing (confirmed 2026-07-31): default is `0` for all typography, set once, globally, on `body` (`letter-spacing: 0` in `globals.css`).** Do not add per-element `tracking-[...]` overrides — an earlier version of this screen copied Figma's per-text-node tracking values (`-0.54px`, `-0.14px`, `0.21px`) directly as local overrides on `ActiveJobCard`, `Pill`, `StatusBar`, and `CategoryCard`; those were auto-kerning artifacts, not intentional tokens, and have been removed in favor of this single global default.
- RTL numeric strings (currency, time ranges) should get `dir="ltr"` even inside an RTL container, to prevent the Unicode bidi algorithm from reordering symbols/digits (e.g. `₪ 500-800`). See `ActiveJobCard.tsx`.

---

## Spacing & Radius

- Spacing follows Tailwind's default 4px scale throughout (all Figma pixel values converted directly: 24px → `6`, 16px → `4`, 20px → `5`, 12px → `3`, 8px → `2`, etc.) — no custom `--spacing-*` tokens were needed.
- `--radius-card: 24px` → `rounded-card`, used for `Card` (ActiveJobCard) and Bottom Sheet top corners (`rounded-t-card`).
- All pill-shaped elements use `rounded-full` (Figma uses both `99px` and `44px` radii for different pills — visually indistinguishable at these heights, so unified to `rounded-full`).

---

## Bottom Sheet

Shared overlay pattern for the Client Booking Flow (and future multi-step sheets).

- **Scrim:** full viewport `bg-overlay-scrim` (70% black). Tap dismisses the sheet (same as close). Covers Bottom Navigation.
- **Panel:** docks to the bottom of the centered mobile shell (`max-w-[480px]`), white `bg-surface-bg`, top corners `rounded-t-card` (24px), horizontal padding 16px, top 16px / bottom 24px.
- **Close control:** 24px X (lucide), top-**left** visually (`justify-end` in RTL flex so the control sits on the physical left, matching Figma), press scale per global small-element rules.
- **Step content:** one step visible at a time; advancing replaces content (do not stack long multi-question scroll for the full flow).
- **Selectable service pills (booking):** uniform `bg-surface-pill` + `text-text-secondary`; selected = `bg-surface-selected` + `text-text-secondary`. Not the same as Home `ServicePill` (category-colored).
- **`sheetNext` button:** full width, `rounded-full`, `text-base font-medium`, py 15 / px 22.5.
  - Inactive (no selection / disabled): `bg-surface-pill` + `text-text-secondary`
  - Active (enabled after selection): `bg-surface-selected` + `text-brand-primary`
  - Press: same global `active:scale-[0.96] active:brightness-95` as other CTAs

---

## Shadows

| Token | CSS variable | Value | Usage |
|---|---|---|---|
| Card | `--shadow-card` | `0px 2px 2px rgba(0,0,0,0.12)` | ActiveJobCard |
| Notification | `--shadow-notification` | `0px 1px 1px rgba(0,0,0,0.08)` | NotificationBanner |
| Search bar | `--shadow-search-bar` | `0px 2px 8px rgba(0,0,0,0.06)` | SearchBar |
| Button | `--shadow-button` | `0px 1px 1px rgba(0,0,0,0.08)` | Reserved for a future `Button` primitive (not used on the Home Screen yet) |

---

## RTL Layout Notes

**Critical gotcha (found during 2026-07-31 visual QA):** in a native `dir="rtl"` flex row (`flex-direction: row` under `direction: rtl`), CSS `justify-content: flex-end` (Tailwind `justify-end`) packs content to the **left**, not the right — because "end" follows the inline-direction end of the writing mode, and RTL's inline end is the left. To pack a row flush against the right edge (the visually-intuitive "RTL-aligned" result), use `justify-start` (Tailwind `justify-start`, or omit the class — it's the default) instead. This bit `PopularServicesSection`'s `ServiceGrid`, which used `justify-end` and ended up packed left with a gap on the right.

This project does **not** use Figma's exported `-scale-y-100 rotate-180` mirror-transform hack for RTL (that's a code-gen artifact for simulating RTL from an LTR-authored canvas, produced by some Figma exports) — components here are built RTL-native (`dir="rtl"` inherited from `<html>`, first DOM child = right). When verifying order/position against Figma, don't trust `get_metadata`'s raw x-coordinates blindly either — cross-check with an isolated `get_screenshot` of the specific node, since not all elements in this file are authored/flipped consistently (e.g. `SearchBar`'s internal layout is mirrored relative to its raw metadata, while `CategorySection`/`TimePillsRow`/`ServiceGrid` are not).

**Asymmetric padding gotcha (`NotificationBanner`, resolved 2026-08-02 after 3 attempts):** don't trust `get_design_context`'s raw `pl-[…]`/`pr-[…]` class names OR `get_metadata`'s per-node `width` at face value for this file — both can be misleading. Two failure modes hit here:
1. **Element order:** the raw JSX order (icon, then text) does NOT reliably tell you left/right without checking - this file mixes mirrored and non-mirrored components (see above). Confirmed by direct pixel measurement (downloading the exported PNG and scanning pixel columns) that the icon renders on the **right** and text on the **left** here, opposite of the initial guess.
2. **Padding split:** `get_metadata`'s text-node `width` (e.g. `275px`) is the node's authored **box** width, not its rendered ink width (Hebrew text can be short and right-aligned inside a much wider fixed box) - don't plug it into a `pl + icon + gap + text + pr = containerWidth` equation assuming ink-width == box-width; both `pl+pr` combinations can satisfy that sum, so the arithmetic alone doesn't tell you which side is bigger. The reliable method: download the actual rendered PNG (`get_screenshot`) and measure real pixel positions of the icon and text ink directly (e.g. a small script scanning columns for reddish vs. dark-gray pixels) - only that settled it (icon's right edge lands exactly `24px` from the container's right edge; the text's fixed box starts exactly `12px` from the left edge).

---

## Interaction & Motion

Per the global interaction rules:

- Transition: `transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]` on all interactive elements.
- Small elements (Pill, CategoryCard icon): `active:scale-[0.96]`.
- Large elements (Card): no scaling — background darkens instead.
- Background darkening on press ("10% darker"): implemented as `active:brightness-95` rather than a literal `[name]-active` hex token per color. This is a deliberate deviation from the literal "define an -active token per color" rule, because several backgrounds here are **data-driven** (arbitrary hex from the DB, e.g. a professional's category color that isn't one of the 4 fixed tokens) — a `brightness` filter darkens any background uniformly without needing to precompute a darker variant for every possible value. Fixed-token colors (pills, categories) could still get literal `-active` tokens later if a case arises where `brightness` isn't visually sufficient.
- Bottom Navigation: no scale/shadow/background change — only icon + label color change (`text-text-secondary` → `text-brand-primary`).
- Notification badge: solid `bg-notification-red` dot, absolutely positioned over the Notifications tab icon only (Client App — Orders tab never shows a badge).
