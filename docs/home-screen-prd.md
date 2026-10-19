

  # 🚀 PRD – Home Screen (Client App)

## Screen Description

This document describes the behavior of the screen represented in the connected Figma design.

It defines:

- the purpose of each visible section
- user interactions
- business behavior
- screen states
- implementation rules

Visual implementation must follow the Figma design exactly.

Business behavior must follow this PRD.

# Related Documents

This screen depends on:

- /docs/project-prd.md
- /docs/order-model.md
- /docs/frontend-architecture.md
- /docs/architecture/design-system.md
- /docs/architecture/component-library.md

Do not duplicate information from those documents.

## 📱 Mobile First Approach
Build this page based on the provided mobile design.

Follow a **mobile-first approach**:
- On larger screens, keep content centered
- Max width: **480px**
- No shadow/border around the centered column (confirmed 2026-08-16, reversing the earlier "simulate a mobile app inside a web page" shadow) - plain `bg-surface-bg` on both sides beyond 480px, nothing else.
- Portrait-only on real touch devices: rotating a phone/tablet to landscape shows a "rotate back" overlay instead of the layout stretching wide (see `frontend-architecture.md` "Portrait-Only Guard"). Desktop browser windows are never affected by this, regardless of their aspect ratio.

## General Principles

Build this page based on my mobile design.

Mobile First Approach:
- Design optimized for mobile screens first

Desktop Behavior:
- Center content with max-width: 480px
- No shadow around the centered column - see above

---

## 🎯 1. Goal

Enable the user to:
- Start a new service request quickly
- Understand if there is an active job
- Choose a service or describe a problem
- Access the main areas of the application
- Receive important real-time updates when relevant

---

## 🧱 2. Layout Structure

The Home Screen is composed of the following sections,
displayed from top to bottom.

[Active Job Card - if exists]

[Notification Bar - if exists]

[Search Bar]

[Time Selection Pills]

Copy keys: `homeScreen.timePills.urgentNow`, `homeScreen.timePills.scheduleLater` (see `copy-deck.md`)

[Category Section]

חשמלאי
אינסטלטור
איש תחזוקה
טכנאי מזגן

[Popular Services Pills]

Copy key: `homeScreen.popularServices.showMore` (see `copy-deck.md`)

[Bottom Navigation]

---

## Component Architecture

ClientHomeScreen
 ├── HomeContent
 │
 │    ├── ActiveJobCard
 │
 │    ├── NotificationBanner
 │
 │    ├── SearchSection
 │    │    ├── SearchBar
 │    │    └── TimePillsRow
 │    │          └── TimePill
 │    │
 │    ├── CategorySection
 │    │    └── CategoryCard
 │    │
 │    └── PopularServicesSection
 │         ├── ServiceGrid (flex-wrap)
 │         │    └── ServicePill
 │         │         
 │         └── ExpandServicesButton
 │
 └── BottomNavigationSection
      ├── NavigationDivider
      ├── BottomNavigation
           └── BottomNavItem

---

## 🧩 3. Components

### 3.1 Active Job Card (Conditional)

Displayed only if an active job exists.

Includes:
- Professional category
- Professional full name
- Service name
- Date (if today → show copy key `homeScreen.activeJobCard.dateToday`; otherwise `homeScreen.activeJobCard.dateFormat`, see `copy-deck.md`)
- Time window
- Price range
- Status (copy keys `jobStatus.*`, see `copy-deck.md`)
- Category-based color
- Clickable → navigates to job details screen

---

### 3.2 Notification Bar

Displayed only if a **high-priority notification** exists.

Includes:
- Icon
- Notification title
- Clickable

MVP behavior:
- Not dismissible

---

### 3.3 Search Bar

Placeholder copy key: `homeScreen.searchBar.placeholder` (see `copy-deck.md`)

Behavior:
- Includes search icon (CTA)
- No auto-search
- Only triggers on click

---

### 3.4 Time Selection Pills

Copy keys: `homeScreen.timePills.urgentNow`, `homeScreen.timePills.scheduleLater` (see `copy-deck.md`)

---

### 3.5 Category Section

4 categories:
- חשמלאי
- אינסטלטור
- איש תחזוקה
- טכנאי מזגן

Each item:
- Icon
- Label

---

### 3.6 Popular Services Pills

#### Collapsed State:
- Show 3–4 service pills in a single row.
- Services must come from at least 3 different categories when possible.
- Avoid showing multiple similar services from the same category next to each other.
- CTA copy key: `homeScreen.popularServices.showMore` (see `copy-deck.md`)

#### Expanded State:
- Show 8–12 service pills using a responsive wrapped layout.
  The number of rows depends on the available screen width while preserving consistent spacing.
- Keep balanced category distribution.
- CTA copy key: `homeScreen.popularServices.showLess` (see `copy-deck.md`)

#### Logic:
- Fetch data from the `services` table.
- Join with the `categories` table to retrieve category styling data.
- Each pill should display:
  - service name (`label_he`)
  - category background color only
- Service pills should NOT display icons, descriptions, or prices.

#### Service Selection Rules:
- Prefer popular/common services when possible.
- If popularity data does not yet exist:
  - Select services randomly while maintaining category diversity.
