"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { useCurrentOrganization } from "@/modules/core/organizations/hooks/use-current-organization"
import { Loader2, CheckCircle2, XCircle } from "lucide-react"
import { useTranslation } from "@/modules/core/i18n/use-translation"

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
    const { t } = useTranslation()
    const [status, setStatus] = useState<SignupStatus>('idle');
    const [errorMessage, setErrorMessage] = useState<string>('');
    const { organizationId: orgIdHook, loading: orgLoading } = useCurrentOrganization();
    const organizationId = orgIdProp || orgIdHook;
    const router = useRouter();

    // Load Facebook SDK
    useEffect(() => {
        console.log('[EmbeddedSignup] Initializing SDK logic...');

        // If SDK already exists, check if we need to re-init
        if (window.FB) {
            console.log('[EmbeddedSignup] SDK already exists in window');
            setStatus('ready');
            return;
        }

        setStatus('loading-sdk');

        // IMPORTANT: Define this BEFORE loading the script
        window.fbAsyncInit = function () {
            console.log('[EmbeddedSignup] fbAsyncInit triggered');
            window.FB.init({
                appId: META_APP_ID,
                cookie: true,
                xfbml: false,
                version: 'v24.0' // Per user request: keep v24.0
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
                console.error('[EmbeddedSignup] SDK script load error');
                setStatus('error');
                setErrorMessage(t('meta.embedded_signup.error_sdk'));
            };
            document.head.appendChild(script);
        }
    }, [t]);

    const handleEmbeddedSignup = useCallback(() => {
        console.log('[EmbeddedSignup] Clicked! Status:', status);

        if (!window.FB) {
            console.error('[EmbeddedSignup] FB SDK NOT FOUND IN WINDOW');
            toast.error(t('meta.embedded_signup.error_sdk'));
            return;
        }
        if (!organizationId) {
            console.error('[EmbeddedSignup] NO ORGANIZATION ID');
            toast.error(t('meta.embedded_signup.error_generic'));
            return;
        }

        setStatus('authenticating');
        console.log('[EmbeddedSignup] Opening Login Popup with Config:', EMBEDDED_SIGNUP_CONFIG_ID);

        window.FB.login(
            function (response: any) {
                console.log('[EmbeddedSignup] Login response received:', response);
                if (response.authResponse) {
                    const code = response.authResponse.code;
                    if (!code) {
                        setStatus('error');
                        setErrorMessage(t('meta.embedded_signup.error_auth'));
                        onError?.('No authorization code received');
                        return;
                    }
                    processSignupCode(code);
                } else {
                    console.log('[EmbeddedSignup] User cancelled or login failed');
                    setStatus('idle');
                }
            },
            {
                config_id: EMBEDDED_SIGNUP_CONFIG_ID,
                response_type: 'code',
                override_default_response_type: true,
                scope: 'whatsapp_business_management,whatsapp_business_messaging,business_management',
                extras: {
                    setup: {},
                    featureType: 'whatsapp_business_app_onboarding',
                    sessionInfoVersion: '3',
                }
            }
        );
    }, [organizationId, t, onError, status]);

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
                throw new Error(data.error || t('meta.embedded_signup.error_generic'));
            }

            setStatus('success');
            toast.success(t('meta.embedded_signup.success'), {
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
            toast.error(t('meta.embedded_signup.error_generic'), {
                description: error.message,
            });
            onError?.(error.message);
        }
    };

    const isLoading = orgLoading || status === 'loading-sdk';
    const isProcessing = status === 'authenticating' || status === 'processing';

    return (
        <div className="space-y-4 pt-2">
            {/* Status feedback - Minimalist */}
            {status === 'processing' && (
                <div className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400 animate-pulse">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{t('meta.embedded_signup.setup')}</span>
                </div>
            )}

            {status === 'success' && (
                <div className="flex items-center gap-3 text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/10 px-3 py-2 rounded-lg border border-green-100 dark:border-green-900/20">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{t('meta.embedded_signup.connected')}</span>
                </div>
            )}

            {status === 'error' && (
                <div className="flex items-center gap-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10 px-3 py-2 rounded-lg border border-red-100 dark:border-red-900/20">
                    <XCircle className="h-4 w-4 shrink-0" />
                    <span>{errorMessage}</span>
                </div>
            )}

            {/* Main action button - Premium Style */}
            <button
                onClick={handleEmbeddedSignup}
                disabled={isLoading || isProcessing || status === 'success'}
                className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl font-medium text-sm transition-all duration-200
                    bg-[#1877F2] hover:bg-[#166FE5] text-white shadow-sm hover:shadow-md
                    disabled:opacity-50 disabled:cursor-not-allowed
                    focus:outline-none focus:ring-2 focus:ring-[#1877F2]/50 focus:ring-offset-1 dark:focus:ring-offset-zinc-900"
            >
                {isProcessing ? (
                    <Loader2 className="h-4.5 w-4.5 animate-spin" />
                ) : (
                    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
                        <path d="M23.9981 11.9991C23.9981 5.37216 18.626 0 11.9991 0C5.37216 0 0 5.37216 0 11.9991C0 17.9882 4.38789 22.9522 10.1242 23.8524V15.4676H7.07758V11.9991H10.1242V9.35553C10.1242 6.34826 11.9156 4.68714 14.6564 4.68714C15.9692 4.68714 17.3436 4.92149 17.3436 4.92149V7.87439H15.8294C14.3388 7.87439 13.8739 8.79933 13.8739 9.74824V11.9991H17.2018L16.6698 15.4676H13.8739V23.8524C19.6103 22.9522 23.9981 17.9882 23.9981 11.9991Z" />
                    </svg>
                )}
                {isProcessing ? t('meta.embedded_signup.processing') : t('meta.embedded_signup.button')}
            </button>
        </div>
    );
}
