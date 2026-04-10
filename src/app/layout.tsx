import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getSettings } from "@/modules/core/settings/settings-actions";

export const dynamic = "force-dynamic";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import { getEffectiveBranding } from "@/modules/core/branding/actions"; // Import new action
import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions"; // Need ID

export async function generateMetadata(): Promise<Metadata> {
  // PERF: Graceful fallback - don't block render on branding fetch errors
  try {
    const orgId = await getCurrentOrganizationId();
    if (!orgId) {
      return { title: 'Pixy', description: 'Sistema de gestiÃ³n empresarial' };
    }
    const branding = await getEffectiveBranding(orgId);
    return {
      title: branding.name,
      description: `Sistema de gestiÃ³n para ${branding.name}`,
      icons: {
        icon: (branding.logos.favicon || "/pixy-isotipo.png") + "?v=2",
        shortcut: (branding.logos.favicon || "/pixy-isotipo.png") + "?v=2",
        apple: (branding.logos.favicon || "/pixy-isotipo.png") + "?v=2",
      },
    };
  } catch (e) {
    console.error('[Metadata] Error fetching branding, using defaults:', e);
    return { title: 'Pixy', description: 'Sistema de gestiÃ³n empresarial' };
  }
}

import { Toaster } from "sonner";

import { AuthRefresher } from "@/components/providers/auth-refresher";
import StyledJsxRegistry from "@/components/providers/styled-jsx-registry";
import { BrandingProvider } from "@/components/providers/branding-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ViewContextProvider } from "@\/modules\/features\/caa/context/view-context";
import { ClientInit } from "@\/modules\/features\/caa/client-init";

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
              </ViewContextProvider>
              <Toaster />
            </ThemeProvider>
          </BrandingProvider>
        </StyledJsxRegistry>
      </body>
    </html>
  );
}

