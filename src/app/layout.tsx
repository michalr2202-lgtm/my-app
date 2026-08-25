import type { Metadata } from "next";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className={`${rubik.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-surface-bg">
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
