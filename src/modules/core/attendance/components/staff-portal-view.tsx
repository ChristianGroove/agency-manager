"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react'
import Webcam from 'react-webcam'
import { MapPin, Camera, Clock, CheckCircle2, AlertTriangle, LogIn, LogOut, Coffee, RefreshCw, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { toast } from 'sonner'
import { registerAttendanceMark, uploadAttendancePhoto } from '../actions'
import { processAttendancePhoto } from '../utils/photo-processor'
import { cn } from '@/lib/utils'

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
    const [actionType, setActionType] = useState<'check_in' | 'check_out' | 'break_start' | 'break_end'>('check_in')

    // GPS State
    const [gpsStatus, setGpsStatus] = useState<'pending' | 'locating' | 'success' | 'error'>('pending')
    const [coordinates, setCoordinates] = useState<{ lat: number, lng: number, accuracy: number } | null>(null)
    const [gpsErrorMsg, setGpsErrorMsg] = useState('')
    const [cameraError, setCameraError] = useState<string | null>(null)

    // Clock
    useEffect(() => {
        setIsClient(true)
        const timer = setInterval(() => setCurrentTime(new Date()), 1000)
        return () => clearInterval(timer)
    }, [])

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

            // 2. Registrar en Base de Datos vía Server Action Zero-Trust
            const res = await registerAttendanceMark({
                staffToken: token,
                type: actionType,
                photoUrl: uploadRes.url,
                deviceLat: coordinates.lat,
                deviceLng: coordinates.lng,
                accuracyMeters: coordinates.accuracy
            })

            if (res.success) {
                if (res.warning) {
                    toast.warning("Registro Interceptado", { description: res.warning, duration: 8000 })
                } else {
                    toast.success("Asistencia registrada exitosamente", { id: "attendance_action" })
                }
                setView('success')
                setTimeout(() => {
                    setView('camera')
                    setCapturedImage(null)
                }, 5000)
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
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 font-sans">

            {/* Header Info - Compacted */}
            <div className="w-full max-w-md text-center mb-4 space-y-1">
                {settings?.portal_logo_url ? (
                    <div className="mb-4 flex justify-center">
                        <img
                            src={settings.portal_logo_url}
                            alt="Logo"
                            className="h-16 w-auto max-w-[200px] object-contain"
                        />
                    </div>
                ) : (
                    <div className="w-12 h-12 rounded-lg mx-auto bg-white dark:bg-slate-900 shadow-sm flex items-center justify-center mb-2">
                        <div className="text-xl font-black text-slate-800 dark:text-white">P</div>
                    </div>
                )}

                <h1 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">Hola, {staff.first_name}</h1>
                <p className="text-xs font-medium text-slate-500">
                    Sede: <span className="text-slate-700 dark:text-slate-300 font-bold">{staff.organization_locations?.name || 'Central'}</span>
                </p>
            </div>

            <Card className="w-full max-w-md overflow-hidden bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xl rounded-2xl">

                {view === 'success' ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center animate-in zoom-in spin-in-2 duration-500">
                        <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-6">
                            <CheckCircle2 className="w-10 h-10" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">¡Marca Exitosa!</h2>
                        <p className="text-slate-500">Tu registro ha sido guardado oficialmente en el servidor.</p>
                    </div>
                ) : (
                    <>
                        {/* Selector de Acción */}
                        <div className="grid grid-cols-2 gap-2 p-4 border-b border-slate-100 dark:border-slate-800">
                            <Button
                                variant={actionType === 'check_in' ? 'default' : 'outline'}
                                className={cn("h-12 border-2", actionType === 'check_in' && "shadow-md")}
                                style={actionType === 'check_in' ? { backgroundColor: primaryColor, borderColor: primaryColor } : {}}
                                onClick={() => setActionType('check_in')}
                            >
                                <LogIn className="w-4 h-4 mr-2" /> Entrada
                            </Button>
                            <Button
                                variant={actionType === 'check_out' ? 'default' : 'outline'}
                                className={cn("h-12 border-2", actionType === 'check_out' && "shadow-md")}
                                style={actionType === 'check_out' ? { backgroundColor: '#ef4444', borderColor: '#ef4444' } : {}} // Siempre rojo salida
                                onClick={() => setActionType('check_out')}
                            >
                                Salida <LogOut className="w-4 h-4 ml-2" />
                            </Button>
                        </div>

                        {/* Status Bar (GPS) */}
                        <div className="px-4 py-3 text-xs font-semibold flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-1.5 flex-1 w-full truncate">
                                <MapPin className={cn(
                                    "w-3.5 h-3.5 shrink-0",
                                    gpsStatus === 'success' ? "text-emerald-500" :
                                        gpsStatus === 'locating' ? "text-amber-500 animate-pulse" : "text-red-500"
                                )} />
                                <span className={cn(
                                    "truncate",
                                    gpsStatus === 'success' ? "text-emerald-700 dark:text-emerald-400" :
                                        gpsStatus === 'locating' ? "text-amber-700 dark:text-amber-400" : "text-red-700 dark:text-red-400"
                                )}>
                                    {gpsStatus === 'success' ? `GPS Listo (${Math.round(coordinates!.accuracy)}m)` :
                                        gpsStatus === 'locating' ? "Calculando ubicación precisa..." : gpsErrorMsg}
                                </span>
                            </div>

                            {/* Live Badge */}
                            <Badge variant="outline" className="text-[10px] uppercase bg-red-50 text-red-600 border-red-200 dark:bg-red-950 dark:border-red-900/50 flex items-center gap-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> LIVE
                            </Badge>
                        </div>

                        {/* Viewport de Cámara */}
                        <div className="relative aspect-[3/4] w-full bg-black overflow-hidden group">
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
                                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center opacity-40">
                                    <div className="w-48 h-64 border-2 border-dashed border-white rounded-[50px]" />
                                    <p className="text-white text-xs mt-4 font-bold tracking-widest uppercase drop-shadow-md">Centra tu rostro</p>
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
                                        style={{ backgroundColor: primaryColor }}
                                    >
                                        {isLoading ? (
                                            <RefreshCw className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <>Confirmar {actionType === 'check_in' ? 'Entrada' : 'Salida'}</>
                                        )}
                                    </Button>
                                </div>
                            )}

                            {view === 'camera' && (
                                <div className="absolute bottom-6 left-0 w-full flex justify-center">
                                    {gpsStatus === 'success' ? (
                                        <button
                                            onClick={capture}
                                            className="w-20 h-20 rounded-full border-4 border-white/80 bg-white/30 backdrop-blur flex items-center justify-center group-hover:bg-white/50 transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(0,0,0,0.3)]"
                                        >
                                            <div className="w-14 h-14 rounded-full bg-white shadow-inner flex items-center justify-center text-slate-900">
                                                <Camera className="w-6 h-6" />
                                            </div>
                                        </button>
                                    ) : (
                                        <div className="bg-black/60 backdrop-blur-md text-white px-4 py-3 rounded-xl border border-white/10 text-sm flex items-center gap-2 max-w-[80%] text-center shadow-lg">
                                            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                                            Esperando señal GPS precisa para habilitar cámara...
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                    </>
                )}
            </Card>

            {/* Zero-Trust Time Display (Repositioned to Footer) */}
            <div className="mt-6 flex flex-col items-center gap-3">
                <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-900 rounded-2xl text-slate-700 dark:text-slate-300 font-mono text-xl font-bold shadow-lg border border-slate-100 dark:border-slate-800 animate-in fade-in slide-in-from-bottom-2">
                    <Clock className="w-5 h-5 text-slate-400" />
                    {currentTime.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </div>

                {/* Helper footer */}
                <p className="text-[10px] text-slate-400 text-center max-w-xs leading-relaxed uppercase tracking-widest font-medium">
                    Coordenadas GPS y servidor registrados por seguridad
                </p>
            </div>
        </div>
    )
}

