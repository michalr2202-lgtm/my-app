# Frontend Architecture & Component Rules

## Core Principles

- Build scalable and reusable UI
- Separate UI primitives from screen-specific components
- Keep business logic separated from presentation
- Reuse components whenever possible
- Gradually build the design system while developing screens

---

# Folder Structure

components
  ui
  shared
  client
  professional

public
  icons
  images
  illustrations

---

# Screen Component Structure

Each screen should have its own folder grouped by app side and screen name.

Examples

componentsclienthome
componentsclientorders
componentsprofessionalhome
componentsprofessionaljobs

---

# Component Rules

# Component States

All reusable components must support explicit UI states.

Examples:
- default
- hover
- pressed
- active
- disabled
- loading
- selected
- error

Business components must also support product states.

Examples:
- job status:
  - pending
  - accepted
  - on_the_way
  - arrived
  - in_progress
  - completed
  - cancelled

Each state must:
- use design tokens
- preserve layout consistency
- support RTL
- support responsive behavior

## componentsui

Reusable UI primitives used across the entire app.

These components should
- be generic
- contain minimal business logic
- support props-based customization
- be reusable across multiple screens

Examples
- Button
- Pill
- Card
- Input
- BottomSheet
- Avatar
- Badge
- Spinner

---

## componentsshared

Reusable app-level components shared across multiple screens but not considered primitive UI elements.

Examples
- BottomNavigation
- NotificationBanner
- Header
- EmptyState
- LoadingState
- PageContainer

---

## components[role][screen-name]

Screen-specific components.

These components may
- combine multiple UI primitives
- contain screen-specific UI logic
- manage local interactions for that screen

Examples for Client Home
componentsclienthome
- HomeSearchBar
- ActiveJobCard
- CategorySection
- PopularServicesSection
- TimeSelectionPills

---

# Multi-Step Flow Pattern (Orchestrator + Step Components)

Any flow that walks a user through multiple sequential screens inside one shared container (e.g. a Bottom Sheet) must be split into:

- **One orchestrator component** (e.g. `BookingFlowSheet`) - owns the phase/step state machine, the back-navigation history stack, and all draft data collected so far across steps. Renders the shared shell and decides which step component is shown for the current phase.
- **One component per step screen** (e.g. `SchedulingDateStep`, `SearchMatchStep`) - presentation-only. Receives already-known data plus `onNext`/`onPrevious` callbacks as props, owns only local/transient UI state (e.g. the currently-selected pill before "הבא" is pressed), and never manages navigation or holds data belonging to other steps.
- **Shared step chrome** (e.g. `BookingStepFooter`) reused by every step component in the flow instead of being rebuilt per step.

Reference implementation: `src/components/client/booking/BookingFlowSheet.tsx` (orchestrator) with `SchedulingDateStep.tsx`, `SchedulingHourStep.tsx`, `SearchMatchStep.tsx`, `BookingMessageStep.tsx` (step components) and `BookingStepFooter.tsx` (shared footer) - see `component-library.md` for the current list of built steps.

Any future multi-step flow (e.g. a professional-side job flow) must follow this same split - never build one monolithic component that mixes navigation/state-machine logic with per-screen presentation.

---

# Backend SQL (Supabase)

This repo has no local Supabase migrations set up yet. Until that exists, hand-authored SQL that needs to be applied directly in the Supabase SQL editor (RLS policies, Postgres functions) lives in `supabase/sql/`, one file per feature (e.g. `supabase/sql/booking_flow_auth.sql`), reviewed the same as any other code change but not run automatically. Revisit this once a real migrations workflow (`supabase db push` or similar) is set up for the project.

---

# Phone Auth / OTP Provider (Supabase Auth → Twilio)

**Decision (confirmed):** keep real SMS-based OTP verification for Step 5 (Authentication) rather than an unverified/skip-verification phone flow. An unverified phone number is free but lets anyone submit jobs under any number, which is a marketplace-trust and spam risk (fake jobs sent to real professionals, no reliable way to reach the client) - not worth the SMS cost saved. Supabase Auth's phone provider requires a third-party SMS gateway; **Twilio** is the one it integrates with directly from the dashboard.

