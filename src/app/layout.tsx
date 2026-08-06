import type { Metadata } from "next";
import { Rubik } from "next/font/google";
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
      <body className="min-h-full flex flex-col bg-surface-bg">{children}</body>
    </html>
  );
}