- Avoid duplicates.
- Prefer showing services from multiple categories instead of clustering many services from the same category.

#### Ordering Rules:
- Expanded mode:
  - Use balanced distribution across categories.
  - Prefer lower `sort_order` values when relevant.
- Collapsed mode:
  - Prioritize category diversity over strict ordering.

#### Visual Rules:
- Pill background color should use the color of the category the service belongs to.
- Pill text uses the service `label_he`.


---

### 3.7 Bottom Navigation

Fixed at bottom (mobile-first)

Tabs (Right → Left), copy keys `shared.bottomNav.*` (see `copy-deck.md`):
1. `shared.bottomNav.home`
2. `shared.bottomNav.orders`
3. `shared.bottomNav.notifications`
4. `shared.bottomNav.profile`

Behavior:
- Active tab is indicated by icon color and label color change to primary brand color.
- Navigation iמ full screen (not bottom sheet)

---

## 🔄 4. States

### State A: No Active Job
- No active job card

---

### State B: Has Active Job
- Active job card is displayed
Visibility:
- **Corrected 2026-09-08** (was: "NOT 'completed' or 'cancelled'" - too broad, a real bug found live: a `searching_professional`/`pending_approval` job incorrectly showed here instead of State A): display only once the job is truly in flight - the professional has pressed "on the way" (`on_the_way`) through arrival/working (`arrived`/`in_progress`/`waiting_for_customer`/`waiting_for_professional`). A job still `confirmed`/`pending_approval`/`searching_professional` (approved but the professional hasn't started traveling yet) belongs on the Orders screen's "upcoming"/"pending" buckets instead, not here - see `src/lib/queries/jobRow.ts`'s `ACTIVE_NOW_STATUSES` (shared with the Orders screen's own "active now" slot - one definition, not two).
- Pushes content downward

---

### State C: No Notification
- No notification bar

---

### State D: Has Notification
- Notification appears at top (or below active job if exists)
- Pushes content downward

---

### Combined State Rule

The screen can contain both:
- Active job
- Notification

Display order:
1. Active Job Card
2. Notification Bar
3. Rest of content

---

### State E: Services Expanded
- 8–12 pills visible

---

### State F: Loading (Search)
- Trigger:
  Search is executed only on CTA click or Enter key
- Small spinner before bottom sheet opens

---

## 🔀 5. Flows

### Flow 1: Search

1. User types
2. Clicks search icon
3. Prompt sent to AI
4. Bottom sheet opens with:
   - Up to 3 services OR empty

If match:
→ Continue normal flow

If no match:
→ "Diagnosis at home" flow

---

### Flow 2: Time Selection

User clicks either time pill (`homeScreen.timePills.urgentNow` / `homeScreen.timePills.scheduleLater`, see `copy-deck.md`)

→ Opens bottom sheet  
→ Continues full flow (questions → date → time)

---

### Flow 3: Category Selection

1. Click category
2. Open bottom sheet
3. Show services in that category
4. Continue full flow

---

### Flow 4: Service Selection

1. Click service pill
2. Open bottom sheet
3. Continue full flow

---

### Flow 5: Create Job

At completion:
- Service selected
- Date selected
- Time selected

→ Job is created  
→ Sent to professionals  
→ First to accept gets the job

---

### Flow 6: Active Job Click

1. Click active job card
2. Navigate to job details screen

---

### Flow 7: Notification Click

1. Click notification bar
2. Navigate to relevant screen

---

## 📏 6. Rules

### Rule 1
All entry points → open a bottom sheet

---

### Rule 2: Layout Priority

- Active job always first
- Notification below it
- If no active job → notification at top

---

### Rule 3
No state persistence if user exits mid-flow

---

### Rule 4
Service pills = **solutions only** (not problems)

---

### Rule 5
AI returns max 3 services

---

### Rule 6: Bottom Navigation

- Always visible
- Full navigation (not bottom sheet)
- Active tab highlighted

---

## 🎨 7. Design Rules

- Use design system (tokens + components)
- No hardcoded styles
- Reusable components only
- All in-app typography uses 140% line-height.

Design System Status:
The design system is not fully defined yet.
During development:
- Create reusable components from this screen
- Extract design tokens (colors, spacing, typography)
- Build a scalable design system progressively

---

## 🔌 8. Integrations

### AI
- Service classification

### Database Tables

- users
- jobs
- job_assignments
- professionals
- services
- categories
- job_updates

---

## ❗ 9. Edge Cases

- No match → fallback
- No available professionals
- User exits flow mid-process:
Reset flow (no persistence)
Optionally show "Discard changes?" in future versions
- No services available → fallback UI

## Implementation Notes

All Hebrew UI copy (placeholders, pill labels, CTAs, status labels) lives in `docs/copy-deck.md`, referenced above by key. This PRD does not contain literal copy so that text changes don't require touching this document.

This PRD defines:

- screen behavior
- layout
- user interaction

Visual implementation must match Figma.

Business entities are defined in order-model.md.

Reusable UI decisions belong to:

- design-system.md
- component-library.md

Implementation must follow the AI Engineering Workflow.
