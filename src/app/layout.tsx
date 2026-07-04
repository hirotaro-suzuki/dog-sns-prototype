import type { Metadata } from "next";
import "./globals.css";
import "./frame-print-overrides.css";

export const metadata: Metadata = {
  title: "Dog SNS Prototype",
  description: "Phase 0 camera and mosaic prototype",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
