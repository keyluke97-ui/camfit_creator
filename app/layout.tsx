import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// CHANGED: 기본 Next.js 메타데이터 → 캠핏 크리에이터 포털 브랜드 메타데이터
export const metadata: Metadata = {
  title: "캠핏 크리에이터 포털",
  description: "캠핏이 만드는 크리에이터 전용 협업 포털 — 캠핑 콘텐츠를 만드는 모두를 위한 공간",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
