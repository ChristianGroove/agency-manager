"use server"

import { headers } from "next/headers"
import { createClient } from "@/lib/supabase-server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { getCurrentOrganizationId } from "@/modules/core/organizations/actions"
import { trackStorageUpload, validateStorageLimit } from "@/modules/core/storage/actions"
import { requireOrgRole } from "@/lib/auth/org-roles"

// Haversine formula to calculate distance between two lat/lng points in meters
function calculateDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const p1 = lat1 * Math.PI / 180; // φ, λ in radians
    const p2 = lat2 * Math.PI / 180;
    const dp = (lat2 - lat1) * Math.PI / 180;
    const dl = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(dp / 2) * Math.sin(dp / 2) +
        Math.cos(p1) * Math.cos(p2) *
        Math.sin(dl / 2) * Math.sin(dl / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(R * c); // Distance in meters
}

const AttendancePayloadSchema = z.object({
    staffToken: z.string().uuid(),
    type: z.enum(['check_in', 'check_out', 'break_start', 'break_end']),
    photoUrl: z.string().url("A photo is strictly requires for attendance."),
    deviceLat: z.number().nullable(),
    deviceLng: z.number().nullable(),
    accuracyMeters: z.number().nullable(),
})

type AttendancePayload = z.infer<typeof AttendancePayloadSchema>

export interface Staff {
    id: string
    organization_id: string
    location_id: string | null
    user_id: string | null
    first_name: string
    last_name: string
    document_id: string | null
    phone: string | null
    email: string | null
    role: string
    access_token: string
    is_active: boolean
    photo_url: string | null
    shift_type: 'continuous' | 'split'
    created_at: string
    updated_at: string
}


/**
 * Registra la Asistencia (ZERO-TRUST LOCAL TIME)
 * 1. El tiempo NO se envía desde el cliente. Supabase usa su `now().
 * 2. Verifica la Geocerca (Haversine).
 * 3. Valida exactitud GPS.
 */
export async function registerAttendanceMark(payload: AttendancePayload) {
    try {
        const validated = AttendancePayloadSchema.parse(payload)
        // Usamos supabaseAdmin para el lookup del staff porque el portal funciona con tokens anónimos 
        // que el RLS del cliente estándar bloquea por defecto.
        const supabase = supabaseAdmin

        // 1. Conseguir el Staff usando el Token
        const { data: staff, error: staffError } = await supabase
            .from('organization_staff')
            .select('id, organization_id, location_id, is_active, organization_locations(latitude, longitude, geofence_radius_meters, is_active)')
            .eq('access_token', validated.staffToken)
            .single()

        if (staffError || !staff) {
            return { success: false, error: "Token inválido o empleado no encontrado." }
        }
        if (!staff.is_active) {
            return { success: false, error: "El empleado se encuentra inactivo." }
        }

        const location = Array.isArray(staff.organization_locations) ? staff.organization_locations[0] : staff.organization_locations;

        if (!location) {
            return { success: false, error: "El empleado no tiene una sede asignada." }
        }
        if (!location.is_active) {
            return { success: false, error: "La sede asignada está inactiva." }
        }

        // --- LÓGICA ANTI-SPOOFING / FRAUDE ---
        let isValid = true
        const fraudFlags: string[] = []
        let distanceToLocation = null

        // A. Revisión de Precisión GPS (Evita Fake GPS o Geolocation por IP)
        if (validated.accuracyMeters === null || validated.accuracyMeters > 150) {
            isValid = false
            fraudFlags.push('low_accuracy_gps_or_disabled')
        }

        // B. Revisión de Geocerca (Haversine)
        if (validated.deviceLat && validated.deviceLng && location.latitude && location.longitude) {
            distanceToLocation = calculateDistanceInMeters(
                validated.deviceLat,
                validated.deviceLng,
                location.latitude,
                location.longitude
            )

            // Margen de tolerancia del 15% (mínimo 15m) para jitter de GPS y deriva de sensores
            const toleranceBuffer = Math.max(location.geofence_radius_meters * 0.15, 15)
            const allowedMaxDistance = location.geofence_radius_meters + toleranceBuffer

            if (distanceToLocation > allowedMaxDistance) {
                isValid = false
                fraudFlags.push(`out_of_geofence_${distanceToLocation}m`)
            }
        } else {
            // Si la sede no tiene lat/lng, no podemos validar, es un edge case operativo.
            // Si el device no tiene lat/lng, siempre es flag.
            if (!validated.deviceLat || !validated.deviceLng) {
                isValid = false
                fraudFlags.push('no_gps_coordinates')
            }
        }

        // C. Metadata de Dispositivo y Red (IP)
        const headersList = await headers()
        const ip = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || "unknown"
        const userAgent = headersList.get("user-agent") || "unknown"

        const deviceMetadata = {
            ip,
            userAgent,
            clientTimeReported: new Date().toISOString() // Solo para auditoría si hay desfase masivo
        }

        // 2. Insertar el Log (Postgres pondrá el timestamp real EXACTAMENTE AHORA)
        const { data: log, error: logError } = await supabase
            .from('attendance_logs')
            .insert({
                organization_id: staff.organization_id,
                staff_id: staff.id,
                location_id: staff.location_id,
                type: validated.type,
                photo_url: validated.photoUrl,
                device_lat: validated.deviceLat,
                device_lng: validated.deviceLng,
                accuracy_meters: validated.accuracyMeters,
                distance_to_location: distanceToLocation,
                is_valid: isValid,
                fraud_flags: fraudFlags,
                device_metadata: deviceMetadata
            })
            .select()
            .single()

        if (logError) {
            console.error("Error inserting attendance log:", logError)
            return { success: false, error: "Error en el servidor al registrar asistencia." }
        }

        // Todo ha ido bien (incluso si is_valid false, guardamos el log para registro/castigo)
        // Se recomienda revalidar algo si hubiese dashboards en vivo
        // revalidatePath('/dashboard/attendance') // Podria ser costoso

        return {
            success: true,
            data: log,
            warning: !isValid ? "Marca registrada, pero retenida por validación de seguridad." : null
        }

    } catch (err: any) {
        return { success: false, error: err.message || "Invalid payload" }
    }
}

