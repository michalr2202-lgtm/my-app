# AI Engineering Workflow

Version: 1.0 · Status: Active · Owner: Product Team

**Purpose:** This is the single operational guide for how implementation, documentation, reusable components, design decisions, and technical architecture must evolve together throughout the project. It does not describe the product - it describes *how* the AI must work while building it.

---

## Repository Structure

```
/docs
    ai-engineering-workflow.md
    project-prd.md
    order-model.md
    architecture/
        frontend-architecture.md
        design-system.md
        component-library.md
```

The files inside `architecture/` may start empty and are built gradually during development, per the rules below. Never invent documentation - it is created only after user confirmation.

---

## Project Documentation Hierarchy

Understand each document's responsibility before implementing any feature:

1. **`project-prd.md`** - product vision, business goals, UX, business rules, feature requirements. Answers: **what should be built?**
2. **`order-model.md`** - the business structure of an Order. Every booking-related feature must stay consistent with it. Update only after user approval; never invent Order fields/entities/rules. Answers: **what information exists inside an Order?**
3. **`frontend-architecture.md`** - technical architecture (app structure, routing, shared logic, state management, integrations, technical decisions). Answers: **how is the application built?**
4. **`design-system.md`** - reusable design decisions (colors, typography, spacing, shadows, radii, elevation, interaction rules, tokens, reusable UI principles). Update whenever a reusable design decision is confirmed. Answers: **how should reusable UI look and behave?**
5. **`component-library.md`** - every reusable UI Component (purpose, variants, states, properties, usage guidelines). Never document automatically - always confirm first. Answers: **which reusable UI Components exist?**

**Documentation priority when documents overlap:** `project-prd.md` → `order-model.md` → `frontend-architecture.md` → `design-system.md` → `component-library.md`. Business decisions always outrank implementation details.

**Reading order before starting work** (higher overrides lower): `project-prd.md` → `frontend-architecture.md` → `design-system.md` → `component-library.md` → current Screen PRD → current user request. If two documents conflict, never guess - ask for clarification.

**Before implementing any screen**, determine: (1) which business entity is being modified, (2) which document owns that business logic, (3) which reusable Components already exist, (4) whether a reusable Variant already exists. Only then start implementation.

---

## Mission & Philosophy

Responsibility extends beyond writing code - you protect consistency across the entire product. Every implementation should improve the current screen *and* the long-term quality of the project. Whenever documentation should evolve, always ask before updating it - never assume, never document automatically.

**Single Source of Truth:** business logic must never be duplicated. Each rule has one authoritative home: product requirements → `project-prd.md`, Order structure → `order-model.md`, technical architecture → `frontend-architecture.md`, reusable UI decisions → `design-system.md`, reusable Components → `component-library.md`. If information already exists elsewhere, reference it instead of duplicating it.

**Core philosophy:** think in systems, not individual screens - every screen belongs to a product, every UI element to a reusable Component, every Component to a Design System, every Design System rule eventually to a Design Token, every Token eventually to the Tailwind implementation. Consistency > implementation speed. Long-term maintainability > short-term convenience. Reuse > duplication. Evolution > replacement. Clarification > assumptions. Whenever uncertain, ask before proceeding.

**AI responsibilities:** build production-quality code; follow the Product PRD, Architecture, Design System, and Component Library; inspect Figma before implementing; identify reusable Components/Variants; maintain documentation, design, and technical consistency; update documentation only after approval; suggest improvements when appropriate. You are not only a programmer - you are also responsible for protecting the consistency of the entire project.

---

## Engineering Principles

- Implement only the requested scope. Never build future screens or introduce unrequested features.
- Never redesign UI, rename reusable Components, or create duplicate Components/Variants without confirmation.
- Never introduce hardcoded design values when a reusable token already exists.
- Whenever reusable knowledge appears, decide whether it belongs in `frontend-architecture.md`, `design-system.md`, or `component-library.md` - ask before updating.
- Documentation must evolve together with implementation; neither should evolve independently.

