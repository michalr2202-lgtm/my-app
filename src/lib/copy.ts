import copyData from "@/lib/copy.json";

/**
 * Implementation of /docs/copy-deck.md - the single source of truth for
 * every static, user-facing string in the app.
 *
 * The actual text lives in `copy.json` (kept there, not inline here, so a
 * plain Node script - `scripts/check-copy-sync.mjs` - can read it without
 * needing to compile TypeScript). This file just re-exports it with types.
 *
 * Per the "Copy Deck Synchronization Workflow" in
 * /docs/ai-engineering-workflow.md: copy-deck.md is the human-readable
 * documentation (content is authored/approved there); `copy.json` is its
 * code implementation. Whenever one changes, update the other in the same
 * change, using the exact same key path - then run `npm run check-copy`
 * to verify they still match before finishing the task.
 *
 * Do not hardcode Hebrew (or any user-facing) text directly in a
 * component - import it from `COPY` instead, so every string has exactly
 * one place it's defined and one key that identifies it.
 */
export const COPY = copyData;
