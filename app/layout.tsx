import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { Suspense } from "react";
import TitleManager from "./(pages)/TitleManager";
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
    default: "Qrave",
    template: "%s | Qrave",
  },
  description: "Modern restaurant ordering experience",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Libre+Caslon+Text:wght@400;700&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Suspense fallback={null}>
          <TitleManager />
        </Suspense>
        {children}
        <Toaster
          position="top-center"
          containerStyle={{ top: 16, left: 16, right: 16, bottom: 16, padding: 0 }}
          toastOptions={{
            className: "font-sans text-sm font-medium",
            style: {
              borderRadius: "12px",
              padding: "10px 14px",
              boxShadow: "0 8px 24px rgba(2, 6, 23, 0.18)",
              background: "#0f172a",
              color: "#fff",
            },
            success: {
              duration: 2200,
              style: {
                background: "#10b981",
                color: "#fff",
              },
            },
            error: {
              duration: 3200,
              style: {
                background: "#ef4444",
                color: "#fff",
              },
            },
          }}
        />
      </body>
    </html>
  );
}