---

## Engineering Workflow

Every implementation task, in order (never skip steps, never jump straight to coding): Read Project Documentation → Read Current Screen PRD → Inspect Figma → Identify reusable Components → Reuse existing Components whenever possible → Identify possible new Components/Variants → Ask for confirmation if needed → Implement the screen → Review implementation → Identify reusable knowledge → Ask whether documentation should be updated → Update documentation after approval → Finish.

---

## Screen Development Workflow

Treat every screen as an independent task while staying fully consistent with the rest of the app:

1. Read the Screen PRD completely before writing any code.
2. Inspect the connected Figma file - it is the implementation spec, not just a visual reference; never approximate when exact values exist. Extract and treat as part of the Component spec: layout structure, Auto Layout, constraints, padding, gap, Hug/Fill/Fixed sizing, min/max width/height, responsive behavior, typography, colors, corner radius, shadows, icons, states, and existing Component names.
3. Compare the screen against the existing Component Library; always try to reuse before creating new.
4. If a reusable UI pattern is discovered, don't create a new Component immediately - follow the Component Recognition Workflow below.
5. If any Component behavior can't be determined with confidence from the Screen PRD, Figma, or Design System, stop and ask - never invent missing behavior.
6. Only start implementation once reusable Components, design tokens, and interaction behavior are identified.
7. After implementation, review the screen against the Screen PRD, Figma, existing Components, and Design System; report any inconsistencies before continuing.

---

## Figma Workflow

Figma is the visual and structural source of truth. Always inspect it before implementing UI; never redesign, rename, or reinterpret without approval. Always inspect: existing Components/names, Component Variants, Auto Layout, design tokens, typography/color styles, spacing rules, constraints, padding, gap, sizing mode, min/max width/height, responsive behavior. Reuse whatever reusable information already exists in Figma - never estimate a measurement that's already defined there.

**Component naming:** treat existing Figma layer names as the primary source of Component names; reuse them, don't rename without approval. When the same visual structure repeats, assume it's the same reusable Component even if only one instance is named - don't invent a new name just because another instance is unnamed. Unnamed layers (titles, labels, containers, wrappers) should not automatically become Components. Only introduce a new Component name when no existing name fits *and* the element is genuinely reusable. If the relationship between unnamed elements and existing Components is unclear, ask before introducing a new Component or naming convention.

**Component behavior:** Auto Layout properties (internal padding, spacing between children, sizing mode, min/max size, alignment, constraints, resize/responsive behavior) are part of the spec, not just appearance. If any interaction/layout behavior can't be determined with confidence from Figma, ask before implementing assumptions. Never automatically modify the Figma structure - only suggest improvements.

---

## Design System Workflow

`docs/architecture/design-system.md` may start empty and is built gradually - never generate it all at once. Only document rules that have become reusable across multiple screens (typography hierarchy, spacing scale, radius scale, shadow system, color tokens, interaction/motion rules, touch targets, responsive rules, accessibility rules, button/input/card hierarchy). Whenever a reusable design decision is discovered, ask "should this become part of the Design System?" - only update the file after approval. Never document temporary or screen-specific decisions.

## Component Library Workflow

`docs/architecture/component-library.md` may start empty and is built gradually, never generated automatically. Every reusable Component should eventually appear here, describing: purpose, usage, properties, variants, states, interaction rules, accessibility considerations - use only the sections applicable to that Component; don't invent content just to fill the structure. It should never document screens, business flows, one-time layouts, or screen-specific styling. Always reuse existing Components first. Ask for confirmation before documenting a new Component *or* a new Variant on an existing one - a visual difference doesn't automatically mean a new Variant; Variants represent semantic meaning, not visual coincidence.

## Tailwind Synchronization Workflow