- **Twilio trial accounts expire 30 days after signup** (the clock starts at signup, not at first use) - trial resources stop working after that until the account is upgraded (payment method added). Because of this, **don't create the Twilio account far in advance of needing it**: set it up (free, ~10 min, no credit card required to sign up) only once there's an actual need to test/demo the live OTP flow, not the moment the code is ready. Until then, the Authentication step's "שלח קוד" simply surfaces a graceful inline error (already handled) if tapped with no SMS provider configured - it does not block building/testing any other part of the flow.
- Once set up, Supabase's **"Test Phone Numbers and OTPs"** setting (Authentication → Providers → Phone) can map real tester numbers to a fixed code (e.g. `123456`) so day-to-day testing sends no real SMS and costs nothing per-message - it still requires a Twilio account configured (even trial) since Supabase won't enable the Phone provider at all without one.
- **Before real users / production launch:** upgrade the Twilio account to a **paid account** (pay-as-you-go, no monthly minimum - cost is per SMS, roughly $0.01-0.05/message depending on destination) and re-enter the same credentials in Supabase; no app code changes needed, since `src/lib/auth.ts` only calls `supabase.auth.signInWithOtp` / `verifyOtp` and never talks to Twilio directly.
- Revisit pricing/volume once real usage data exists - if OTP costs become significant at scale, cheaper alternatives (WhatsApp OTP, other regional gateways) can be swapped in Supabase's dashboard without touching the booking flow code.

---

# Business Logic Rules

- Keep fetching and business logic outside primitive UI components
- UI components should receive props
- Avoid direct database calls inside reusable UI components

---

# Assets Rules

## Icons

- Use lucide-react for system icons whenever possible
- Avoid unnecessary local SVG files
- Store custom SVG assets inside
  publicicons

If custom SVG assets are provided
- Convert them into reusable React icon components
- Follow the same API pattern as lucide-react
- Support
  - size
  - color
  - strokeWidth
  - className
  - additional props

---

## Images

Store bitmap or uploaded images inside
publicimages

Examples
- onboarding images
- placeholders
- empty states
- marketing assets

---

## Illustrations

Store larger decorative artwork inside
publicillustrations

---

# Design System Rules

- Gradually build reusable design tokens
- Reuse spacing, typography, radius, shadows, and colors
- Create them as reusable components and variables.
- Avoid hardcoded values whenever possible
- Prefer reusable Tailwind utility patterns

Follow spacing, sizing, typography, colors, border radius, shadows, and layout structure exactly as defined in Figma.

Do not create duplicate styling patterns if an existing reusable token or component already exists.

---

# Reading Figma Components

When implementing a Component from Figma, treat every Auto Layout property as part of the component specification.

Do not recreate the visual appearance by estimation.

Extract the actual Component behavior from Figma.

For every reusable Component inspect:

## Layout

- Auto Layout direction
- Alignment
- Gap
- Padding
- Hug / Fill / Fixed sizing
- Min Width
- Max Width
- Min Height
- Constraints
- Resize behavior

## Typography

- Font family
- Font size
- Font weight
- Line height
- Letter spacing

## Appearance

- Colors
- Border radius
- Stroke
- Shadows
- Opacity

## Behavior

Determine how the Component behaves when:

- text becomes longer
- text becomes shorter
- container width changes
- screen width changes
- content wraps
- minimum size is reached
- maximum size is reached

If this behavior is not clearly defined in Figma:

Ask before implementing assumptions.

Never invent responsive behavior.

---

# Clarifying Missing Component Behavior

If a Component's behavior cannot be fully determined from:

- Figma
- Screen PRD
- Design System

Stop and ask before implementation.

Examples include:

- responsive resizing
- wrapping behavior
- truncation
- scrolling
- overflow
- dynamic height
- dynamic width
- interaction priority
- animation behavior

Never invent missing UX behavior.

---

# Component Specifications

Design Tokens define reusable values.

Component Specifications define how those values are applied.

When documenting reusable Components, include measurable layout specifications whenever applicable.

Examples include:

- internal padding
- spacing between elements
- minimum width
- maximum width
- minimum height
- sizing mode (Hug / Fill / Fixed)
- alignment
- responsive behavior
- layout constraints

Do not document only colors and typography.

Also document how the Component occupies space and adapts to different content sizes.

---

# Mobile First Rules

- All screens are mobile-first
- Desktop should simulate a centered mobile app layout
- Use max-width 480px for app container on desktop
- No shadow/border around the centered column beyond 480px (confirmed 2026-08-16, reversing an earlier "simulate a mobile app inside a web page" shadow) - just the plain `bg-surface-bg` page background on both sides.
- Keep bottom navigation always visible on mobile layouts

---

# Portrait-Only Guard

**Decision (confirmed 2026-08-16):** the app should not visually respond to landscape rotation on real phones/tablets - instead of stretching into a wide layout, a full-screen "rotate back to portrait" overlay is shown, and the underlying app stays mounted/unaffected.

