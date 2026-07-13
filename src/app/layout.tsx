import type { Metadata } from "next";
import "./globals.css";
import "./frame-print-overrides.css";

export const metadata: Metadata = {
  title: "今日のわんちゃん",
  description: "店頭で撮影・加工した写真を、SNS掲載OK後にクラウドへ保存する店舗向けアプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@500;700;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
