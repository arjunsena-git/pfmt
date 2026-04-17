import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BottomNav } from "@/components/layout/BottomNav";
import { ServiceWorkerRegister } from "./sw-register";
import { Providers } from "@/components/providers/Providers";

export const metadata: Metadata = {
  title: "Personal Finance Monthly Tracker",
  description: "Track your monthly income, expenses, savings and investments",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PFMT",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body className="h-full bg-background text-foreground">
        <Providers>
          <ServiceWorkerRegister />
          <main className="max-w-screen-sm mx-auto px-4 pt-4 pb-nav min-h-full">
            {children}
          </main>
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
