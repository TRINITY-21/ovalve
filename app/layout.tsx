import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import MainLayout from "./components/MainLayout";
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
  const gaTrackingId = process.env.NEXT_PUBLIC_GA_TRACKING_ID || 'G-8ZS3H6BW5N';

  return (
    <html lang="en">
      <head>
        {/* Google tag (gtag.js) */}

        <>
          {/* PWA Manifest */}
          <link rel="manifest" href="/manifest.json" />
          <meta name="theme-color" content="#009866" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
          <meta name="apple-mobile-web-app-title" content="OVALVE - Live Sports Streaming" />
          <link rel="apple-touch-icon" href="/ovalve.png" />
          {/* Google tag (gtag.js) */}
          <script async src="https://www.googletagmanager.com/gtag/js?id=G-8ZS3H6BW5N" />
          <script
            dangerouslySetInnerHTML={{
              __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-8ZS3H6BW5N');
            `,
            }}
          />
          {/* Google AdSense */}
          <script
            async
            src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7225325372988376"
            crossOrigin="anonymous"
          />
        </>

      </head>
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
