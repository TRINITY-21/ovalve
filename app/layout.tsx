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
        {gaTrackingId && (
          <>
            <script async src={`https://www.googletagmanager.com/gtag/js?id=${gaTrackingId}`} />
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${gaTrackingId}');
                `,
              }}
            />
          </>
        )}
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
