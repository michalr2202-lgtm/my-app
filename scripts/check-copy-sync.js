#!/usr/bin/env node
"use strict";

/**
 * Verifies /docs/copy-deck.md and src/lib/copy.json never drift apart.
 * See "Copy Deck Synchronization Workflow" in /docs/ai-engineering-workflow.md.
 *
 * Plain Node, no dependencies (deliberately - so it always runs, with no
 * install step). Run with: npm run check-copy
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const COPY_JSON_PATH = path.join(ROOT, "src", "lib", "copy.json");
const COPY_DECK_PATH = path.join(ROOT, "docs", "copy-deck.md");

function flatten(obj, prefix, out) {
  out = out || {};
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (Array.isArray(value)) {
      out[fullKey] = value.join(" / ");
    } else if (value && typeof value === "object") {
      flatten(value, fullKey, out);
    } else {
      out[fullKey] = String(value);
    }
  }
  return out;
}

function loadCopyJson() {
  const raw = fs.readFileSync(COPY_JSON_PATH, "utf8");
  return flatten(JSON.parse(raw), "", {});
}

function loadCopyDeck() {
  const raw = fs.readFileSync(COPY_DECK_PATH, "utf8");
  // Matches table rows like: | `some.key` | "the text" (optional note) |
  const rowPattern = /^\|\s*`([a-zA-Z0-9_.]+)`\s*\|\s*"((?:[^"\\]|\\.)*)"/;
  const result = {};
  for (const line of raw.split(/\r?\n/)) {
    const match = rowPattern.exec(line.trim());
    if (match) {
      result[match[1]] = match[2];
    }
  }
  return result;
}

function main() {
  const fromCode = loadCopyJson();
  const fromDoc = loadCopyDeck();

  const missingInDoc = [];
  const missingInCode = [];
  const mismatched = [];

  for (const key of Object.keys(fromCode)) {
    if (!(key in fromDoc)) {
      missingInDoc.push(key);
    } else if (fromDoc[key] !== fromCode[key]) {
      mismatched.push({ key, code: fromCode[key], doc: fromDoc[key] });
    }
  }

  for (const key of Object.keys(fromDoc)) {
    if (!(key in fromCode)) {
      missingInCode.push(key);
    }
  }

  let hasError = false;

  if (missingInDoc.length) {
    hasError = true;
    console.error("\nKeys in copy.json but missing a row in copy-deck.md:");
    missingInDoc.forEach((key) => console.error(`  - ${key}`));
  }

  if (missingInCode.length) {
    hasError = true;
    console.error("\nKeys in copy-deck.md but missing from copy.json:");
    missingInCode.forEach((key) => console.error(`  - ${key}`));
  }

  if (mismatched.length) {
    hasError = true;
    console.error("\nKeys where copy.json and copy-deck.md text don't match:");
    mismatched.forEach(({ key, code, doc }) => {
      console.error(`  - ${key}`);
      console.error(`      copy.json:    ${code}`);
      console.error(`      copy-deck.md: ${doc}`);
    });
  }

  if (hasError) {
    console.error("\ncheck-copy FAILED - fix the mismatches above (update both files together).\n");
    process.exit(1);
  }

  console.log(`check-copy OK - ${Object.keys(fromCode).length} keys match between copy.json and copy-deck.md.`);
}

main();
