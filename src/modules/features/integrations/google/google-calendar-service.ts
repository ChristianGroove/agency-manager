"use server"

import { google } from "googleapis"
import { supabaseAdmin } from "@/modules/core/database/supabase-admin"
import { createClient } from "@/modules/core/database/supabase-server"
import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions"
import { encrypt, decrypt } from "@/modules/infrastructure/integrations/encryption"
import type { UserOAuthConnection } from "@/modules/features/tasks/types"

/**
 * Consulta el estado de vinculación de Google Meet del usuario actual
 */
export async function getCurrentUserGoogleConnection(): Promise<{
  isConnected: boolean
  accountEmail?: string
  accountName?: string
  accountAvatarUrl?: string
}> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return { isConnected: false }

    const orgId = await getCurrentOrganizationId()
    if (!orgId) return { isConnected: false }

    const { data, error } = await supabaseAdmin
      .from("user_oauth_connections")
      .select("account_email, account_name, account_avatar_url, is_active")
      .eq("organization_id", orgId)
      .eq("user_id", user.id)
      .eq("provider", "google")
      .eq("is_active", true)
      .maybeSingle()

    if (error || !data) {
      return { isConnected: false }
    }

    return {
      isConnected: true,
      accountEmail: data.account_email,
      accountName: data.account_name || undefined,
      accountAvatarUrl: data.account_avatar_url || undefined,
    }
  } catch (error) {
    console.error("[getCurrentUserGoogleConnection Error]", error)
    return { isConnected: false }
  }
}

/**
 * Desconecta la cuenta de Google del usuario actual para esta organización
 */
export async function disconnectCurrentUserGoogle(): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return { success: false, error: "No autorizado" }

    const orgId = await getCurrentOrganizationId()
    if (!orgId) return { success: false, error: "Organización no encontrada" }

    const { error } = await supabaseAdmin
      .from("user_oauth_connections")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("organization_id", orgId)
      .eq("user_id", user.id)
      .eq("provider", "google")

    if (error) {
      console.error("[disconnectCurrentUserGoogle Error]", error)
      return { success: false, error: "Error al desconectar la cuenta" }
    }

    return { success: true }
  } catch (error) {
    console.error("[disconnectCurrentUserGoogle Catch]", error)
    return { success: false, error: "Error inesperado al desconectar" }
  }
}

/**
 * Obtiene un cliente OAuth2 autenticado con refresco de token transparente
 */
export async function getValidGoogleOAuthClient(
  userId: string,
  orgId: string
) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    return null
  }

  const { data: conn, error } = await supabaseAdmin
    .from("user_oauth_connections")
    .select("*")
    .eq("organization_id", orgId)
    .eq("user_id", userId)
    .eq("provider", "google")
    .eq("is_active", true)
    .maybeSingle()

  if (error || !conn) {
    return null
  }

  let accessToken: string
  let refreshToken: string | null = null

  try {
    accessToken = decrypt(conn.encrypted_access_token)
    if (conn.encrypted_refresh_token) {
      refreshToken = decrypt(conn.encrypted_refresh_token)
    }
  } catch (err) {
    console.error("[getValidGoogleOAuthClient Decrypt Error]", err)
    return null
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret)
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken || undefined,
  })

  // Verificar si el token está por expirar o expiró (margen de 2 minutos)
  const isExpiringSoon = conn.token_expires_at
    ? new Date(conn.token_expires_at).getTime() - Date.now() < 2 * 60 * 1000
    : false

  if (isExpiringSoon && refreshToken) {
    try {
      const refreshed = await oauth2Client.refreshAccessToken()
      const newTokens = refreshed.credentials
      if (newTokens.access_token) {
        const newEncryptedAccess = encrypt(newTokens.access_token)
        const newExpiresAt = newTokens.expiry_date
          ? new Date(newTokens.expiry_date).toISOString()
          : null

        await supabaseAdmin
          .from("user_oauth_connections")
          .update({
            encrypted_access_token: newEncryptedAccess,
            token_expires_at: newExpiresAt,
            updated_at: new Date().toISOString(),
          })
          .eq("id", conn.id)

        oauth2Client.setCredentials(newTokens)
      }
    } catch (refreshErr) {
      console.error("[getValidGoogleOAuthClient Refresh Error]", refreshErr)
      // Si falla el refresco, continuamos con el token existente si aún no está vencido del todo
    }
  }

  return oauth2Client
}

export interface CreateGoogleMeetEventParams {
  title: string
  description?: string | null
  startAt?: string | null
  durationMinutes?: number | null
  attendeeEmails?: string[]
  userId: string
  orgId: string
}

export interface CreateGoogleMeetEventResult {
  meetingUrl: string | null
  externalMeetingId: string | null
  error?: string
}

/**
 * Crea un evento en Google Calendar con enlace automático de Google Meet y sincronización de invitados
 */
export async function createGoogleCalendarMeetingEvent(
  params: CreateGoogleMeetEventParams
): Promise<CreateGoogleMeetEventResult> {
  try {
    const oauth2Client = await getValidGoogleOAuthClient(params.userId, params.orgId)
    if (!oauth2Client) {
      return {
        meetingUrl: null,
        externalMeetingId: null,
        error: "No hay cuenta de Google vinculada o las credenciales no son válidas",
      }
    }

    const calendar = google.calendar({ version: "v3", auth: oauth2Client })

    // Calcular fechas de inicio y fin
    const start = params.startAt && !isNaN(new Date(params.startAt).getTime())
      ? new Date(params.startAt)
      : new Date(Date.now() + 5 * 60 * 1000)

    const duration = params.durationMinutes && params.durationMinutes > 0
      ? Number(params.durationMinutes)
      : 30

    const end = new Date(start.getTime() + duration * 60 * 1000)

    // Filtrar emails válidos
    const validEmails = (params.attendeeEmails || [])
      .map((e) => e?.trim())
      .filter((e): e is string => Boolean(e && e.includes("@")))

    const requestId = `pixy-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`

    const response = await calendar.events.insert({
      calendarId: "primary",
      conferenceDataVersion: 1,
      sendUpdates: "all", // Envía invitaciones automáticas por email a los convocados
      requestBody: {
        summary: params.title,
        description: params.description || undefined,
        start: {
          dateTime: start.toISOString(),
        },
        end: {
          dateTime: end.toISOString(),
        },
        attendees: validEmails.map((email) => ({ email })),
        conferenceData: {
          createRequest: {
            requestId,
            conferenceSolutionKey: {
              type: "hangoutsMeet",
            },
          },
        },
      },
    })

    const event = response.data
    const meetingUrl =
      event.hangoutLink ||
      event.conferenceData?.entryPoints?.find((ep) => ep.entryPointType === "video")?.uri ||
      null

    return {
      meetingUrl,
      externalMeetingId: event.id || null,
    }
  } catch (error) {
    console.error("[createGoogleCalendarMeetingEvent Error]", error)
    return {
      meetingUrl: null,
      externalMeetingId: null,
      error: error instanceof Error ? error.message : "Error al comunicarse con Google Calendar",
    }
  }
}
