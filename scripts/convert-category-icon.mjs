#!/usr/bin/env node
/**
 * Reusable converter for category/object icons and other small app image
 * assets (added 2026-09-18 for the square category icons; generalized
 * 2026-09-27 to also support non-square boxes for the professional
 * character images - see docs/architecture/component-library.md's
 * "Category icons" entry).
 *
 * Resizes a source PNG (background already removed in Figma/an external
 * editor, transparency intact) to a fixed WebP output at 3x the display
 * size the image is rendered at in the app, for retina sharpness -
 * confirmed 2026-09-18 ("3x the size it exists in the app"). Defaults to
 * a 216x216 square (the category icon size, `CategoryCard`'s
 * `size-[72px]` * 3) when no explicit size is given, but `--width`/
 * `--height` can be set independently for a non-square target (e.g. the
 * 420x630 professional character box, 3x the 140x210 display size).
 *
 * This is the one reusable place this conversion happens - re-run this
 * script for any future icon/image swap instead of converting by hand,
 * so every asset gets the exact same treatment (size, fit, quality).
 *
 * Usage:
 *   node scripts/convert-category-icon.mjs <input> <outputName> [--size=216] [--width=N] [--height=N] [--quality=85]
 *
 * `--size` sets both width and height (square, the original use case).
 * `--width`/`--height` override it independently for a rectangular box -
 * either can be given alone (the other falls back to `--size`/216) or
 * both together.
 *
 * Example (square icon):
 *   node scripts/convert-category-icon.mjs .tmp/icon-src/handyman.png category-handyman
 *   -> writes public/icons/category-handyman.webp (216x216)
 *
 * Example (rectangular character image):
 *   node scripts/convert-category-icon.mjs .tmp/professional-src/plumber.png professional-plumber --width=420 --height=630
 *   -> writes public/icons/professional-plumber.webp (420x630)
 *
 * `--fit` controls how the source maps onto the width/height box, default
 * "contain" (pads with transparency to exactly fill the box - correct
 * when the source's own aspect ratio doesn't quite match the target box,
 * e.g. the category icons, where the source was always larger than the
 * target in both dimensions anyway). Use `--fit=inside` when the source
 * is already meant to be treated as authoritative and must never gain
 * extra transparent pixels (confirmed 2026-09-27 for the professional
 * character images: the source's own proportions - as exported - are the
 * source of truth, e.g. so multiple characters stay sized consistently
 * relative to each other; "inside" scales down uniformly, preserving the
 * exact aspect ratio, until the binding dimension touches the box - the
 * other dimension then comes out smaller than the box, never padded).
 * Never "cover" - would crop, which could cut off part of an isolated
 * subject.
 *
 * `--native` skips resizing entirely (format conversion only, at the
 * source's own exact pixel dimensions) - the correct choice when the
 * source file itself is already the authoritative asset and shouldn't be
 * forced into any target box at all, even via a distortion-free "inside"
 * fit (confirmed 2026-09-27 for the professional character images: the
 * source's native proportions - e.g. 420x652 - are kept exactly as
 * exported; the nominal "3x of display size" relationship is treated
 * loosely, meaning the eventual on-screen display size is simply this
 * native size divided by roughly 3, not a fixed round number like
 * 140x210 - whatever that division actually works out to for this
 * specific asset).
 *
 * `--crop-bottom=N` removes exactly N pixels from the bottom edge before
 * any resize step (verified empty/transparent first, never assumed) -
 * for trimming an unintentional transparent margin baked into the
 * source export itself, as opposed to `--fit`'s padding (which *adds*
 * transparent pixels). This is a true pixel-for-pixel crop of empty
 * space only, never a scale - the actual artwork is untouched. Added
 * 2026-09-27 for the professional character images: their source export
 * carried 22px of extraneous transparent height at the bottom (empty
 * canvas below the shadow, not part of the design), which is why the
 * export came out taller than the intended exact-3x box (420x652
 * instead of 420x630) - cropping that empty margin (not resizing/scaling
 * anything) is what actually gets to an exact, undistorted 420x630, so
 * dividing by exactly 3 later lands on the exact intended 140x210
 * display size, not an approximation.
 */
import sharp from "sharp";
import path from "node:path";
import { stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

const [, , inputArg, outputNameArg, ...rest] = process.argv;

if (!inputArg || !outputNameArg) {
  console.error(
    "Usage: node scripts/convert-category-icon.mjs <input> <outputName> [--size=216] [--width=N] [--height=N] [--quality=85]"
  );
  process.exit(1);
}

const sizeArg = rest.find((arg) => arg.startsWith("--size="));
const widthArg = rest.find((arg) => arg.startsWith("--width="));
const heightArg = rest.find((arg) => arg.startsWith("--height="));
const qualityArg = rest.find((arg) => arg.startsWith("--quality="));
const fitArg = rest.find((arg) => arg.startsWith("--fit="));
const isNative = rest.includes("--native");
const cropBottomArg = rest.find((arg) => arg.startsWith("--crop-bottom="));
const cropBottom = cropBottomArg ? Number(cropBottomArg.split("=")[1]) : 0;

const fallbackSize = sizeArg ? Number(sizeArg.split("=")[1]) : 216;
const width = widthArg ? Number(widthArg.split("=")[1]) : fallbackSize;
const height = heightArg ? Number(heightArg.split("=")[1]) : fallbackSize;
const quality = qualityArg ? Number(qualityArg.split("=")[1]) : 85;
const fit = fitArg ? fitArg.split("=")[1] : "contain";

const inputPath = path.resolve(REPO_ROOT, inputArg);
const outputPath = path.resolve(REPO_ROOT, "public", "icons", `${outputNameArg}.webp`);

const inputMeta = await sharp(inputPath).metadata();

if (cropBottom > 0) {
  if (inputMeta.channels < 4) {
    console.warn(
      `Warning: ${inputArg} has no alpha channel - cannot verify the bottom ${cropBottom}px is transparent before cropping.`
    );
  } else {
    const stripBuffer = await sharp(inputPath)
      .extract({ left: 0, top: inputMeta.height - cropBottom, width: inputMeta.width, height: cropBottom })
      .raw()
      .toBuffer();
    let maxAlpha = 0;
    for (let i = 3; i < stripBuffer.length; i += 4) {
      if (stripBuffer[i] > maxAlpha) maxAlpha = stripBuffer[i];
    }
    if (maxAlpha > 40) {
      console.warn(
        `Warning: ${inputArg}'s bottom ${cropBottom}px is NOT fully transparent (max alpha ${maxAlpha}/255) - cropping anyway, but double-check the output for cut-off content.`
      );
    }
  }
}

let pipeline = sharp(inputPath);
if (cropBottom > 0) {
  pipeline = pipeline.extract({
    left: 0,
    top: 0,
    width: inputMeta.width,
    height: inputMeta.height - cropBottom,
  });
}
if (!isNative) {
  pipeline = pipeline.resize(width, height, {
    fit,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  });
}

await pipeline.webp({ quality }).toFile(outputPath);

const outputMeta = await sharp(outputPath).metadata();
const { size: outputBytes } = await stat(outputPath);

console.log(
  `${inputArg} (${inputMeta.width}x${inputMeta.height}px ${inputMeta.format}) -> ${path.relative(REPO_ROOT, outputPath)} (${outputMeta.width}x${outputMeta.height}px, ${(outputBytes / 1024).toFixed(1)} KB)`
);
