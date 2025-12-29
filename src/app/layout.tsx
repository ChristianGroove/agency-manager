import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getSettings } from "@/modules/core/settings/actions";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  const agencyName = settings?.agency_name || "Agency Manager";
  const faviconUrl = settings?.favicon_url || settings?.isotipo_url || "/favicon.ico";

  return {
    title: agencyName,
    description: `Sistema de gestión para ${agencyName}`,
    icons: {
      icon: faviconUrl,
      shortcut: faviconUrl,
      apple: faviconUrl,
    },
  };
}

import { TrashBinModal } from "@/modules/core/trash/trash-bin-modal";
import { Toaster } from "sonner";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getSettings();

  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <TrashBinModal shortcut={settings?.trash_shortcut} />
        <Toaster />
      </body>
    </html>
  );
}