- **Why CSS-only, not the Screen Orientation API:** `screen.orientation.lock()` can only lock orientation for a page running in Fullscreen mode (`requestFullscreen()`) - it throws/no-ops for a normal browser tab, and iOS Safari doesn't support it at all even then. A regular mobile web app (not an installed, fullscreen PWA) cannot force-lock device rotation. The CSS overlay approach is the standard fallback used by production mobile web apps and needs no permissions or fullscreen prompt.
- **Implementation:** a single `.rotate-guard` element in `src/app/layout.tsx` (global, not per-page), toggled purely via a CSS media query in `globals.css`:
  ```css
  @media (hover: none) and (pointer: coarse) and (orientation: landscape) {
    .rotate-guard { display: flex; }
  }
  ```
- **Why `(hover: none) and (pointer: coarse)` and not just `(orientation: landscape)`:** the orientation query alone would also fire for an ordinary desktop browser window (any window wider than it is tall counts as "landscape"), hiding the app for every desktop/wide-window visitor. Combining it with "coarse pointer, no hover" scopes it to real touchscreen devices only - desktop is unaffected regardless of window shape.
- Copy: `shared.rotateDevice.message` (see `copy-deck.md`).

---

# Safe-Area / Full-Screen Display

**Why the app doesn't fill the screen edge-to-edge today (confirmed 2026-09-29,
in response to a real question/screenshot):** viewed as an ordinary URL in a
phone's browser (Chrome/Samsung Internet/Safari - however this app is being
tested today, e.g. a Cloudflare quick-tunnel link), the browser's own chrome
(address bar, tabs) always occupies real screen space above the page - no
amount of app-side code can remove that; it isn't this app's content area to
control. The page content itself already correctly fills whatever space the
browser *does* give it (standard responsive layout, `viewport: { width:
"device-width", initialScale: 1 }` in `layout.tsx`).

**What genuinely starts "from the very rounded corners of the phone" -
no address bar at all:** only two paths get there, neither of which is what
today's plain browser-tab preview shows:
1. **Installed to the home screen** (a real web-manifest `display:
   "standalone"` PWA, opened from its home-screen icon rather than a browser
   tab) - not yet built; needs `app/manifest.ts` plus a real app icon
   (deferred 2026-09-29 pending a decision on the icon asset).
2. Eventually wrapped in a native app shell.

**`viewportFit: "cover"` (added 2026-09-29, `layout.tsx`'s `viewport`
export):** prerequisite groundwork for path 1 above - this is what makes
`env(safe-area-inset-*)` report real, non-zero values on a real device at
all (iOS Safari always reports `0px` without it), rather than something
that changes anything visible today. Paired with two paddings that use those
variables so the day this *is* running standalone/full-screen, real content
doesn't sit underneath the physical notch/rounded corners or the home
indicator:
- `<body>` (`layout.tsx`): `pt-[env(safe-area-inset-top)]`.
- `BottomNavigation`: `pb-[max(1rem,env(safe-area-inset-bottom))]` - the
  `max()` keeps the original 16px bottom padding as a floor on any device
  reporting `0px` (every device/context until path 1 exists, plus any
  Android device with no gesture-bar inset to begin with), rather than
  collapsing tighter than today's design.

Both resolve to `0px`/no-op in every context this app runs in today (a
regular browser tab) - real behavior change only once path 1 (or 2) above
is actually built.

---

# UI Development Rules

- Build pixel-perfect UI based on Figma
- Maintain RTL support where relevant
- Maintain consistent spacing hierarchy
- Prioritize reusable components over duplicated code

---

# Localization & RTL Rules

This is a Hebrew-first application.

Requirements:
- Use RTL layout across the application
- Set dir="rtl" at the root HTML level
- Align text to the right by default
- Support proper RTL spacing and layout behavior
- Use Hebrew microcopy across the UI unless explicitly stated otherwise

Typography:
- Use Rubik as the primary application font
- Load Rubik from Google Fonts
- All in-app typography uses 140% line-height.
- Maintain consistent typography hierarchy across all screens

UI Behavior:
- Icons, paddings, navigation flow, and layout alignment should respect RTL behavior
- Bottom navigation order should follow RTL direction
- Search inputs and text fields should behave correctly in RTL mode

---

## Tailwind & Design Token Architecture

Use Tailwind as the central design system layer.

All reusable design values should be centralized and reusable, including:
- colors
- spacing
- typography
- border radius
- shadows
- z-index
- breakpoints
- animations

Avoid hardcoded styling values inside components whenever possible.

Use semantic naming conventions for tokens.

Examples:
- bg-category-plumber
- text-primary
- radius-card
- shadow-sheet
- spacing-screen-padding

