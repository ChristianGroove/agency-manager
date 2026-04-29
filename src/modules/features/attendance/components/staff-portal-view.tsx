"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react'
import Webcam from 'react-webcam'
import { MapPin, Camera, Clock, CheckCircle2, AlertTriangle, LogIn, LogOut, Coffee, RefreshCw, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { toast } from 'sonner'
import { registerAttendanceMark, uploadAttendancePhoto, getDailyAttendanceState } from '../actions'
import { processAttendancePhoto } from '../utils/photo-processor'
import { cn, calculateDistanceInMeters } from '@/modules/infrastructure/utils/utils'

interface AttendanceStaffPortalProps {
    staff: any
    settings: any
    token: string
}

export function AttendanceStaffPortal({ staff, settings, token }: AttendanceStaffPortalProps) {
    const webcamRef = useRef<Webcam>(null)
    const [isClient, setIsClient] = useState(false)
    const [currentTime, setCurrentTime] = useState(new Date())

    // UI States
    const [isLoading, setIsLoading] = useState(false)
    const [capturedImage, setCapturedImage] = useState<string | null>(null)
    const [view, setView] = useState<'camera' | 'preview' | 'success'>('camera')

    // Shift State Machine
    const [shiftData, setShiftData] = useState<{
        state: number,
        shiftType: 'continuous' | 'split',
        lastActionTimestamp?: string,
        breakDurationMinutes?: number,
        nextBlockStartTime?: string,
        expectedBreakReturnTime?: string,
        isCustomSchedule?: boolean,
        timezone?: string,
        geofence_lat?: number,
        geofence_lng?: number,
        geofence_radius?: number
    } | null>(null)
    const [isLoadingState, setIsLoadingState] = useState(true)
    const [isBreakScreenActive, setIsBreakScreenActive] = useState(false)
    const [breakTimeRemainingMs, setBreakTimeRemainingMs] = useState<number | null>(null)
    const [cooldownRemainingMs, setCooldownRemainingMs] = useState<number | null>(null)
    const [canReturnFromBreak, setCanReturnFromBreak] = useState(false)

    // GPS State
    const [gpsStatus, setGpsStatus] = useState<'pending' | 'locating' | 'success' | 'error'>('pending')
    const [coordinates, setCoordinates] = useState<{ lat: number, lng: number, accuracy: number } | null>(null)
    const [gpsErrorMsg, setGpsErrorMsg] = useState('')
    const [cameraError, setCameraError] = useState<string | null>(null)
    const [distanceToLocation, setDistanceToLocation] = useState<number | null>(null)

    // Calculate distance to location in real-time
    useEffect(() => {
        if (coordinates && shiftData?.geofence_lat && shiftData?.geofence_lng) {
            const dist = calculateDistanceInMeters(
                coordinates.lat,
                coordinates.lng,
                shiftData.geofence_lat,
                shiftData.geofence_lng
            )
            setDistanceToLocation(dist)
        } else {
            setDistanceToLocation(null)
        }
    }, [coordinates, shiftData])

    // Initialization (Clock & State)
    useEffect(() => {
        setIsClient(true)
        const loadState = async () => {
            const res = await getDailyAttendanceState(token)
            if (res.success && res.state !== undefined && res.shiftType) {
                setShiftData({
                    state: res.state,
                    shiftType: res.shiftType as 'continuous' | 'split',
                    lastActionTimestamp: res.lastActionTimestamp,
                    breakDurationMinutes: res.breakDurationMinutes,
                    nextBlockStartTime: res.nextBlockStartTime,
                    expectedBreakReturnTime: res.expectedBreakReturnTime,
                    isCustomSchedule: res.isCustomSchedule,
                    timezone: res.timezone,
                    geofence_lat: res.geofence_lat,
                    geofence_lng: res.geofence_lng,
                    geofence_radius: res.geofence_radius
                })
                // Activar la pantalla de Break "Zen Mode" inmediatamente si está en estado 2 al cargar
                if (res.state === 2) {
                    setIsBreakScreenActive(true)
                }
            }
            setIsLoadingState(false)
        }
        loadState()

        const timer = setInterval(() => setCurrentTime(new Date()), 1000)
        return () => clearInterval(timer)
    }, [token])

    // Cooldown & Break Timer Calculation
    useEffect(() => {
        if (!shiftData?.lastActionTimestamp) return

        const checkTimers = () => {
            const startMs = new Date(shiftData.lastActionTimestamp!).getTime()
            const nowMs = new Date().getTime()
            
            // 1. Cooldown de 15 minutos (Aplica a CUALQUIER marcación)
            const fifteenMinMs = 15 * 60000
            const cooldownDiff = (startMs + fifteenMinMs) - nowMs
            
            if (cooldownDiff <= 0) {
                setCooldownRemainingMs(null)
                if (view === 'success') {
                    setView('camera')
                    setCapturedImage(null)
                }
            } else {
                setCooldownRemainingMs(cooldownDiff)
            }

            // 2. Temporizador de Break (Regreso)
            if (shiftData.state === 2) {
                let targetMs = 0
                if (shiftData.isCustomSchedule && shiftData.expectedBreakReturnTime && shiftData.timezone) {
                    const [h, m] = shiftData.expectedBreakReturnTime.split(':').map(Number)
                    const d = new Date()
                    d.setHours(h, m - 5, 0, 0)
                    targetMs = d.getTime()
                } else if (shiftData.isCustomSchedule) {
                    const breakDuration = shiftData.breakDurationMinutes || 120
                    targetMs = startMs + ((breakDuration - 5) * 60000)
                } else {
                    targetMs = startMs + fifteenMinMs // MODO FLEXIBLE
                }

                const breakDiff = targetMs - nowMs
                if (breakDiff <= 0) {
                    setCanReturnFromBreak(true)
                    setBreakTimeRemainingMs(0)
                } else {
                    setCanReturnFromBreak(false)
                    setBreakTimeRemainingMs(breakDiff)
                }
            }
        }

        checkTimers()
        const interval = setInterval(checkTimers, 1000)
        return () => clearInterval(interval)
    }, [shiftData, view])

    // Fetch GPS continuously while in camera mode
    useEffect(() => {
        let watchId: number

        if (view === 'camera') {
            setGpsStatus('locating')
            if ('geolocation' in navigator) {
                watchId = navigator.geolocation.watchPosition(
                    (position) => {
                        setCoordinates({
                            lat: position.coords.latitude,
                            lng: position.coords.longitude,
                            accuracy: position.coords.accuracy
                        })
                        // Si la precisión es decente, marcamos success
                        if (position.coords.accuracy < 150) {
                            setGpsStatus('success')
                        } else {
                            setGpsStatus('error')
                            setGpsErrorMsg(`Precisión muy baja (${Math.round(position.coords.accuracy)}m). Ve al aire libre.`)
                        }
                    },
                    (error) => {
                        setGpsStatus('error')
                        switch (error.code) {
                            case error.PERMISSION_DENIED:
                                setGpsErrorMsg("Debes permitir el acceso a tu ubicación GPS.")
                                break
                            case error.POSITION_UNAVAILABLE:
                                setGpsErrorMsg("Información de ubicación no disponible.")
                                break
                            case error.TIMEOUT:
                                setGpsErrorMsg("Tiempo de espera agotado obteniendo GPS.")
                                break
                            default:
                                setGpsErrorMsg("Error desconocido de GPS.")
                                break
                        }
                    },
                    {
                        enableHighAccuracy: true,
                        timeout: 10000,
                        maximumAge: 0
                    }
                )
            } else {
                setGpsStatus('error')
                setGpsErrorMsg("Tu navegador no soporta Geolocation.")
            }
        }

        return () => {
            if (watchId) navigator.geolocation.clearWatch(watchId)
        }
    }, [view])


    const capture = useCallback(() => {
        if (!webcamRef.current) return
        const imageSrc = webcamRef.current.getScreenshot()
        if (imageSrc) {
            setCapturedImage(imageSrc)
            setView('preview')
        }
    }, [webcamRef])

    const retake = () => {
        setCapturedImage(null)
        setView('camera')
    }

    const nextAction = React.useMemo(() => {
        if (!shiftData) return 'check_in'
        if (shiftData.shiftType === 'continuous') {
            return shiftData.state === 0 ? 'check_in' : 'check_out'
        } else {
            return shiftData.state === 0 ? 'check_in' :
                shiftData.state === 1 ? 'break_start' :
                    shiftData.state === 2 ? 'break_end' : 'check_out'
        }
    }, [shiftData])

    const getActionLabel = (action: string) => {
        switch (action) {
            case 'check_in': return 'Entrada'
            case 'break_start': return 'Inicio Break'
            case 'break_end': return 'Regreso'
            case 'check_out': return 'Salida'
            default: return 'Marca'
        }
    }

    const isShiftComplete = shiftData ? (shiftData.shiftType === 'continuous' ? shiftData.state >= 2 : shiftData.state >= 4) : false

    const allowedMaxDistance = shiftData?.geofence_radius ? shiftData.geofence_radius + Math.max(shiftData.geofence_radius * 0.15, 15) : 300 // default or fallback
    const isOutOfGeofence = distanceToLocation !== null && distanceToLocation > allowedMaxDistance

    const handleSubmit = async () => {
        if (!capturedImage) return

        // Anti-Spoofing en cliente (la fuerte está en el server, pero UI ayuda)
        if (!coordinates || gpsStatus !== 'success') {
            toast.error("GPS de alta precisión requerido", { description: "Por favor, espera a que el GPS te localice con precisión." })
            return
        }

        setIsLoading(true)
        toast.loading("Procesando registro...", { id: "attendance_action" })

        try {
            // 1. Procesar y Optimizar Foto (WebP + Burn-in Metadata)
            toast.loading("Optimizando evidencia...", { id: "attendance_action" })

            const processedImage = await processAttendancePhoto(capturedImage, {
                staffName: `${staff.first_name} ${staff.last_name}`,
                timestamp: new Date().toLocaleString('es-CO'),
                latitude: coordinates.lat,
                longitude: coordinates.lng,
                accuracy: coordinates.accuracy
            })

            // 2. Subir Foto Probatoria Optimizada
            toast.loading("Subiendo evidencia...", { id: "attendance_action" })
            const uploadRes = await uploadAttendancePhoto(processedImage, staff.id)
            if (!uploadRes.success || !uploadRes.url) {
                throw new Error(uploadRes.error || "Error al subir la evidencia fotográfica.")
            }

            // 3. Registrar en Base de Datos vía Server Action Zero-Trust
            const res = await registerAttendanceMark({
                staffToken: token,
                type: nextAction as any,
                photoUrl: uploadRes.url,
                deviceLat: coordinates.lat,
                deviceLng: coordinates.lng,
                accuracyMeters: coordinates.accuracy
            })

            if (res.success) {
                if (res.warning) {
                    toast.warning("Registro Interceptado", {
                        description: res.warning,
                        duration: 8000,
                        id: "attendance_action"
                    })
                } else {
                    toast.success("Asistencia registrada exitosamente", { id: "attendance_action" })
                }
                
                setView('success')

                // Actualizar estado localmente para no tener que recargar
                if (shiftData) {
                    const newState = shiftData.state + 1
                    setShiftData({ 
                        ...shiftData, 
                        state: newState, 
                        lastActionTimestamp: new Date().toISOString() 
                    })
                    // Si el nuevo estado es 2 (Reacien comenzó el break), activar la pantalla
                    if (newState === 2) {
                        setIsBreakScreenActive(true)
                    }
                }
            } else {
                toast.error("Error", { description: res.error, id: "attendance_action" })
            }
        } catch (error: any) {
            toast.error("Fallo la operación", { description: error.message, id: "attendance_action" })
        } finally {
            setIsLoading(false)
        }
    }


    if (!isClient) return null

    // Theme injection (White-Label)
    const primaryColor = settings?.portal_primary_color || '#10b981' // emerald-500 default

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center p-0 px-5 font-sans">

        {/* 1. Header Area - Precise Spacing */}
        <div className="w-full max-w-md flex flex-col items-center px-4 pt-[24px] mb-4">
            {settings?.portal_logo_url ? (
                <img
                    src={settings.portal_logo_url}
                    alt="Logo"
                    className="h-9 w-auto object-contain"
                />
            ) : (
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 shadow-sm flex items-center justify-center">
                    <div className="text-xl font-black text-slate-800 dark:text-white">P</div>
                </div>
            )}
            
            <div className="text-center mt-[32px]">
                <h1 className="text-base font-bold text-slate-900 dark:text-white leading-tight">Hola, {staff.first_name} {staff.last_name}</h1>
                <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mt-1">
                    Sede: <span className="text-slate-700 dark:text-slate-300 font-bold">{staff.organization_locations?.name || 'Administración'}</span>
                </p>
            </div>
        </div>

        <Card className="w-full max-w-md overflow-hidden bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xl rounded-3xl relative">

                {isLoadingState ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center animate-pulse">
                        <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-6">
                            <Clock className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-400 dark:text-slate-500 mb-2">Sincronizando...</h2>
                    </div>
                ) : shiftData?.state === -1 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center animate-in zoom-in spin-in-2 duration-500">
                        <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center mb-6">
                            <Clock className="w-10 h-10" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Portal Inactivo</h2>
                        <p className="text-slate-500 text-sm">
                            {shiftData?.nextBlockStartTime ? `Podrás realizar tu marcación a partir de las ${shiftData.nextBlockStartTime}.` : "No hay marcaciones programadas en este momento."}
                        </p>
                    </div>
                ) : isShiftComplete ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center animate-in zoom-in spin-in-2 duration-500">
                        <div className="w-20 h-20 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-6">
                            <CheckCircle2 className="w-10 h-10" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Marcaciones Completadas</h2>
                        <p className="text-slate-500 text-sm">Has completado todas las marcaciones por hoy.</p>
                    </div>
                ) : view === 'success' ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center animate-in zoom-in spin-in-2 duration-500">
                        <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-6">
                            <CheckCircle2 className="w-10 h-10" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                           {shiftData?.state === 1 ? '¡Marcación exitosa!' : 
                            shiftData?.state === 2 && shiftData?.shiftType === 'split' ? 'Marcación de pausa exitosa' :
                            shiftData?.state === 3 ? 'Marcación de retorno exitosa' : 'Marcación final exitosa'}
                        </h2>
                        <p className="text-slate-500">Tu registro ha sido guardado oficialmente en el servidor.</p>
                        
                        <div className="w-full mt-6 flex justify-center">
                            <div className="w-12 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 animate-[loading_15s_linear_infinite]" style={{ width: '100%' }} />
                            </div>
                        </div>
                        
                        {!cooldownRemainingMs && (
                             <Button 
                                onClick={() => { setView('camera'); setCapturedImage(null); }}
                                className="w-full mt-4"
                             >
                                Volver al Portal
                             </Button>
                        )}
                    </div>
                ) : shiftData?.state === 2 && isBreakScreenActive ? (
                    <div className="flex flex-col items-center justify-center p-8 text-center animate-in zoom-in spin-in-2 duration-500 min-h-[400px]">
                        <div className="w-24 h-24 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center mb-6 shadow-sm border border-orange-100">
                            <Coffee className="w-12 h-12" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Modo Descanso</h2>
                        <p className="text-slate-500 text-sm mb-6 max-w-[250px]">
                            Disfruta tu tiempo libre. La cámara y los registros han sido pausados temporalmente.
                        </p>
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 w-full mb-8">
                            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Hora de Salida</p>
                            <p className="text-lg font-mono font-bold text-slate-700 dark:text-slate-300">
                                {shiftData.lastActionTimestamp ? new Date(shiftData.lastActionTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                            </p>
                        </div>
                        <Button
                            onClick={() => setIsBreakScreenActive(false)}
                            disabled={!canReturnFromBreak}
                            className={cn(
                                "w-full h-12 shadow-md uppercase tracking-widest text-xs font-bold transition-all",
                                canReturnFromBreak
                                    ? "bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-700/50"
                                    : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700"
                            )}
                        >
                            {!canReturnFromBreak && breakTimeRemainingMs !== null ? (
                                <span className="flex items-center">
                                    <Clock className="w-4 h-4 mr-2 animate-pulse" />
                                    Restan {Math.ceil(breakTimeRemainingMs / 60000)} min
                                </span>
                            ) : (
                                <span className="flex items-center animate-in fade-in zoom-in duration-300">
                                    <Camera className="w-4 h-4 mr-2" />
                                    Reanudar
                                </span>
                            )}
                        </Button>
                    </div>
                ) : (
                    <>
                        {/* Combined Action & Status Bar - Ultra Compact */}
                        <div className="px-3 py-2 text-xs font-bold flex items-center justify-between bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                            <div className={cn(
                                "flex items-center gap-2",
                                nextAction === 'check_out' ? "text-red-600" : "text-slate-700 dark:text-slate-300"
                            )}>
                                {nextAction === 'check_in' || nextAction === 'break_end' ? <LogIn className="w-3.5 h-3.5" /> :
                                    nextAction === 'break_start' ? <Coffee className="w-3.5 h-3.5" /> : <LogOut className="w-3.5 h-3.5" />}
                                <span className="uppercase tracking-tight">{getActionLabel(nextAction)}</span>
                                <span className="text-[9px] opacity-50 font-normal">({shiftData ? shiftData.state + 1 : 1}/{shiftData?.shiftType === 'continuous' ? 2 : 4})</span>
                            </div>

                            <div className="flex items-center gap-1.5 max-w-[50%] overflow-hidden">
                                <MapPin className={cn(
                                    "w-3 h-3 shrink-0",
                                    gpsStatus === 'success' && (!distanceToLocation || !shiftData?.geofence_radius || distanceToLocation <= (shiftData.geofence_radius + Math.max(shiftData.geofence_radius * 0.15, 15)))
                                        ? "text-emerald-500" :
                                        gpsStatus === 'locating' ? "text-amber-500 animate-pulse" : "text-red-500"
                                )} />
                                <span className={cn(
                                    "truncate text-[10px]",
                                    gpsStatus === 'success' && (!distanceToLocation || !shiftData?.geofence_radius || distanceToLocation <= (shiftData.geofence_radius + Math.max(shiftData.geofence_radius * 0.15, 15)))
                                        ? "text-emerald-700 dark:text-emerald-400" :
                                        gpsStatus === 'locating' ? "text-amber-700 dark:text-amber-400" : "text-red-700 dark:text-red-400"
                                )}>
                                    {gpsStatus === 'locating' ? "Buscando..." :
                                        gpsStatus === 'error' ? "Error GPS" :
                                            distanceToLocation && shiftData?.geofence_radius && distanceToLocation > (shiftData.geofence_radius + Math.max(shiftData.geofence_radius * 0.15, 15))
                                                ? `Fuera (${distanceToLocation}m)`
                                                : `GPS OK (${Math.round(coordinates?.accuracy || 0)}m)`}
                                </span>
                            </div>
                        </div>

                        {/* Viewport de Cámara */}
                        <div className="relative aspect-[3/4] w-full bg-slate-950 overflow-hidden group">

                            {view === 'camera' ? (
                                <Webcam
                                    audio={false}
                                    ref={webcamRef}
                                    screenshotFormat="image/jpeg"
                                    videoConstraints={{ facingMode: "user" }} // Cámara frontal recomendada
                                    className="w-full h-full object-cover"
                                    mirrored={true}
                                    onUserMediaError={(err) => {
                                        console.error("Camera error:", err)
                                        setCameraError("No se pudo acceder a la cámara. Por favor, verifica los permisos en tu navegador.")
                                    }}
                                />
                            ) : (
                                capturedImage && (
                                    <img src={capturedImage} alt="Preview" className="w-full h-full object-cover" />
                                )
                            )}

                            {/* Camera Error Overlay */}
                            {cameraError && (
                                <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center p-6 text-center z-10">
                                    <XCircle className="w-12 h-12 text-red-500 mb-4" />
                                    <h3 className="text-white font-bold mb-2">Error de Cámara</h3>
                                    <p className="text-slate-300 text-sm mb-4">{cameraError}</p>
                                    <Button
                                        variant="secondary"
                                        onClick={() => window.location.reload()}
                                        className="rounded-full px-6 shadow-md"
                                    >
                                        <RefreshCw className="w-4 h-4 mr-2 text-slate-900" />
                                        <span className="text-slate-900">Reintentar</span>
                                    </Button>
                                </div>
                            )}

                            {/* Overlay de Guía Facial */}
                            {view === 'camera' && (
                                <div className="absolute inset-0 pointer-events-none flex flex-col items-center pt-12 opacity-30">
                                    <p className="text-white text-[10px] mb-8 font-bold tracking-[0.2em] uppercase drop-shadow-md opacity-40">Centra tu rostro</p>
                                    <div className="w-48 h-64 border-2 border-dashed border-white/40 rounded-[50px] mt-4" />
                                </div>
                            )}

                            {/* Acciones flotantes */}
                            {view === 'preview' && (
                                <div className="absolute bottom-4 left-0 w-full flex justify-center gap-4 px-4">
                                    <Button
                                        variant="secondary"
                                        size="lg"
                                        onClick={retake}
                                        disabled={isLoading}
                                        className="rounded-full shadow-lg bg-white/90 text-slate-900 border border-slate-200 backdrop-blur"
                                    >
                                        <RefreshCw className="w-4 h-4 mr-2" /> Repetir
                                    </Button>
                                    <Button
                                        size="lg"
                                        onClick={handleSubmit}
                                        disabled={isLoading || gpsStatus !== 'success'}
                                        className="rounded-full shadow-lg px-8 text-white min-w-[140px]"
                                        style={nextAction === 'check_out' ? { backgroundColor: '#ef4444' } : { backgroundColor: primaryColor }}
                                    >
                                        {isLoading ? (
                                            <RefreshCw className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <>Confirmar {getActionLabel(nextAction)}</>
                                        )}
                                    </Button>
                                </div>
                            )}

                            {view === 'camera' && (
                                <div className="absolute bottom-6 left-0 w-full flex justify-center">
                                    {gpsStatus === 'success' && !isOutOfGeofence ? (
                                        <button
                                            onClick={capture}
                                            className="w-20 h-20 rounded-full border-4 border-white/80 bg-white/30 backdrop-blur flex items-center justify-center group-hover:bg-white/50 transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(0,0,0,0.3)]"
                                        >
                                            <div className="w-14 h-14 rounded-full bg-white shadow-inner flex items-center justify-center text-slate-900">
                                                <Camera className="w-6 h-6" />
                                            </div>
                                        </button>
                                    ) : (
                                        <div className="bg-black/60 backdrop-blur-md text-white px-4 py-3 rounded-xl border border-white/10 text-sm flex flex-col items-center gap-1 max-w-[80%] text-center shadow-lg">
                                            <div className="flex items-center gap-2">
                                                <AlertTriangle className={cn("w-4 h-4 shrink-0", isOutOfGeofence ? "text-red-400" : "text-amber-400")} />
                                                <span>
                                                    {gpsStatus !== 'success' ? "Esperando señal GPS precisa..." :
                                                        isOutOfGeofence ? "Fuera de zona permitida" : "Validando..."}
                                                </span>
                                            </div>
                                            {isOutOfGeofence && (
                                                <span className="text-[10px] opacity-70">Debes estar a menos de {Math.round(allowedMaxDistance)}m de la sede.</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                    </>
                )
                }
            </Card>

            {/* Helper footer & Final Clock */}
            <div className="mt-4 flex flex-col items-center gap-2 group">
                <p className="text-[9px] text-slate-400 text-center max-w-xs leading-relaxed uppercase tracking-tighter font-bold opacity-40">
                    Seguridad Biométrica y Geolocalización Protegida
                </p>
                
                <div className="flex items-center gap-2 px-4 py-2 bg-white/50 dark:bg-slate-900/50 rounded-xl text-slate-600 dark:text-slate-400 font-mono text-lg font-bold border border-slate-100 dark:border-slate-800 shadow-sm">
                    <Clock className="w-4 h-4 opacity-50" />
                    {currentTime.getHours().toString().padStart(2, '0')}:{currentTime.getMinutes().toString().padStart(2, '0')}
                    <span className="text-[10px] uppercase opacity-40">{currentTime.getHours() >= 12 ? 'pm' : 'am'}</span>
                </div>
            </div>
        </div>
    )
}

