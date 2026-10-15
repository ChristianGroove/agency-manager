import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { getSettings } from "@/modules/core/settings/actions/crud";

export const dynamic = "force-dynamic";

const geistSans = localFont({
  src: "./fonts/geist-latin.woff2",
  variable: "--font-geist-sans",
  weight: "100 900",
  display: "swap",
});

const geistMono = localFont({
  src: "./fonts/geist-mono-latin.woff2",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "swap",
});

import { getEffectiveBranding } from "@/modules/core/branding/actions"; // Import new action
import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions"; // Need ID

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

import { Toaster } from "sonner";

import { AuthRefresher } from "@/components/providers/auth-refresher";
import StyledJsxRegistry from "@/components/providers/styled-jsx-registry";
import { BrandingProvider } from "@/components/providers/branding-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ViewContextProvider } from "@/modules/features/caa/context/view-context";
import { ClientInit } from "@/modules/features/caa/client-init";
import { QueryProvider } from "@/components/providers/query-provider";
import { TooltipProvider } from "@/components/ui/tooltip";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // 1. Parallel Fetch of Global Context
  const [settings, orgId] = await Promise.all([
    getSettings(),
    getCurrentOrganizationId()
  ]);

  // 2. Fetch Branding (Depends on OrgId, but memoized)
  const branding = await getEffectiveBranding(orgId);

  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <StyledJsxRegistry>
          <AuthRefresher />
          <QueryProvider>
            <BrandingProvider initialBranding={branding}>
              <ThemeProvider
                attribute="class"
                defaultTheme="system"
                enableSystem
                disableTransitionOnChange
              >
                <ViewContextProvider>
                  <TooltipProvider delayDuration={150}>
                    <ClientInit />
                    {children}
                  </TooltipProvider>
                </ViewContextProvider>
                <Toaster />
              </ThemeProvider>
            </BrandingProvider>
          </QueryProvider>
        </StyledJsxRegistry>
      </body>
    </html>
  );
}

