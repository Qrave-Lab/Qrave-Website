import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { Suspense } from "react";
import TitleManager from "./(pages)/TitleManager";
import { ThemeProvider } from "./providers";
import RouteLoadingBar from "./_components/RouteLoadingBar";
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Libre+Caslon+Text:wght@400;700&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <Suspense fallback={null}>
            <TitleManager />
            <RouteLoadingBar />
          </Suspense>
          {children}
          <Toaster
            position="top-center"
            containerStyle={{ top: 16, left: 16, right: 16, bottom: 16, padding: 0 }}
            toastOptions={{
              className: "font-sans text-sm font-medium",
              style: {
                borderRadius: "24px",
                padding: "10px 20px",
                boxShadow: "0 4px 20px rgba(61, 43, 31, 0.25)",
                background: "#3D2B1F",
                color: "#fff",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '13px',
                fontWeight: '500',
              },
              success: {
                duration: 2200,
                style: {
                  background: "#15803D",
                  color: "#fff",
                },
              },
              error: {
                duration: 3200,
                style: {
                  background: "#C62828",
                  color: "#fff",
                },
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
