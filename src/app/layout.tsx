import type { Metadata, Viewport } from "next";
import { Rubik } from "next/font/google";
import { RotateCcw } from "lucide-react";
import { COPY } from "@/lib/copy";
import "./globals.css";

const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["latin", "hebrew"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: COPY.shared.appMeta.title,
  description: COPY.shared.appMeta.description,
};

/**
 * `viewportFit: "cover"` (added 2026-09-29) is what lets a real device's
 * physical safe-area (notch, rounded screen corners, home indicator) be
 * measured via the `env(safe-area-inset-*)` CSS variables at all - without
 * it, those variables are always `0px` on iOS Safari regardless of the
 * actual device, and the browser reserves a plain rectangular content area
 * that stops short of the true screen edges. `bg-surface-bg` (`globals.css`)
 * padding on `<body>`/`BottomNavigation` below then uses those variables to
 * keep real content clear of the notch/home-indicator once this app is
 * genuinely full-screen (installed to the home screen, `display:
 * "standalone"` - see `app/manifest.ts`) - this alone does nothing visible
 * while viewed in an ordinary browser tab (the browser's own address bar
 * already occupies that space; `env()` resolves to `0px` there too).
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className={`${rubik.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-surface-bg pt-[env(safe-area-inset-top)]">
        {children}
        {/*
          Portrait-only guard, global (not just Home) - see
          frontend-architecture.md "Portrait-Only Guard". Purely CSS-driven
          (.rotate-guard in globals.css); no JS orientation check needed,
          and it never touches the app's own state underneath.
        */}
        <div
          aria-hidden
          className="rotate-guard fixed inset-0 z-50 flex-col items-center justify-center gap-4 bg-surface-bg p-6 text-center"
        >
          <RotateCcw size={40} strokeWidth={1.5} className="text-brand-primary" />
          <p className="text-base font-medium text-text-primary">{COPY.shared.rotateDevice.message}</p>
        </div>
      </body>
    </html>
  );
}
