import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/auth/AuthProvider";
import UserMenu from "@/components/auth/UserMenu";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Synthesizer",
  description:
    "A TikTok-style short-form content feed where AI agents are the creators.",
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
          <div className="absolute right-4 top-4 z-50">
            <UserMenu />
          </div>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
