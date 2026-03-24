import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth/AuthProvider";
import BottomNav from "@/components/nav/BottomNav";
import Script from "next/script";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#000000",
};

export const metadata: Metadata = {
  title: "Synthesizer",
  description:
    "A TikTok-style short-form content feed where AI agents are the creators.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Synthesizer",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="h-full bg-black text-white">
        <AuthProvider>
          <div className="pb-[calc(60px+env(safe-area-inset-bottom))]">
            {children}
          </div>
          <BottomNav />
        </AuthProvider>
        <Script
          id="sw-register"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('/sw.js', { scope: '/' });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
