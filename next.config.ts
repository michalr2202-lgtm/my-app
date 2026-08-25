import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Dev-only: allow phone/LAN and Cloudflare tunnel origins to load Next.js
   * client bundles + HMR. Without this, React won't hydrate on real mobile
   * devices (Search caret, Enter → sheet, "הצג עוד עבודות" all break).
   * Restart `npm run dev` after changing this file.
   */
  allowedDevOrigins: [
    "192.168.1.203", // home Ethernet LAN IP — update if your router assigns a different one
    "*.trycloudflare.com", // `npx cloudflared tunnel --url http://localhost:3000`
  ],
};

export default nextConfig;
