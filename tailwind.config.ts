import type { Config } from "tailwindcss";

/**
 * Tailwind v4 note: design tokens (colors, shadows, radii, fonts) are defined
 * as CSS-native tokens in `src/app/globals.css` via `@theme`, per
 * /docs/architecture/frontend-architecture.md ("Tailwind & Design Token
 * Architecture" - Tailwind v4 recommended structure). This file only
 * configures content scanning; it intentionally does not duplicate tokens.
 */
const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
  ],
};

export default config;
