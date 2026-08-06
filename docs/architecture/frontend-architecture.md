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
- Keep bottom navigation always visible on mobile layouts

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