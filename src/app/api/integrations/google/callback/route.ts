import { NextRequest, NextResponse } from "next/server"
import { google } from "googleapis"
import { supabaseAdmin } from "@/modules/core/database/supabase-admin"
import { encrypt, decrypt } from "@/modules/infrastructure/integrations/encryption"

export const dynamic = "force-dynamic"

function getGoogleRedirectUri(req: NextRequest): string {
  const customRedirect = process.env.GOOGLE_REDIRECT_URI
  if (customRedirect) return customRedirect

  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || req.nextUrl.host
  if (host) {
    const proto = req.headers.get("x-forwarded-proto") || (host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https")
    return `${proto}://${host}/api/integrations/google/callback`
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (appUrl) {
    return `${appUrl.replace(/\/$/, "")}/api/integrations/google/callback`
  }

  return "http://localhost:3001/api/integrations/google/callback"
}

function renderHtmlResponse(success: boolean, title: string, description: string, messagePayload: any) {
  const accentColor = success ? "#10b981" : "#ef4444"
  return new NextResponse(
    `<!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="utf-8" />
      <title>${title}</title>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #09090b; color: #fff;">
      <div style="text-align: center; max-width: 440px; padding: 32px 24px; border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; background: #121215; box-shadow: 0 20px 40px -15px rgba(0,0,0,0.7);">
        <div style="width: 48px; height: 48px; border-radius: 12px; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center; background: ${accentColor}15; border: 1px solid ${accentColor}30;">
          <div style="width: 14px; height: 14px; border-radius: 50%; background: ${accentColor};"></div>
        </div>
        <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 700; color: #fafafa;">${title}</h3>
        <p style="margin: 0 0 20px 0; font-size: 13px; color: #a1a1aa; line-height: 1.5;">${description}</p>
        <button onclick="window.close()" style="padding: 8px 18px; font-size: 12px; font-weight: 600; background: #27272a; color: #fafafa; border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; cursor: pointer;">
          Cerrar ventana
        </button>
      </div>
      <script>
        try {
          if (window.opener) {
            window.opener.postMessage(${JSON.stringify(messagePayload)}, window.location.origin);
          }
        } catch (e) {
          console.error("Error enviando postMessage", e);
        }
        ${success ? "setTimeout(function() { window.close(); }, 1400);" : ""}
      </script>
    </body>
    </html>`,
    {
      status: success ? 200 : 400,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    }
  )
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const errorParam = searchParams.get("error")
    const code = searchParams.get("code")
    const rawState = searchParams.get("state")

    if (errorParam) {
      return renderHtmlResponse(
        false,
        "Autorización Cancelada",
        "No se completó la vinculación con Google. Puedes intentarlo de nuevo cuando lo requieras.",
        { type: "GOOGLE_OAUTH_ERROR", message: "Autorización cancelada o rechazada en Google" }
      )
    }

    if (!code || !rawState) {
      return renderHtmlResponse(
        false,
        "Parámetros Inválidos",
        "La respuesta de Google no incluye los parámetros requeridos de código o estado.",
        { type: "GOOGLE_OAUTH_ERROR", message: "Faltan parámetros en la respuesta de Google" }
      )
    }

    // Descifrar y validar state
    let stateData: { userId?: string | null; staffId?: string | null; orgId: string; timestamp: number; redirectUri?: string }
    try {
      const decrypted = decrypt(rawState)
      stateData = JSON.parse(decrypted)
    } catch (e) {
      return renderHtmlResponse(
        false,
        "Validación de Seguridad Fallida",
        "El parámetro de estado no es válido o ha expirado.",
        { type: "GOOGLE_OAUTH_ERROR", message: "Estado de seguridad inválido" }
      )
    }

    // Validar expiración del state (máximo 15 minutos)
    if (Date.now() - stateData.timestamp > 15 * 60 * 1000) {
      return renderHtmlResponse(
        false,
        "Sesión de Vinculación Expirada",
        "El tiempo límite de 15 minutos para autorizar la conexión ha vencido. Intenta de nuevo.",
        { type: "GOOGLE_OAUTH_ERROR", message: "Tiempo de autorización expirado" }
      )
    }

    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const redirectUri = stateData.redirectUri || getGoogleRedirectUri(req)

    if (!clientId || !clientSecret) {
      return renderHtmlResponse(
        false,
        "Configuración Incompleta",
        "El servidor no tiene configuradas las credenciales de cliente de Google.",
        { type: "GOOGLE_OAUTH_ERROR", message: "Credenciales de Google no configuradas en el servidor" }
      )
    }

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri)

    // Intercambiar código de autorización por tokens
    const { tokens } = await oauth2Client.getToken(code)
    oauth2Client.setCredentials(tokens)

    // Obtener información del perfil del usuario en Google
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client })
    const { data: profile } = await oauth2.userinfo.get()

    const accountEmail = profile.email || "Cuenta de Google"
    const accountName = profile.name || null
    const accountAvatarUrl = profile.picture || null

    if (!tokens.access_token) {
      return renderHtmlResponse(
        false,
        "Error de Tokens",
        "Google no entregó un token de acceso válido.",
        { type: "GOOGLE_OAUTH_ERROR", message: "Token de acceso no recibido" }
      )
    }

    // Cifrar access_token y refresh_token con AES-256-GCM
    const encryptedAccessToken = encrypt(tokens.access_token)
    const encryptedRefreshToken = tokens.refresh_token ? encrypt(tokens.refresh_token) : null
    const tokenExpiresAt = tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null

    // Verificar si ya existe conexión previa para preservar refresh_token si Google no lo devolvió esta vez
    let existingQuery = supabaseAdmin
      .from("user_oauth_connections")
      .select("id, encrypted_refresh_token")
      .eq("organization_id", stateData.orgId)
      .eq("provider", "google")

    if (stateData.staffId) {
      existingQuery = existingQuery.eq("staff_id", stateData.staffId)
    } else if (stateData.userId) {
      existingQuery = existingQuery.eq("user_id", stateData.userId)
    }

    const { data: existingConnection } = await existingQuery.maybeSingle()

    const grantedScopes = tokens.scope ? tokens.scope.split(" ") : []
    const hasCalendarScope = grantedScopes.some((s) => s.includes("calendar"))

    if (!hasCalendarScope) {
      return renderHtmlResponse(
        false,
        "Permiso de Google Calendar Faltante",
        `Tu cuenta (${accountEmail}) inició sesión, pero no marcaste la casilla de verificación de Google Calendar en la pantalla de autorización. Para generar enlaces de Meet automáticamente, vuelve a conectar y asegúrate de marcar la casilla de verificación de Calendar.`,
        {
          type: "GOOGLE_OAUTH_ERROR",
          message: "Falta marcar la casilla de permisos de Google Calendar al autorizar la cuenta.",
        }
      )
    }

    const finalRefreshToken = encryptedRefreshToken || existingConnection?.encrypted_refresh_token || null

    // Guardar o actualizar la conexión
    let upsertError: any = null
    if (existingConnection) {
      const { error } = await supabaseAdmin
        .from("user_oauth_connections")
        .update({
          account_email: accountEmail,
          account_name: accountName,
          account_avatar_url: accountAvatarUrl,
          encrypted_access_token: encryptedAccessToken,
          encrypted_refresh_token: finalRefreshToken,
          token_expires_at: tokenExpiresAt,
          scopes: tokens.scope ? tokens.scope.split(" ") : [],
          is_active: true,
          user_id: stateData.userId || null,
          staff_id: stateData.staffId || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingConnection.id)
      upsertError = error
    } else {
      const { error } = await supabaseAdmin
        .from("user_oauth_connections")
        .insert({
          organization_id: stateData.orgId,
          user_id: stateData.userId || null,
          staff_id: stateData.staffId || null,
          provider: "google",
          account_email: accountEmail,
          account_name: accountName,
          account_avatar_url: accountAvatarUrl,
          encrypted_access_token: encryptedAccessToken,
          encrypted_refresh_token: finalRefreshToken,
          token_expires_at: tokenExpiresAt,
          scopes: tokens.scope ? tokens.scope.split(" ") : [],
          is_active: true,
          updated_at: new Date().toISOString(),
        })
      upsertError = error
    }

    if (upsertError) {
      console.error("[Google OAuth Callback Upsert Error]", upsertError)
      return renderHtmlResponse(
        false,
        "Error de Almacenamiento",
        "No se pudo guardar la conexión en la base de datos.",
        { type: "GOOGLE_OAUTH_ERROR", message: "Error persistiendo conexión" }
      )
    }

    return renderHtmlResponse(
      true,
      "Google Meet Conectado",
      `Tu cuenta (${accountEmail}) ha sido vinculada exitosamente. Las reuniones generarán su enlace automáticamente.`,
      {
        type: "GOOGLE_OAUTH_SUCCESS",
        provider: "google",
        email: accountEmail,
        name: accountName,
        avatarUrl: accountAvatarUrl,
      }
    )
  } catch (error) {
    console.error("[Google OAuth Callback Error]", error)
    return renderHtmlResponse(
      false,
      "Error Inesperado",
      "Ocurrió un error inesperado al procesar la vinculación con Google.",
      { type: "GOOGLE_OAUTH_ERROR", message: "Error procesando autorización" }
    )
  }
}
