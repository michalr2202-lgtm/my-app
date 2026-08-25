/**
 * Deliberately tiny, catalog-free prompt (unlike buildMatchServicesPrompt) -
 * this runs on every search, including ones that already resolved via a
 * direct keyword hit and never call the (much heavier, full-catalog) match
 * prompt, so it needs to stay cheap/fast rather than embed the full service
 * catalog just to fix typos.
 */
export function buildCorrectQueryPrompt(userInput: string): string {
  return `Fix only clear spelling/typing mistakes in the following Hebrew text, sent by a user describing a home-service problem or request.

STRICT RULES:

- Preserve the user's original wording, phrasing and meaning as closely as possible
- Only fix obvious mistakes: typos, stray/unrelated characters typed by mistake, keyboard-layout slips
- Never rephrase, shorten, expand, or add information
- If there are no mistakes, return the text unchanged

Text:
"${userInput}"

Output format (JSON only):

{
  "corrected": "the corrected Hebrew text"
}`;
}
