"use server"

import { headers } from "next/headers"
import { createClient } from "@/modules/core/database/supabase-server"
import { supabaseAdmin } from "@/modules/core/database/supabase-admin"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { getCurrentOrganizationId } from "@/modules/core/organizations/organization-actions"
import { trackStorageUpload, validateStorageLimit } from "@/modules/infrastructure/storage/storage-actions"
import { requireOrgRole } from "@/modules/core/iam/services/org-roles"
import { calculateDistanceInMeters } from "@/modules/infrastructure/utils/utils"

// Helper global para restar 5 minutos a un formato HH:mm
const subtractGraceMins = (timeStr: string) => {
    if (!timeStr) return "00:00"
    const [h, m] = timeStr.split(':').map(Number)
    const d = new Date()
    d.setHours(h, m - 5, 0, 0)
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
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
    work_schedule?: any
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
            .select('id, organization_id, location_id, is_active, expected_hours_per_day, organization_locations(latitude, longitude, geofence_radius_meters, is_active)')
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

        // D. Verificación Estricta (Zero-Trust Server Time)
        if (validated.type === 'check_in' || validated.type === 'break_end') {
            const currentState = await getDailyAttendanceState(validated.staffToken)

            // 1. Validar Gracia de Entrada (Check-In)
            if (currentState.success && currentState.state === -1) {
                return { success: false, error: currentState.nextBlockStartTime ? `Tu turno inicia a las ${currentState.nextBlockStartTime}.` : `Estás fuera de horario.` }
            }

            // 2. Validar Gracia de Break (Regreso)
            if (validated.type === 'break_end') {
                if (currentState.success && currentState.state === 2 && currentState.lastActionTimestamp) {
                    if (currentState.expectedBreakReturnTime && currentState.timezone) {
                        const graceReturn = subtractGraceMins(currentState.expectedBreakReturnTime)
                        const nowInTz = new Date().toLocaleTimeString('en-US', { timeZone: currentState.timezone as string, hour12: false, hour: '2-digit', minute: '2-digit' })

                        if (nowInTz < graceReturn) {
                            return { success: false, error: `Aún estás en horario de descanso. Debes regresar a partir de las ${graceReturn}.` }
                        }
                    } else {
                        // Fallback a hora configurada global
                        const breakDurationMinutes = currentState.breakDurationMinutes || 120
                        const breakStartTime = new Date(currentState.lastActionTimestamp).getTime()
                        const now = new Date().getTime()
                        const minimumReturnTime = breakStartTime + ((breakDurationMinutes - 5) * 60000)

                        if (now < minimumReturnTime) {
                            return { success: false, error: "Aún te encuentras en tu horario de descanso obligatorio. No puedes regresar antes." }
                        }
                    }
                } else if (currentState.success && currentState.state !== 2) {
                    return { success: false, error: "No puedes registrar un regreso de descanso en este momento." }
                }
            }
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

        // 3. MASTER SHIFT CONTROLLER (Payroll Engine Hub)
        // Whenever a log is created successfully, we trigger a stateless recalculation of exactly the whole day
        // This ensures zero-technical-debt and mathematical perfection regardless of device crashes.
        await processDailyShift(staff.id, staff.organization_id, staff.location_id, staff.expected_hours_per_day || 8.0)

        // Todo ha ido bien (incluso si is_valid false, guardamos el log para registro/castigo)
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
                break_duration_minutes,
                work_schedule,
                location:organization_locations(business_hours, timezone, latitude, longitude, geofence_radius_meters)
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

        // 3. Evaluar horario de operación personalizado (Individual > Location fallback)
        let isOutofHours = false
        let nextBlockStartTime = null
        let expectedBreakReturnTime = null

        const locationInfo = staff.location as any
        const tz = typeof locationInfo?.timezone === 'string' ? locationInfo.timezone : 'America/Bogota'
        const schedule = staff.work_schedule || locationInfo?.business_hours

        if (schedule) {
            const todayIndex = new Date().getDay() // 0 = Sun, 1 = Mon...
            const daysMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
            const todayKey = daysMap[todayIndex]

            const hours = schedule[todayKey]

            if (hours) {
                // If the day is explicitly marked as inactive or closed
                if (hours.is_active === false || hours.is_closed === true) {
                    isOutofHours = true
                } else {
                    const nowInTz = new Date().toLocaleTimeString('en-US', { timeZone: tz, hour12: false, hour: '2-digit', minute: '2-digit' })

                    // Soportar el nuevo JSON (block_X_start) o el viejo (open/close)
                    const openTime = hours.block_1_start || hours.open
                    const closeTime = hours.block_2_end || hours.block_1_end || hours.close
                    const block2Start = hours.block_2_start

                    // Gracia de Entrada
                    if (validLogsCount === 0 && openTime) {
                        const graceOpen = subtractGraceMins(openTime)
                        if (nowInTz < graceOpen || nowInTz > closeTime) {
                            isOutofHours = true
                            nextBlockStartTime = openTime
                        }
                    }

                    // Gracia de Regreso de Break (Señalar meta estricta a la UI)
                    if (validLogsCount === 2 && shiftType === 'split' && block2Start) {
                        expectedBreakReturnTime = block2Start
                    }
                }
            } else {
                // Si el día no existe en el JSON
                isOutofHours = true
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
                nextBlockStartTime,
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
            breakDurationMinutes: staff.break_duration_minutes || 120, // DB Config fallback
            expectedBreakReturnTime, // Formato "HH:mm" si usa block_2
            timezone: tz,
            geofence_lat: locationInfo?.latitude,
            geofence_lng: locationInfo?.longitude,
            geofence_radius: locationInfo?.geofence_radius_meters,
            logs
        }
    } catch (err: any) {
        console.error("Error getting attendance state:", err)
        return { success: false, error: "Error interno determinando estado de turno." }
    }
}

// ==========================================
// PAYROLL ENGINE LOGIC ($$$)
// ==========================================

/**
 * Motor Matemático de Nómina
 * Lee todos los logs del día de un Colaborador y sobre-escribe su Turno Maestro (Shifts).
 * Separa automáticamente Horas Ordinarias de Horas Extras basadas en su contrato.
 */
async function processDailyShift(staffId: string, orgId: string, locationId: string | null, expectedHours: number) {
    try {
        const supabase = supabaseAdmin

        // 1. Obtener los logs de validación de HOY de la Sede/Persona
        // (En producción global debería usar el timezone de la sede en vez de UTC)
        const todayStart = new Date(new Date().setHours(0, 0, 0, 0)).toISOString()
        const todayEnd = new Date(new Date().setHours(23, 59, 59, 999)).toISOString()
        const localDateString = new Date().toLocaleDateString('sv-SE') // yyyy-mm-dd ISO sin T

        const { data: logs, error: logsError } = await supabase
            .from('attendance_logs')
            .select('*')
            .eq('staff_id', staffId)
            .gte('timestamp', todayStart)
            .lte('timestamp', todayEnd)
            .order('timestamp', { ascending: true })

        if (logsError || !logs || logs.length === 0) return

        let firstIn: string | null = null
        let lastOut: string | null = null
        let totalBreakMs = 0
        let totalWorkedMs = 0

        const checkIn = logs.find(l => l.type === 'check_in')
        const breakStart = logs.find(l => l.type === 'break_start')
        const breakEnd = logs.find(l => l.type === 'break_end')
        const checkOut = logs.find(l => l.type === 'check_out')

        if (checkIn) firstIn = checkIn.timestamp
        if (checkOut) lastOut = checkOut.timestamp

        // Calcular minutos de break si existen las 2 marcas
        if (breakStart && breakEnd) {
            totalBreakMs = new Date(breakEnd.timestamp).getTime() - new Date(breakStart.timestamp).getTime()
        }

        // Si tenemos In y Out, calculamos el total restando el break
        if (firstIn && lastOut) {
            const grossWorkedMs = new Date(lastOut).getTime() - new Date(firstIn).getTime()
            totalWorkedMs = Math.max(0, grossWorkedMs - totalBreakMs)
        }

        const totalBreakMinutes = Math.floor(totalBreakMs / 60000)
        let totalWorkedMinutes = Math.floor(totalWorkedMs / 60000)

        // Separar entre Ordinarias y Extras
        const expectedMinutes = expectedHours * 60
        let ordinaryMinutes = totalWorkedMinutes
        let extraMinutesPending = 0

        if (totalWorkedMinutes > expectedMinutes) {
            ordinaryMinutes = expectedMinutes
            extraMinutesPending = totalWorkedMinutes - expectedMinutes
        }

        let shiftStatus = checkOut ? 'completed' : 'open'

        // 2. Guardar el consolidado
        // Usamos ON CONFLICT(staff_id, date) DO UPDATE (El UNIQUE de nuestra BD)
        const { error: upsertError } = await supabase
            .from('attendance_shifts')
            .upsert({
                organization_id: orgId,
                staff_id: staffId,
                location_id: locationId,
                date: localDateString, // Clave única junto a staff_id
                first_in: firstIn,
                last_out: lastOut,
                total_break_minutes: totalBreakMinutes,
                total_worked_minutes: totalWorkedMinutes,
                ordinary_minutes: ordinaryMinutes,
                extra_minutes_pending: extraMinutesPending,
                status: shiftStatus,
                updated_at: new Date().toISOString()
            }, { onConflict: 'staff_id, date' })

        if (upsertError) {
            console.error("Error upserting shift:", upsertError)
        }

    } catch (err) {
        console.error("Shift processing crash:", err)
    }
}

/**
 * Obtener todos los turnos calculados de una organización para Nómina.
 */
export async function getAttendanceShifts(organizationId: string) {
    try {
        const supabase = await createClient()

        // Para nómina, necesitamos ver todo el historial de turnos o al menos los más recientes
        const { data, error } = await supabase
            .from('attendance_shifts')
            .select(`
                *,
                staff:organization_staff(first_name, last_name, document_id, role)
            `)
            .eq('organization_id', organizationId)
            .order('date', { ascending: false })
            .limit(1000)

        if (error) throw error

        return { success: true, data }
    } catch (err: any) {
        console.error("Error fetching attendance shifts:", err)
        return { success: false, error: err.message, data: [] }
    }
}