The Design System is the human-readable documentation; the Tailwind configuration (`tailwind.config.ts/js`, theme config, or global CSS tokens - determine the correct source first) is its implementation. Whenever a reusable design decision is approved, synchronize it into the tokens. Never duplicate spacing, typography, radius, shadow, or color definitions - always reuse existing tokens. If no reusable token exists, ask whether to introduce one; after approval, update the Design System *and* the Tailwind tokens, then reuse that token throughout the project. Never introduce a hardcoded value when a reusable token should exist.

## Copy Deck Synchronization Workflow

`docs/copy-deck.md` is the human-readable documentation for every piece of user-facing text. `src/lib/copy.json` is its implementation - the raw text, keyed the same way; `src/lib/copy.ts` re-exports it as typed `COPY` for components to import. This mirrors the Tailwind Synchronization Workflow: one document for people to read/approve, one file for the app to consume - never text hardcoded across components.

Whenever copy is approved or changed: update `docs/copy-deck.md` first (key + text) → update `src/lib/copy.json` to match (same key path) → use `COPY.<key>` in the component, never the literal string → run `npm run check-copy` before finishing the task (`scripts/check-copy-sync.js` fails loudly on any key/value mismatch between the two files, so they can never silently drift).

Exception: text from the database (category labels, service names) or mock/preview-only data is not "copy" and belongs in neither file.

---

## Component Recognition Workflow

Think in reusable building blocks, not individual screens. While implementing a screen, continuously ask: does this UI element already exist? If yes, reuse it. If no, determine whether it's a completely new Component or a Variant of an existing one - never decide automatically, always ask.

**Recognition principles:** a reusable Component represents a recurring UI pattern, not a one-time visual element - it exists because it has a reusable purpose, not because it looks different. Prefer extending an existing Component over creating a new one; never create duplicates; ask whenever uncertain.

**Variant recognition:** Variants represent semantic meaning, not visual coincidence (e.g. Primary, Secondary, Ghost, Success, Danger, Warning, Disabled, Loading, Selected, Unselected, Active, Inactive, Live, Completed, Cancelled, Pending). A blue button and a green button aren't automatically different Variants - if they share the same semantic action, they stay one Variant with contextual tokens; if they mean different things, they become different Variants. Always verify with the user.

**Component evolution:** Components evolve, they aren't replaced - improve them. When a new screen introduces additional behavior, decide whether the existing Component should evolve or a new one is required; ask before documenting either way.

### Mandatory confirmation questions

Whenever you identify what appears to be reusable knowledge, pause and ask, verbatim in spirit:

> "I found what appears to be reusable. Please confirm before I document it."
> 1. Is this a new reusable Component, or an existing Component?
> 2. If existing, is this an existing Variant or a new Variant?
> 3. If a new Variant, what is its semantic meaning (e.g. Primary Action, Confirmation, Success, Warning, Danger, Selection, Navigation, Status, Information, Disabled, Other)?
> 4. Should I update `component-library.md`, `design-system.md`, or both?

Wait for confirmation. Never document automatically.

### Documentation decision workflow

Is the new knowledge reusable? If no, do nothing and continue. If yes: does documentation for it already exist? If yes, reuse it. If no, ask for confirmation - if approved, document it; if not, continue implementation without documenting. Never force documentation.

---

## Naming Convention

Use descriptive names that describe purpose, not appearance, and that stay correct even if the design changes. Good: `PrimaryButton`, `SecondaryButton`, `GhostButton`, `SearchBar`, `NotificationBar`, `StatusIndicator`, `CategoryIcon`, `BottomSheetHeader`, `JobCard`, `ScheduleSelector`. Avoid: `BlueButton`, `RoundedCard`, `LargeBox`, `PrettyButton`, `GrayContainer`.

## Documentation Update Rules

Keep updates concise; avoid duplication. If information already exists, extend it instead of rewriting it. Every update should improve clarity, not size.

---

## End of Screen Review

Before considering a screen complete, confirm: screen matches Figma; screen follows the PRD; existing Components/Variants were reused (no duplicates created); Design System, Component Library, and Tailwind tokens remain consistent; documentation updates were proposed *and* approved.

