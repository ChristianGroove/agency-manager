"use server"

import { google } from "googleapis"
import { supabaseAdmin } from "@/modules/core/database/supabase-admin"
import { createClient } from "@/modules/core/database/supabase-server"
import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions"
import { encrypt, decrypt } from "@/modules/infrastructure/integrations/encryption"
import type { UserOAuthConnection, RecurrenceInterval } from "@/modules/features/tasks/types"
import { formatGoogleCalendarRrule } from "@/modules/features/tasks/utils/recurrence-utils"

/**
 * Consulta el estado de vinculación de Google Meet del usuario actual (plataforma o portal)
 */
export async function getCurrentUserGoogleConnection(params?: { portalToken?: string }): Promise<{
  isConnected: boolean
  hasCalendarScope?: boolean
  accountEmail?: string
  accountName?: string
  accountAvatarUrl?: string
}> {
  try {
    let orgId: string | null = null
    let userId: string | null = null
    let staffId: string | null = null

    if (params?.portalToken) {
      const { data: staff } = await supabaseAdmin
        .from("organization_staff")
        .select("id, organization_id, user_id")
        .eq("access_token", params.portalToken)
        .eq("is_active", true)
        .maybeSingle()

      if (!staff) return { isConnected: false }
      staffId = staff.id
      userId = staff.user_id || null
      orgId = staff.organization_id
    } else {
      const supabase = await createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return { isConnected: false }
      userId = user.id
      orgId = await getCurrentOrganizationId()
    }

    if (!orgId) return { isConnected: false }

    let query = supabaseAdmin
      .from("user_oauth_connections")
      .select("account_email, account_name, account_avatar_url, is_active, scopes")
      .eq("organization_id", orgId)
      .eq("provider", "google")
      .eq("is_active", true)

    if (staffId && userId) {
      query = query.or(`staff_id.eq.${staffId},user_id.eq.${userId}`)
    } else if (staffId) {
      query = query.or(`staff_id.eq.${staffId},is_active.eq.true`)
    } else if (userId) {
      query = query.eq("user_id", userId)
    }

    const { data, error } = await query
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error || !data) {
      return { isConnected: false }
    }

    const hasCalendarScope = Array.isArray(data.scopes) && data.scopes.some((s: string) => s.includes("calendar"))
    if (!hasCalendarScope) {
      return {
        isConnected: false,
        hasCalendarScope: false,
        accountEmail: data.account_email,
      }
    }

    return {
      isConnected: true,
      hasCalendarScope: true,
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
 * Desconecta la cuenta de Google del usuario actual para esta organización (plataforma o portal)
 */
export async function disconnectCurrentUserGoogle(params?: { portalToken?: string }): Promise<{ success: boolean; error?: string }> {
  try {
    let orgId: string | null = null
    let userId: string | null = null
    let staffId: string | null = null

    if (params?.portalToken) {
      const { data: staff } = await supabaseAdmin
        .from("organization_staff")
        .select("id, organization_id, user_id")
        .eq("access_token", params.portalToken)
        .eq("is_active", true)
        .maybeSingle()

      if (!staff) return { success: false, error: "No autorizado" }
      staffId = staff.id
      userId = staff.user_id || null
      orgId = staff.organization_id
    } else {
      const supabase = await createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return { success: false, error: "No autorizado" }
      userId = user.id
      orgId = await getCurrentOrganizationId()
    }

    if (!orgId) return { success: false, error: "Organización no encontrada" }

    let updateQuery = supabaseAdmin
      .from("user_oauth_connections")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("organization_id", orgId)
      .eq("provider", "google")

    if (staffId && userId) {
      updateQuery = updateQuery.or(`staff_id.eq.${staffId},user_id.eq.${userId}`)
    } else if (staffId) {
      updateQuery = updateQuery.or(`staff_id.eq.${staffId},is_active.eq.true`)
    } else if (userId) {
      updateQuery = updateQuery.eq("user_id", userId)
    }

    const { error } = await updateQuery

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
  userId?: string | null,
  orgId?: string,
  staffId?: string | null
) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!clientId || !clientSecret || !orgId) {
    return null
  }

  let query = supabaseAdmin
    .from("user_oauth_connections")
    .select("*")
    .eq("organization_id", orgId)
    .eq("provider", "google")
    .eq("is_active", true)

  if (staffId && userId) {
    query = query.or(`staff_id.eq.${staffId},user_id.eq.${userId}`)
  } else if (staffId) {
    query = query.or(`staff_id.eq.${staffId},is_active.eq.true`)
  } else if (userId) {
    query = query.eq("user_id", userId)
  }

  const { data: conn, error } = await query
    .order("updated_at", { ascending: false })
    .limit(1)
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
  userId?: string | null
  staffId?: string | null
  orgId: string
  isRecurring?: boolean | null
  recurrenceInterval?: RecurrenceInterval | null
  recurrenceDays?: number[] | null
  recurrenceDay?: number | null
  timeZone?: string
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
    const oauth2Client = await getValidGoogleOAuthClient(params.userId, params.orgId, params.staffId)
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

    const timeZone =
      params.timeZone ||
      Intl.DateTimeFormat().resolvedOptions().timeZone ||
      "America/Bogota"

    const rrule = formatGoogleCalendarRrule({
      isRecurring: params.isRecurring,
      recurrenceInterval: params.recurrenceInterval,
      recurrenceDays: params.recurrenceDays,
      recurrenceDay: params.recurrenceDay,
    })

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
          timeZone,
        },
        end: {
          dateTime: end.toISOString(),
          timeZone,
        },
        ...(rrule ? { recurrence: rrule } : {}),
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

export interface UpdateGoogleMeetEventParams {
  externalMeetingId: string
  title?: string
  description?: string | null
  startAt?: string | null
  durationMinutes?: number | null
  attendeeEmails?: string[]
  userId?: string | null
  staffId?: string | null
  orgId: string
  isRecurring?: boolean | null
  recurrenceInterval?: RecurrenceInterval | null
  recurrenceDays?: number[] | null
  recurrenceDay?: number | null
  timeZone?: string
}

export interface UpdateGoogleMeetEventResult {
  success: boolean
  meetingUrl?: string | null
  error?: string
}

/**
 * Actualiza una reunión existente en Google Calendar y notifica a los convocados por correo
 */
export async function updateGoogleCalendarMeetingEvent(
  params: UpdateGoogleMeetEventParams
): Promise<UpdateGoogleMeetEventResult> {
  try {
    if (!params.externalMeetingId) {
      return { success: false, error: "Identificador de reunión externa no especificado" }
    }

    const oauth2Client = await getValidGoogleOAuthClient(params.userId, params.orgId, params.staffId)
    if (!oauth2Client) {
      return {
        success: false,
        error: "No hay cuenta de Google vinculada o las credenciales no son válidas",
      }
    }

    const calendar = google.calendar({ version: "v3", auth: oauth2Client })
    const requestBody: any = {}

    if (params.title !== undefined) {
      requestBody.summary = params.title
    }

    if (params.description !== undefined) {
      requestBody.description = params.description || ""
    }

    const timeZone =
      params.timeZone ||
      Intl.DateTimeFormat().resolvedOptions().timeZone ||
      "America/Bogota"

    if (params.startAt !== undefined && params.startAt) {
      const start = !isNaN(new Date(params.startAt).getTime())
        ? new Date(params.startAt)
        : new Date(Date.now() + 5 * 60 * 1000)

      const duration = params.durationMinutes && params.durationMinutes > 0
        ? Number(params.durationMinutes)
        : 30

      const end = new Date(start.getTime() + duration * 60 * 1000)

      requestBody.start = {
        dateTime: start.toISOString(),
        timeZone,
      }
      requestBody.end = {
        dateTime: end.toISOString(),
        timeZone,
      }
    }

    if (params.isRecurring !== undefined || params.recurrenceInterval !== undefined) {
      const rrule = formatGoogleCalendarRrule({
        isRecurring: params.isRecurring,
        recurrenceInterval: params.recurrenceInterval,
        recurrenceDays: params.recurrenceDays,
        recurrenceDay: params.recurrenceDay,
      })
      requestBody.recurrence = rrule || []
    }

    if (params.attendeeEmails !== undefined) {
      const validEmails = (params.attendeeEmails || [])
        .map((e) => e?.trim())
        .filter((e): e is string => Boolean(e && e.includes("@")))
      requestBody.attendees = validEmails.map((email) => ({ email }))
    }

    const response = await calendar.events.patch({
      calendarId: "primary",
      eventId: params.externalMeetingId,
      sendUpdates: "all", // Envía actualización por correo a los convocados
      requestBody,
    })

    const event = response.data
    const meetingUrl =
      event.hangoutLink ||
      event.conferenceData?.entryPoints?.find((ep) => ep.entryPointType === "video")?.uri ||
      null

    return {
      success: true,
      meetingUrl,
    }
  } catch (error: any) {
    console.error("[updateGoogleCalendarMeetingEvent Error]", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al actualizar reunión en Google Calendar",
    }
  }
}

export interface DeleteGoogleMeetEventParams {
  externalMeetingId: string
  userId?: string | null
  staffId?: string | null
  orgId: string
}

export interface DeleteGoogleMeetEventResult {
  success: boolean
  error?: string
}

/**
 * Cancela y elimina una reunión de Google Calendar y notifica la cancelación a los convocados
 */
export async function deleteGoogleCalendarMeetingEvent(
  params: DeleteGoogleMeetEventParams
): Promise<DeleteGoogleMeetEventResult> {
  try {
    if (!params.externalMeetingId) {
      return { success: true }
    }

    const oauth2Client = await getValidGoogleOAuthClient(params.userId, params.orgId, params.staffId)
    if (!oauth2Client) {
      return {
        success: false,
        error: "No hay cuenta de Google vinculada o las credenciales no son válidas",
      }
    }

    const calendar = google.calendar({ version: "v3", auth: oauth2Client })

    await calendar.events.delete({
      calendarId: "primary",
      eventId: params.externalMeetingId,
      sendUpdates: "all", // Envía correo de cancelación a todos los convocados
    })

    return { success: true }
  } catch (error: any) {
    // Si el evento ya fue cancelado o no existe en Google (404 o 410), se considera completado
    if (error?.code === 404 || error?.code === 410 || error?.status === 404 || error?.status === 410) {
      return { success: true }
    }
    console.error("[deleteGoogleCalendarMeetingEvent Error]", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al cancelar reunión en Google Calendar",
    }
  }
}

