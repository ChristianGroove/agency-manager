import { Metadata } from "next"
import { notFound } from "next/navigation"
import { getCollaboratorPortalData } from "@/modules/features/tasks/actions/collaborator-portal-actions"
import { TaskCollaboratorPortal } from "@/modules/features/tasks/components/portal/task-collaborator-portal"
import { AlertCircle } from "lucide-react"
import { BrandingProvider } from "@/components/providers/branding-provider"
import { BrandingConfig } from "@/types/branding"
import { GlobalParticles } from "@/components/layout/global-particles"

interface PageProps {
  params: Promise<{ token: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params
  const portalData = await getCollaboratorPortalData(token)

  if (!portalData) {
    return {
      title: "Portal de Colaborador",
    }
  }

  const favicon = portalData.organization.isotipo_url || "/pixy-isotipo.png"
  const orgName = portalData.organization.name || "Portal"

  return {
    title: `${portalData.staff.first_name} ${portalData.staff.last_name} | ${orgName}`,
    description: `Portal ágil de tareas para ${portalData.staff.role} en ${orgName}`,
    icons: {
      icon: favicon + "?v=2",
      shortcut: favicon + "?v=2",
      apple: favicon + "?v=2",
    },
  }
}

export default async function TaskCollaboratorPortalPage({ params }: PageProps) {
  const { token } = await params
  const portalData = await getCollaboratorPortalData(token)

  if (!portalData) {
    return (
      <div className="min-h-screen relative bg-gray-100 dark:bg-[#0a0a0a] flex items-center justify-center p-4">
        <div className="fixed inset-0 z-0 opacity-100 pointer-events-none overflow-hidden">
          <GlobalParticles />
        </div>
        <div className="max-w-md w-full p-8 rounded-3xl bg-card border border-border/80 text-center shadow-xl space-y-4 relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-foreground">
            Enlace Inválido o Expirado
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            No se pudo encontrar un colaborador activo con este token de acceso.
            Por favor solicita a tu administrador un nuevo enlace de acceso a tu portal.
          </p>
        </div>
      </div>
    )
  }

  const primaryColor = portalData.organization.primary_color || "#8ec045"
  const secondaryColor = portalData.organization.secondary_color || "#5c8ea9"

  const brandingConfig: BrandingConfig = {
    name: portalData.organization.name || "Portal",
    logos: {
      main: portalData.organization.logo_dark_url || portalData.organization.logo_url || null,
      main_light: portalData.organization.logo_light_url || portalData.organization.logo_url || null,
      portal: portalData.organization.logo_url || null,
      favicon: portalData.organization.isotipo_url || "/pixy-isotipo.png",
      login_bg: null,
    },
    colors: {
      primary: primaryColor,
      secondary: secondaryColor,
    },
    font_family: "Inter",
    socials: {},
  }

  return (
    <BrandingProvider initialBranding={brandingConfig}>
      {/* Script & Style DOM local: garantiza que la carga inicial del portal sea en tema claro sin destellos y con los colores exactos del tenant */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            :root, :root.dark, .dark, [data-theme="dark"], html, body {
              --primary: ${primaryColor} !important;
              --color-primary: ${primaryColor} !important;
              --brand-pink: ${primaryColor} !important;
              --sidebar-primary: ${primaryColor} !important;
              --ring: ${secondaryColor} !important;
              --color-ring: ${secondaryColor} !important;
              --brand-cyan: ${secondaryColor} !important;
            }
          `,
        }}
      />
      <script
        dangerouslySetInnerHTML={{
          __html: `
            try {
              document.documentElement.style.setProperty('--primary', '${primaryColor}', 'important');
              document.documentElement.style.setProperty('--color-primary', '${primaryColor}', 'important');
              document.documentElement.style.setProperty('--brand-pink', '${primaryColor}', 'important');
              document.documentElement.style.setProperty('--sidebar-primary', '${primaryColor}', 'important');
              document.documentElement.style.setProperty('--ring', '${secondaryColor}', 'important');
              document.documentElement.style.setProperty('--color-ring', '${secondaryColor}', 'important');
              document.documentElement.style.setProperty('--brand-cyan', '${secondaryColor}', 'important');
            } catch(e) {}
          `,
        }}
      />
      <TaskCollaboratorPortal portalData={portalData} token={token} />
    </BrandingProvider>
  )
}
