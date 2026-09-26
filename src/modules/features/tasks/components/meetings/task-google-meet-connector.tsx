"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Video, Calendar, Unlink, Loader2, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import {
  getCurrentUserGoogleConnection,
  disconnectCurrentUserGoogle,
} from "@/modules/features/integrations/google/google-calendar-service"
import { cn } from "@/modules/infrastructure/utils/utils"

interface TaskGoogleMeetConnectorProps {
  autoGenerateMeet: boolean
  onAutoGenerateMeetChange: (enabled: boolean) => void
  className?: string
}

function GoogleIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.66-5.17 3.66-9.12z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.13C3.26 21.44 7.33 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.57H1.24C.45 8.14 0 9.99 0 12s.45 3.86 1.24 5.43l4.04-3.14z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.56 1.24 6.57l4.04 3.14c.95-2.83 3.6-4.96 6.72-4.96z"
      />
    </svg>
  )
}

export function TaskGoogleMeetConnector({
  autoGenerateMeet,
  onAutoGenerateMeetChange,
  className,
}: TaskGoogleMeetConnectorProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [accountEmail, setAccountEmail] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)

  // Consultar estado de conexión al montar
  useEffect(() => {
    let isMounted = true

    async function checkStatus() {
      try {
        const res = await getCurrentUserGoogleConnection()
        if (isMounted) {
          setIsConnected(res.isConnected)
          setAccountEmail(res.accountEmail || null)
          if (res.isConnected) {
            onAutoGenerateMeetChange(true)
          }
        }
      } catch (err) {
        console.error("Error comprobando estado de Google Meet:", err)
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    checkStatus()

    return () => {
      isMounted = false
    }
  }, [onAutoGenerateMeetChange])

  // Iniciar flujo OAuth en popup
  const handleConnect = useCallback(() => {
    setIsConnecting(true)

    const width = 540
    const height = 660
    const left = window.screenX + (window.outerWidth - width) / 2
    const top = window.screenY + (window.outerHeight - height) / 2

    const popup = window.open(
      "/api/integrations/google/authorize",
      "google_oauth_popup",
      `width=${width},height=${height},left=${left},top=${top},status=no,toolbar=no,menubar=no`
    )

    if (!popup || popup.closed || typeof popup.closed === "undefined") {
      setIsConnecting(false)
      toast.error("El navegador bloqueó la ventana emergente", {
        description: "Por favor permite las ventanas emergentes en Pixy para vincular tu cuenta de Google.",
      })
      return
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return

      if (event.data?.type === "GOOGLE_OAUTH_SUCCESS") {
        setIsConnected(true)
        setAccountEmail(event.data.email || "Cuenta de Google")
        setIsConnecting(false)
        onAutoGenerateMeetChange(true)
        toast.success("Cuenta de Google vinculada con éxito", {
          description: `Las reuniones virtuales generarán su enlace en ${event.data.email}`,
        })
        window.removeEventListener("message", handleMessage)
      } else if (event.data?.type === "GOOGLE_OAUTH_ERROR") {
        setIsConnecting(false)
        toast.error("No se pudo vincular la cuenta", {
          description: event.data.message || "La autorización fue cancelada o falló.",
        })
        window.removeEventListener("message", handleMessage)
      }
    }

    window.addEventListener("message", handleMessage)

    // Vigilante por si el usuario cierra el popup manualmente
    const checkClosedInterval = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosedInterval)
        window.removeEventListener("message", handleMessage)
        setIsConnecting(false)
      }
    }, 800)
  }, [onAutoGenerateMeetChange])

  // Desconectar cuenta
  const handleDisconnect = async () => {
    try {
      setIsDisconnecting(true)
      const res = await disconnectCurrentUserGoogle()
      if (res.success) {
        setIsConnected(false)
        setAccountEmail(null)
        onAutoGenerateMeetChange(false)
        toast.info("Cuenta de Google desvinculada", {
          description: "Puedes ingresar enlaces de videollamada manualmente.",
        })
      } else {
        toast.error(res.error || "No se pudo desconectar la cuenta")
      }
    } catch (err) {
      console.error("Error al desconectar Google:", err)
      toast.error("Error al desconectar la cuenta de Google")
    } finally {
      setIsDisconnecting(false)
    }
  }

  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-2 py-2 px-3 rounded-xl bg-muted/30 border border-border/50", className)}>
        <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
        <span className="text-[11px] text-muted-foreground">Comprobando vinculación de Google...</span>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "rounded-xl border transition-all p-3 space-y-2.5",
        isConnected
          ? "border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10"
          : "border-border/70 bg-card/60 hover:bg-card",
        className
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <GoogleIcon className="w-4 h-4 shrink-0" />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-semibold text-foreground">
                Google Meet & Calendar
              </span>
              {isConnected ? (
                <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[9px] px-1.5 py-0 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-2.5 h-2.5" /> Conectado
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-muted-foreground border-border/60">
                  No conectado
                </Badge>
              )}
            </div>
            {isConnected && accountEmail && (
              <p className="text-[10px] text-muted-foreground truncate max-w-[240px]">
                {accountEmail}
              </p>
            )}
          </div>
        </div>

        {/* Acciones */}
        <div>
          {isConnected ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground font-medium hidden sm:inline">
                  Autogenerar
                </span>
                <Switch
                  checked={autoGenerateMeet}
                  onCheckedChange={onAutoGenerateMeetChange}
                  className="scale-75 origin-right cursor-pointer"
                  aria-label="Generar enlace automáticamente con Google Meet"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                className="w-7 h-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                title="Desconectar cuenta de Google"
              >
                {isDisconnecting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Unlink className="w-3.5 h-3.5" />
                )}
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleConnect}
              disabled={isConnecting}
              className="h-7 text-xs font-semibold rounded-lg bg-background hover:bg-muted border-border/80 shadow-2xs gap-1.5 cursor-pointer"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Conectando...</span>
                </>
              ) : (
                <>
                  <GoogleIcon className="w-3.5 h-3.5" />
                  <span>Vincular cuenta</span>
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Nota explicativa contextual */}
      {isConnected && autoGenerateMeet && (
        <div className="flex items-center gap-1.5 pt-1 border-t border-emerald-500/20 text-[10px] text-emerald-700 dark:text-emerald-300 font-medium">
          <Calendar className="w-3 h-3 shrink-0" />
          <span>El enlace de Meet se creará automáticamente y enviará invitación de Google Calendar a los convocados.</span>
        </div>
      )}
    </div>
  )
}
