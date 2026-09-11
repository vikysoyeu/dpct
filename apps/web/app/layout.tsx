import type { Metadata } from "next";
import { Inter, Public_Sans } from "next/font/google";
import { Suspense } from "react";
import { ScrollPositionManager } from "@/components/navigation/scroll-position-manager";
import "./globals.css";
import "@/styles/map.css";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-body"
});

const publicSans = Public_Sans({
  subsets: ["latin", "vietnamese"],
  variable: "--font-label"
});

export const metadata: Metadata = {
  title: "Điều phối cứu trợ",
  description: "Hệ thống điều phối cứu trợ khẩn cấp"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className={`${inter.variable} ${publicSans.variable} font-body`}>
        <Suspense fallback={null}>
          <ScrollPositionManager />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
