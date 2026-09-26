import { NextRequest, NextResponse } from "next/server"
import { google } from "googleapis"
import { createClient } from "@/modules/core/database/supabase-server"
import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions"
import { encrypt } from "@/modules/infrastructure/integrations/encryption"

export const dynamic = "force-dynamic"

const GOOGLE_OAUTH_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
]

function getGoogleRedirectUri(req: NextRequest): string {
  const customRedirect = process.env.GOOGLE_REDIRECT_URI
  if (customRedirect) return customRedirect

  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (appUrl) {
    return `${appUrl.replace(/\/$/, "")}/api/integrations/google/callback`
  }

  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3001"
  const proto = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https")
  return `${proto}://${host}/api/integrations/google/callback`
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return new NextResponse(
        `<!DOCTYPE html><html><body><script>
          if (window.opener) {
            window.opener.postMessage({ type: 'GOOGLE_OAUTH_ERROR', message: 'Sesión no iniciada' }, window.location.origin);
          }
          window.close();
        </script><p>No autorizado. Inicia sesión en Pixy.</p></body></html>`,
        { status: 401, headers: { "Content-Type": "text/html; charset=utf-8" } }
      )
    }

    const orgId = await getCurrentOrganizationId()
    if (!orgId) {
      return new NextResponse(
        `<!DOCTYPE html><html><body><script>
          if (window.opener) {
            window.opener.postMessage({ type: 'GOOGLE_OAUTH_ERROR', message: 'Organización no activa' }, window.location.origin);
          }
          window.close();
        </script><p>No se encontró organización activa.</p></body></html>`,
        { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } }
      )
    }

    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      return new NextResponse(
        `<!DOCTYPE html>
        <html>
        <head><title>Configuración requerida</title></head>
        <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #09090b; color: #fff;">
          <div style="text-align: center; max-width: 480px; padding: 24px; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; background: #18181b;">
            <h3 style="margin-top: 0; color: #f87171;">Integración de Google pendiente de configuración</h3>
            <p style="font-size: 13px; color: #a1a1aa; line-height: 1.5;">
              Las variables GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET no están definidas en el entorno del servidor.
            </p>
            <button onclick="window.close()" style="margin-top: 12px; padding: 8px 16px; font-size: 12px; background: #27272a; color: #fff; border: 1px solid #3f3f46; border-radius: 8px; cursor: pointer;">
              Cerrar ventana
            </button>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'GOOGLE_OAUTH_ERROR', message: 'Credenciales de Google no configuradas en el servidor' }, window.location.origin);
            }
          </script>
        </body>
        </html>`,
        { status: 500, headers: { "Content-Type": "text/html; charset=utf-8" } }
      )
    }

    const redirectUri = getGoogleRedirectUri(req)
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri)

    // Cifrar state firmado con userId y orgId
    const statePayload = {
      userId: user.id,
      orgId,
      timestamp: Date.now(),
    }
    const state = encrypt(JSON.stringify(statePayload))

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: GOOGLE_OAUTH_SCOPES,
      state,
      include_granted_scopes: true,
    })

    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error("[Google OAuth Authorize Error]", error)
    return new NextResponse(
      `<!DOCTYPE html><html><body><script>
        if (window.opener) {
          window.opener.postMessage({ type: 'GOOGLE_OAUTH_ERROR', message: 'Error iniciando autorización con Google' }, window.location.origin);
        }
        window.close();
      </script><p>Error iniciando flujo OAuth con Google.</p></body></html>`,
      { status: 500, headers: { "Content-Type": "text/html; charset=utf-8" } }
    )
  }
}