/**
 * Sube una foto en base64 al Storage y devuelve la URL pública.
 * Por ahora usaremos el bucket 'public_assets'.
 */
export async function uploadAttendancePhoto(base64Image: string, staffId: string): Promise<{ success: boolean, url?: string, error?: string }> {
    try {
        // Usamos supabaseAdmin para evadir RLS, ya que el personal entrando via token no tiene sesión de Auth tradicional.
        const supabase = supabaseAdmin

        // Detect format or default to webp
        const mimeType = base64Image.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/)?.[1] || 'image/webp'
        const extension = mimeType.split('/')[1] || 'webp'

        // Extract base64 data
        const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "")
        const buffer = Buffer.from(base64Data, 'base64')

        const fileName = `attendance/${staffId}/${Date.now()}.${extension}`

        const { data, error } = await supabase
            .storage
            .from('public_assets')
            .upload(fileName, buffer, {
                contentType: mimeType,
                upsert: true
            })

        if (error) {
            // Fallback to branding bucket
            const { data: brandingData, error: brandingError } = await supabase
                .storage
                .from('branding')
                .upload(fileName, buffer, {
                    contentType: 'image/jpeg',
                    upsert: true
                })

            if (brandingError) {
                console.error("Storage upload error in both buckets:", brandingError)
                return { success: false, error: `Error subiendo la foto: ${brandingError.message}` }
            }

            const { data: publicUrlData } = supabase
                .storage
                .from('branding')
                .getPublicUrl(fileName)

            return { success: true, url: publicUrlData.publicUrl }
        }

        const { data: publicUrlData } = supabase
            .storage
            .from('public_assets')
            .getPublicUrl(fileName)

        return { success: true, url: publicUrlData.publicUrl }
    } catch (err: any) {
        return { success: false, error: err.message }
    }
}

/**
 * Upload Staff Photo to Storage via FormData (High Efficiency)
 */
export async function uploadStaffPhoto(formData: FormData) {
    try {
        const supabase = await createClient()
        const orgId = await getCurrentOrganizationId()

        if (!orgId) throw new Error("No organization context found")

        // 1. Verify Authorization
        try {
            await requireOrgRole('admin')
        } catch (e) {
            throw new Error("Unauthorized: Solo administradores pueden subir archivos.")
        }

        const file = formData.get("file") as File
        if (!file) throw new Error("No se ha seleccionado ningún archivo")

        // 2. Validate against Org Storage Limits
        const validation = await validateStorageLimit(orgId, file.size)
        if (!validation.allowed) {
            throw new Error(validation.message || "Límite de almacenamiento alcanzado.")
        }

        // 3. Prepare File Path
        const fileExt = file.name.split(".").pop() || 'webp'
        const fileName = `staff/${orgId}/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`

        // 4. Upload to Storage
        const bucket = "public_assets"
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(fileName, file, {
                upsert: true,
                contentType: file.type
            })

        if (uploadError) {
            // Fallback to 'branding' bucket
            const { data: brandingData, error: brandingError } = await supabase.storage
                .from("branding")
                .upload(fileName, file, {
                    upsert: true,
                    contentType: file.type
                })

            if (brandingError) {
                console.error("Staff upload error in both buckets:", brandingError)
                throw new Error(`Error al subir imagen: ${brandingError.message}`)
            }

            // 5. Track Usage
            await trackStorageUpload(orgId, file.size)

            // 6. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from("branding")
                .getPublicUrl(fileName)

            return { success: true, url: publicUrl }
        }

        // 5. Track Usage
        await trackStorageUpload(orgId, file.size)

        // 6. Get Public URL
        const { data: { publicUrl } } = supabase.storage
            .from(bucket)
            .getPublicUrl(fileName)

        return { success: true, url: publicUrl }
    } catch (err: any) {
        return { success: false, error: err.message }
    }
}