If the project uses Tailwind v4:
- Organize tokens using the recommended Tailwind v4 structure
- Use CSS variables and theme tokens where appropriate
- Keep styling scalable and maintainable

The project should gradually evolve into a reusable design system while screens are being developed.

### Configuration Update Rules

When updating project configuration files
(such as Tailwind configuration, design tokens, global styles, theme files or shared constants):

- Preserve all existing approved definitions.
- Extend existing structures instead of replacing them.
- Never remove or overwrite previously approved tokens unless explicitly instructed.
- Merge new tokens into the existing configuration.
- Reuse existing tokens whenever possible before introducing new ones.

### DESIGN SYSTEM & STATE MANAGEMENT RULES 

1. COLOR REGISTRY (ALL COLORS):
- Scan the design and save EVERY color you identify as a token in Tailwind tokens or CSS variables.
- DUPLICATE CHECK: Before adding a new token, check if the HEX code already exists. If it does, REUSE the existing token.
- NAMING: Use semantic names where possible (e.g., 'bg-main', 'text-primary') or category-based names (e.g., 'electrician-base').

2. TARGETED STATES (BUTTONS, PILLS, CATEGORY ICONS, JOB CARDS ONLY):
- For these specific reusable interactive components only, automatically generate and save:
  - Hover states are optional and should mainly apply to desktop interactions.
  - Focus primarily on pressed/active states for mobile interactions.
  - [name]-active: 10% darker than base.

3. INTERACTION & MOTION LOGIC:

- Apply interaction feedback behaviors to all interactive/tappable UI elements across the system.

Examples include:
  - Buttons
  - Pills / Categories
  - Category Icons
  - Job Cards
  - Navigation items
  - Notifications
  - Interactive labels and inline actions
  - Chips
  - List items

- Non-interactive elements must remain visually static.

- TRANSITION:
  - all 0.2s cubic-bezier(0.4, 0, 0.2, 1)

- ACTIVE (PRESSED) STATE:
  - Interactive surfaces/backgrounds switch to [name]-active (10% darker).
  - Text and icons should generally remain unchanged to preserve readability and consistency.
  - Exception: Unified Category Items (combined colored surface + icon components) should darken as a single visual unit.
  
- Scale behavior:
  - Small elements (Buttons/Pills):
    - scale(0.96)
  - Large elements (Job Cards):
    - Prefer subtle shadow and opacity changes instead of dramatic scaling.

- Shadow Behavior:
  - Reduce outer-shadow intensity slightly on pressed state.

- Bottom Navigation behavior:
  - Navigation items should NOT use scaling, shadows, or background color states.
  - Active tab is indicated ONLY by icon color and label color change.
  - Icon and label always change together.
  - Inactive state = app text secondary color.
  - Active state = primary brand color.
  - No background highlight behind navigation items.

  - Notification Badge (Unread Indicator):
    - Appears as a floating element using absolute positioning over the relevant tab.
    - Visual: Solid red dot.
    - Positioning: Relative to the BottomNavItem container; must remain consistently aligned above the icon across screen sizes.

    - Service Provider App:
      - Badge may appear on:
        - Orders
        - Notifications
      - Orders badge trigger:
        - Visible when new job requests/orders are available and the provider has not yet visited the Orders screen.
      - Notifications badge trigger:
        - Visible when new notifications are available and the user has not yet visited the Notifications screen.

    - Client App:
      - Badge appears ONLY on the Notifications tab.
      - Trigger:
        - Visible when new notifications are available and the user has not yet visited the Notifications screen.
        - **Clarification (confirmed 2026-08-02, see `/docs/notification_system_prd.md` §9):** this is a screen-level "last visited" signal, not per-notification read state — visible whenever the latest notification's timestamp is newer than the user's last visit to the Notifications screen, and cleared simply by opening that screen (independent of whether any individual notification inside is opened/interacted with).
      - Orders tab should NOT display unread indicators or badges.

4. CLEAN CODE PREFERENCE:
- Ensure that non-interactive elements remain visually static and do not receive interaction states.
- Reuse existing tokens whenever possible.
- Avoid duplicate colors, duplicate tokens, or one-off styles.
- Keep the design system scalable and maintainable while screens are developed.

---

# Notifications: Business Behavior Reference

Notification read/unread visual weight, banner dismissal/persistence lifecycle, and reminder rules are owned by `/docs/notification_system_prd.md` (Sections 3, 8, 11) - not duplicated here, per the Single Source of Truth rule in `ai-engineering-workflow.md`. Press/tap feedback for a notification item follows the global interaction rules above (darken 10%, 0.2s ease) like every other interactive element; that press does not by itself change its read/unread typography weight - only actually opening it does.