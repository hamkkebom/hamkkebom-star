import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "./providers";
import { ServiceWorkerRegister } from "@/components/pwa/sw-register";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "별들에게 물어봐 — 영상 커뮤니티",
    template: "%s | 별들에게 물어봐",
  },
  description: "영상 크리에이터를 위한 커뮤니티 플랫폼. 영상 피드백, 게시판, 인기 차트, 크리에이터 팔로우.",
  keywords: ["영상 커뮤니티", "크리에이터", "영상 피드백", "별들에게 물어봐", "영상 제작"],
  openGraph: {
    title: "별들에게 물어봐 — 영상 커뮤니티",
    description: "영상 크리에이터를 위한 커뮤니티 플랫폼",
    siteName: "별들에게 물어봐",
    locale: "ko_KR",
    type: "website",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "별들에게 물어봐",
    startupImage: [
      { url: "/splash/apple-splash-1290x2796.png", media: "(device-width: 390px)" },
      { url: "/splash/apple-splash-1170x2532.png", media: "(device-width: 390px)" },
      { url: "/splash/apple-splash-1668x2388.png", media: "(device-width: 834px)" },
    ],
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          {children}
          <Toaster position="top-center" />
          <MobileBottomNav />
          <ServiceWorkerRegister />
          <InstallPrompt />
        </Providers>
      </body>
    </html>
  );
}
