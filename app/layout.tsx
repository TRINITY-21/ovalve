import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import MainLayout from "./components/MainLayout";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OVALVE - Live Sports Streaming",
  description: "Watch live sports matches, highlights, and get expert predictions",
  icons: {
    icon: [
      { url: '/ovalve.png', type: 'image/png' },
      { url: '/ovalve.png', sizes: '32x32', type: 'image/png' },
      { url: '/ovalve.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: '/ovalve.png',
    shortcut: '/ovalve.png',
  },
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
        suppressHydrationWarning
      >
        <MainLayout>
          {children}
        </MainLayout>
      </body>
    </html>
  );
}