/**
 * Obtiene el historial de asistencia para administradores.
 */
export async function getAttendanceLogs(organizationId: string, limit = 100) {
    try {
        const supabase = await createClient()

        const { data, error } = await supabase
            .from('attendance_logs')
            .select(`
                *,
                staff:organization_staff(id, first_name, last_name, role),
                location:organization_locations(id, name)
            `)
            .eq('organization_id', organizationId)
            .order('timestamp', { ascending: false })
            .limit(limit)

        if (error) throw error
        return { success: true, data }
    } catch (err: any) {
        console.error("Error fetching logs:", err)
        return { success: false, error: "Failed to fetch attendance logs", data: [] }
    }
}

// ==========================================
// STAFF MANAGEMENT ACTIONS
// ==========================================

/**
 * Obtiene todo el personal de la organización
 */
export async function getStaff() {
    try {
        const currentOrgId = await getCurrentOrganizationId()
        if (!currentOrgId) return { success: false, data: [] }

        const supabase = await createClient()
        const { data, error } = await supabase
            .from('organization_staff')
            .select(`
                *,
                location:organization_locations(name)
            `)
            .eq('organization_id', currentOrgId)
            .order('created_at', { ascending: false })

        if (error) throw error
        return { success: true, data: data as (Staff & { location: { name: string } | null })[] }
    } catch (err: any) {
        console.error("Error fetching staff:", err)
        return { success: false, error: "Error al cargar el personal", data: [] }
    }
}

/**
 * Registra un nuevo colaborador
 */
export async function createStaff(payload: Partial<Staff>) {
    try {
        const currentOrgId = await getCurrentOrganizationId()
        if (!currentOrgId) return { success: false, error: 'Unauthorized' }

        const supabase = await createClient()

        const { data, error } = await supabase
            .from('organization_staff')
            .insert({
                organization_id: currentOrgId,
                first_name: payload.first_name,
                last_name: payload.last_name,
                document_id: payload.document_id || null,
                phone: payload.phone || null,
                email: payload.email || null,
                role: payload.role || 'staff',
                location_id: payload.location_id || null,
                photo_url: payload.photo_url || null,
                shift_type: payload.shift_type || 'split',
                is_active: payload.is_active ?? true
            })
            .select()
            .single()

        if (error) throw error

        revalidatePath('/attendance')
        return { success: true, data }
    } catch (err: any) {
        console.error("Error creating staff:", err)
        return { success: false, error: err.message }
    }
}

/**
 * Actualiza los datos de un colaborador
 */
export async function updateStaff(id: string, payload: Partial<Staff>) {
    try {
        const currentOrgId = await getCurrentOrganizationId()
        if (!currentOrgId) return { success: false, error: 'Unauthorized' }

        const supabase = await createClient()

        // Sanitizamos el payload para no enviar campos de join (como 'location')
        const updateData = {
            first_name: payload.first_name,
            last_name: payload.last_name,
            document_id: payload.document_id,
            phone: payload.phone,
            email: payload.email,
            role: payload.role,
            location_id: payload.location_id,
            photo_url: payload.photo_url,
            shift_type: payload.shift_type,
            is_active: payload.is_active,
            updated_at: new Date().toISOString()
        }

        const { data, error } = await supabase
            .from('organization_staff')
            .update(updateData)
            .eq('id', id)
            .eq('organization_id', currentOrgId)
            .select()
            .single()

        if (error) throw error

        revalidatePath('/attendance')
        return { success: true, data }
    } catch (err: any) {
        console.error("Error updating staff:", err)
        return { success: false, error: err.message }
    }
}

/**
 * Elimina un colaborador
 */
