import type { Metadata } from "next";
import "./globals.css";
import RootChrome from "@/components/RootChrome";
import { SessionProvider } from "@/lib/SessionContext";
import { ToastProvider } from "@/lib/ToastContext";

export const metadata: Metadata = {
  title: "FlowDocs AI — Automatic Process Documentation",
  description: "Turn a screen recording into SOPs, training manuals, and knowledge base articles automatically.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-display antialiased">
        <ToastProvider>
          <SessionProvider>
            <RootChrome>{children}</RootChrome>
          </SessionProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
