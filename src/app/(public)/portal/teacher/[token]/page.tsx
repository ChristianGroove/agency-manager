import { Metadata } from "next";
import { getTeacherPortalData } from "@/modules/features/school/actions/teacher-portal-actions";
import { TeacherTacticalPortalView } from "@/modules/features/school/components/portal/teacher-tactical-portal-view";
import { AlertCircle } from "lucide-react";
import { BrandingProvider } from "@/components/providers/branding-provider";
import { BrandingConfig } from "@/types/branding";
import { GlobalParticles } from "@/components/layout/global-particles";

interface PageProps {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params;
  const portalData = await getTeacherPortalData(token);

  if (!portalData) {
    return {
      title: "Portal Docente | Pixy Edu",
    };
  }

  const orgName = portalData.organization.name || "Colegio";
  const teacherName = `${portalData.teacher.firstName} ${portalData.teacher.lastName}`;

  return {
    title: `${teacherName} | Portal Docente - ${orgName}`,
    description: `Operación pedagógica ágil, asistencia y calificaciones para ${teacherName} en ${orgName}`,
    icons: {
      icon: (portalData.organization.logoUrl || "/pixy-isotipo.png") + "?v=2",
      shortcut: (portalData.organization.logoUrl || "/pixy-isotipo.png") + "?v=2",
    },
  };
}

export default async function TeacherPortalPage({ params }: PageProps) {
  const { token } = await params;
  const portalData = await getTeacherPortalData(token);

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
            Enlace Docente Inválido o Expirado
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            No se encontró un registro docente activo asociado a este token de acceso seguro.
            Por favor solicita a la coordinación académica de tu institución un nuevo enlace.
          </p>
        </div>
      </div>
    );
  }

  const brandingConfig: BrandingConfig = {
    name: portalData.organization.name || "Colegio",
    logos: {
      main: portalData.organization.logoUrl || null,
      main_light: portalData.organization.logoUrl || null,
      portal: portalData.organization.logoUrl || null,
      favicon: portalData.organization.logoUrl || "/pixy-isotipo.png",
      login_bg: null,
    },
    colors: {
      primary: portalData.organization.primaryColor || "#2563eb",
      secondary: portalData.organization.secondaryColor || "#38bdf8",
    },
    font_family: "Inter",
    socials: {},
  };

  return (
    <BrandingProvider initialBranding={brandingConfig}>
      <script
        dangerouslySetInnerHTML={{
          __html: `try{document.documentElement.classList.remove('dark');}catch(e){}`,
        }}
      />
      <TeacherTacticalPortalView portalData={portalData} />
    </BrandingProvider>
  );
}