export async function deleteStaff(id: string) {
    try {
        const currentOrgId = await getCurrentOrganizationId()
        if (!currentOrgId) return { success: false, error: 'Unauthorized' }

        const supabase = await createClient()

        const { error } = await supabase
            .from('organization_staff')
            .delete()
            .eq('id', id)
            .eq('organization_id', currentOrgId)

        if (error) throw error

        revalidatePath('/attendance')
        return { success: true }
    } catch (err: any) {
        console.error("Error deleting staff:", err)
        return { success: false, error: err.message }
    }
}

// ==========================================
// INTELLIGENT STATE MACHINE LOGIC
// ==========================================

export async function getDailyAttendanceState(staffToken: string) {
    try {
        const supabase = supabaseAdmin

        // 1. Conseguir el Staff, su configuración de turno y su sede para horarios
        const { data: staff, error: staffError } = await supabase
            .from('organization_staff')
            .select(`
                id, 
                shift_type,
                location:organization_locations(business_hours, timezone)
            `)
            .eq('access_token', staffToken)
            .single()

        if (staffError || !staff) {
            return { success: false, error: "Token inválido." }
        }

        // 2. Calcular las fronteras del día actual en hora local de Colombia (ej. Bogota)
        // Como el portal lo consume un cliente asume que el backend evalúa el hoy del servidor, 
        // usaremos postgres time interval para simplificar

        // Obtener todos los registros exitosos del staff de "HOY"
        const { data: logs, error: logsError } = await supabase
            .from('attendance_logs')
            .select('type, timestamp')
            .eq('staff_id', staff.id)
            .gte('timestamp', new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
            .lte('timestamp', new Date(new Date().setHours(23, 59, 59, 999)).toISOString())
            .order('timestamp', { ascending: true })

        if (logsError) throw logsError

        const validLogsCount = logs?.length || 0
        const shiftType = staff.shift_type || 'split'

        // 3. Evaluar horario de operación (Business Hours)
        let isOutofHours = false
        const locationInfo = staff.location as any

        if (locationInfo && !Array.isArray(locationInfo) && locationInfo.business_hours) {
            const todayIndex = new Date().getDay() // 0 = Sun, 1 = Mon...
            const daysMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
            const todayKey = daysMap[todayIndex]

            const hours = locationInfo.business_hours[todayKey]

            if (hours) {
                if (hours.is_closed) {
                    isOutofHours = true
                } else if (hours.open && hours.close) {
                    // Check local time against open/close
                    const tz = typeof locationInfo.timezone === 'string' ? locationInfo.timezone : 'America/Bogota'
                    const nowInTz = new Date().toLocaleTimeString('en-US', { timeZone: tz, hour12: false, hour: '2-digit', minute: '2-digit' })

                    // Solo bloqueamos si no ha iniciado el turno. 
                    // Si ya empezó a marcar, dejamos que termine (por flexbilidad de horas extra).
                    if (validLogsCount === 0) {
                        if (nowInTz < hours.open || nowInTz > hours.close) {
                            isOutofHours = true
                        }
                    }
                }
            }
        }

        let state = 0 // Estado inicial (Nuevo Día)

        // Si bloqueamos por fuera de horario ANTES de iniciar marcas:
        if (isOutofHours && validLogsCount === 0) {
            return {
                success: true,
                state: -1, // -1 means Blocked (Out of Hours)
                shiftType,
                marksCount: 0,
                lastActionTimestamp: null,
                logs: []
            }
        }

        if (shiftType === 'continuous') {
            // Modalidad Jornada Continua (2 Marcas: Entrada, Salida Final)
            if (validLogsCount === 0) state = 0 // Necesita [Entrada]
            else if (validLogsCount === 1) state = 1 // Necesita [Salida Final]
            else state = 2 // Jornada Finalizada
        } else {
            // Modalidad Jornada Dividida (4 Marcas: Entrada, Break, Regreso, Salida Final)
            if (validLogsCount === 0) state = 0      // Necesita [Entrada]
            else if (validLogsCount === 1) state = 1 // Necesita [Break]
            else if (validLogsCount === 2) state = 2 // Necesita [Regreso]
            else if (validLogsCount === 3) state = 3 // Necesita [Salida Final]
            else state = 4                           // Jornada Finalizada
        }

        return {
            success: true,
            state,
            shiftType,
            marksCount: validLogsCount,
            lastActionTimestamp: validLogsCount > 0 ? logs[validLogsCount - 1].timestamp : null,
            logs
        }
    } catch (err: any) {
        console.error("Error getting attendance state:", err)
        return { success: false, error: "Error interno determinando estado de turno." }
    }
}

