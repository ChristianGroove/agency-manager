"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { useCurrentOrganization } from "@/modules/core/organizations/hooks/use-current-organization"
import { Loader2, CheckCircle2, XCircle } from "lucide-react"

/**
 * Global FB SDK type declarations
 */
declare global {
    interface Window {
        FB: any;
        fbAsyncInit: () => void;
    }
}

const META_APP_ID = process.env.NEXT_PUBLIC_META_APP_ID || '25468410932828305';
const EMBEDDED_SIGNUP_CONFIG_ID = process.env.NEXT_PUBLIC_META_EMBEDDED_SIGNUP_CONFIG_ID || '2080917496052099';

interface MetaEmbeddedSignupProps {
    onSuccess?: () => void;
    onError?: (error: string) => void;
    organizationId?: string | null;
}

type SignupStatus = 'idle' | 'loading-sdk' | 'ready' | 'authenticating' | 'processing' | 'success' | 'error';

export function MetaEmbeddedSignup({ onSuccess, onError, organizationId: orgIdProp }: MetaEmbeddedSignupProps) {
    const [status, setStatus] = useState<SignupStatus>('idle');
    const [errorMessage, setErrorMessage] = useState<string>('');
    const { organizationId: orgIdHook, loading: orgLoading } = useCurrentOrganization();
    const organizationId = orgIdProp || orgIdHook;
    const router = useRouter();

    // Load Facebook SDK
    useEffect(() => {
        if (window.FB) {
            setStatus('ready');
            return;
        }

        setStatus('loading-sdk');

        window.fbAsyncInit = function () {
            window.FB.init({
                appId: META_APP_ID,
                cookie: true,
                xfbml: false,
                version: 'v21.0'
            });
            setStatus('ready');
        };

        // Load SDK script
        if (!document.getElementById('facebook-jssdk')) {
            const script = document.createElement('script');
            script.id = 'facebook-jssdk';
            script.src = 'https://connect.facebook.net/en_US/sdk.js';
            script.async = true;
            script.defer = true;
            script.onerror = () => {
                setStatus('error');
                setErrorMessage('No se pudo cargar el SDK de Facebook.');
            };
            document.head.appendChild(script);
        }
    }, []);

    const handleEmbeddedSignup = useCallback(() => {
        if (!window.FB) {
            toast.error('Facebook SDK no está cargado. Intenta de nuevo.');
            return;
        }
        if (!organizationId) {
            toast.error('No se encontró la organización. Recarga la página.');
            return;
        }

        setStatus('authenticating');

        window.FB.login(
            function (response: any) {
                if (response.authResponse) {
                    const code = response.authResponse.code;
                    if (!code) {
                        setStatus('error');
                        setErrorMessage('No se recibió el código de autorización de Meta.');
                        onError?.('No authorization code received');
                        return;
                    }
                    processSignupCode(code);
                } else {
                    setStatus('idle');
                }
            },
            {
                config_id: EMBEDDED_SIGNUP_CONFIG_ID,
                response_type: 'code',
                override_default_response_type: true,
                extras: {
                    setup: {},
                    featureType: 'whatsapp_business_app_onboarding',
                    sessionInfoVersion: '3',
                }
            }
        );
    }, [organizationId]);

    const processSignupCode = async (code: string) => {
        setStatus('processing');

        try {
            const response = await fetch('/api/integrations/meta/embedded-signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orgId: organizationId,
                    code,
                }),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Error en el registro');
            }

            setStatus('success');
            toast.success('¡WhatsApp conectado exitosamente!', {
                description: `WABA: ${data.wabaId}`,
            });

            // Refresh the page to show new channel
            setTimeout(() => {
                router.refresh();
                onSuccess?.();
            }, 1500);

        } catch (error: any) {
            console.error('[EmbeddedSignup] Processing error:', error);
            setStatus('error');
            setErrorMessage(error.message || 'Error desconocido');
            toast.error('Error al conectar WhatsApp', {
                description: error.message,
            });
            onError?.(error.message);
        }
    };

    const isLoading = orgLoading || status === 'loading-sdk';
    const isProcessing = status === 'authenticating' || status === 'processing';

    return (
        <div className="space-y-4">
            {/* Status feedback */}
            {status === 'processing' && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                    <span className="text-sm text-blue-700 dark:text-blue-300">
                        Configurando tu cuenta de WhatsApp Business...
                    </span>
                </div>
            )}

            {status === 'success' && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-green-700 dark:text-green-300">
                        ¡WhatsApp conectado! Redirigiendo...
                    </span>
                </div>
            )}

            {status === 'error' && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span className="text-sm text-red-700 dark:text-red-300">
                        {errorMessage}
                    </span>
                </div>
            )}

            {/* Main action button */}
            <button
                onClick={handleEmbeddedSignup}
                disabled={isLoading || isProcessing || status === 'success'}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl font-medium transition-all duration-200
                    bg-[#1877F2] hover:bg-[#166FE5] text-white shadow-md hover:shadow-lg
                    disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-md
                    focus:outline-none focus:ring-2 focus:ring-[#1877F2]/50 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
            >
                {isProcessing ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                )}
                {isProcessing ? 'Procesando...' : 'Continuar con Meta'}
            </button>
        </div>
    );
}