## Consistency Guardian

After completing every task, review for opportunities to improve consistency, reusability, simplicity, scalability, and maintainability - report findings (e.g. "I found two Components that appear to serve the same purpose," "I found duplicate spacing rules," "I found repeated interaction patterns") rather than modifying anything automatically. Ask before making changes; never refactor automatically.

## Product Thinking

Think like a Product Engineer: don't only ask "does the code work?" - also ask "does this improve the product?" Review every implementation against: is this UI simple? Is it consistent? Can it be reused? Can it scale? Does it follow the Design System? Does it improve long-term maintainability? Report any "no" rather than silently ignoring it.

## Reusability Audit

At the end of every screen, check whether you duplicated code, UI, spacing, colors, typography, logic, or interactions. If duplication exists, suggest (don't auto-implement) a reusable solution.

## UX Review

Before finishing a screen, review it from a user's perspective: can they immediately understand the primary action? Is there visual hierarchy? Is the screen overloaded, unnecessarily complex, or scrolling more than needed? Can the flow be simpler? Suggest improvements; never redesign without approval.

## Architecture Review

After implementing a screen, ask whether it introduced reusable business logic that should become a shared hook, utility, service, or part of `frontend-architecture.md` - ask before updating documentation.

## Documentation Maintenance

Documentation is a living system; every approved decision should eventually be documented, and implementation/documentation must evolve together - avoid drift by reviewing whether one should change whenever the other does.

## Technical Debt Review

Continuously monitor for duplicated logic/styling, inconsistent naming, unnecessary complexity, dead code, and obsolete Components/Variants/documentation. Don't clean it up automatically - report it, explain the impact, suggest a solution, and wait for approval.

## Continuous Improvement

Propose better reusable solutions when discovered; never replace existing architecture without approval. Prefer small continuous improvements over large rewrites - protect stability, consistency, documentation, and maintainability.

---

## End-of-Task Checklist

Before completing any implementation task, confirm: Project Documentation, Architecture, current Screen PRD, and Figma were reviewed; existing Components/Variants were reused with no duplicates created; Design System, Component Library, and Tailwind tokens remain consistent; reusable design decisions/Components were identified; documentation updates were proposed *and* approved before writing; consistency, reusability, UX, architecture, and technical debt reviews were completed; no undocumented reusable knowledge remains.

## Final Principles

These always override implementation speed: correctness over speed, consistency over convenience, reuse over duplication, documentation over assumptions, clarity over cleverness, approval over automation. The user owns all product decisions - your role is to understand, implement, review, suggest, and document. Never assume, never invent, never silently change the product. Always build the project as a coherent system, not a collection of independent screens.

---

## Documentation Ownership (Source of Truth)

Before updating any documentation, first identify which document owns the information; if unsure, ask before making changes.

- **`project-prd.md`** → global product requirements and business rules that apply across the application.
- **Screen PRDs** → layout, UX, flows, states, navigation, and business behavior specific to that screen.
- **`notification_system_prd.md`** → all notification behavior, badge logic, banner behavior, priorities, lifecycle, and notification flows.
- **`frontend-architecture.md`** → project architecture, component responsibilities, folder structure, state management, and data flow.
- **`component-library.md`** → reusable UI component APIs, props, variants, visual states, and usage only - never business rules or feature logic.
- **`design-system.md`** → design tokens, typography, colors, spacing, radii, shadows, icons, and visual design rules.
- **`copy-deck.md`** → all user-facing app text (Hebrew copy), organized by key. Does not define when/why text appears - only the exact wording. Implemented in code by `src/lib/copy.json` (see Copy Deck Synchronization Workflow above).
- **`ai-engineering-workflow.md`** → engineering workflow, documentation workflow, and AI collaboration rules (this document).

Business logic belongs in Product PRDs. The Component Library describes reusable UI components and their variants, not business behavior.
