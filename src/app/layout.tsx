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

import { getEffectiveBranding } from "@/modules/core/branding/actions"; // Import new action
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"; // Need ID

export async function generateMetadata(): Promise<Metadata> {
  const orgId = await getCurrentOrganizationId();
  const branding = await getEffectiveBranding(orgId);

  return {
    title: branding.name,
    description: `Sistema de gestión para ${branding.name}`,
    icons: {
      icon: (branding.logos.favicon || "/pixy-isotipo.png") + "?v=2",
      shortcut: (branding.logos.favicon || "/pixy-isotipo.png") + "?v=2",
      apple: (branding.logos.favicon || "/pixy-isotipo.png") + "?v=2",
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
