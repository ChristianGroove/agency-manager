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
  // PERF: Graceful fallback - don't block render on branding fetch errors
  try {
    const orgId = await getCurrentOrganizationId();
    if (!orgId) {
      return { title: 'Pixy', description: 'Sistema de gestión empresarial' };
    }
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
  } catch (e) {
    console.error('[Metadata] Error fetching branding, using defaults:', e);
    return { title: 'Pixy', description: 'Sistema de gestión empresarial' };
  }
}

import { TrashBinModal } from "@/modules/core/trash/trash-bin-modal";
import { Toaster } from "sonner";

import { BrandingProvider } from "@/components/providers/branding-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ThemeToggle } from "@/components/ui/theme-toggle";

import { ViewContextProvider } from "@/modules/core/caa/context/view-context";
import { ContextualActionAssistant } from "@/modules/core/caa/components";
import { ClientInit } from "@/modules/core/caa/client-init";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getSettings();
  const orgId = await getCurrentOrganizationId();
  const branding = await getEffectiveBranding(orgId);

  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <BrandingProvider initialBranding={branding}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <ViewContextProvider>
              <ClientInit />
              {children}
              <ContextualActionAssistant />
            </ViewContextProvider>
            <ThemeToggle />
            <TrashBinModal shortcut={settings?.trash_shortcut} />
            <Toaster />
          </ThemeProvider>
        </BrandingProvider>
      </body>

    </html>
  );
}
