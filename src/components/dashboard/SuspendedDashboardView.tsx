"use client"

import { CreditCard, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSaaSData } from "@/components/providers/saas-provider"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import { LottieAnimation } from "@/components/ui/lottie-animation"
import animationData from "../../../public/animations/animated-office-workspace-desk-with-computer-and-b-2025-10-20-06-00-41-utc.json"

export function SuspendedDashboardView() {
    const { subscription } = useSaaSData()

    const expirationDate = subscription?.current_period_end
        ? format(parseISO(subscription.current_period_end), "PPP", { locale: es })
        : "N/A"

    return (
        <div className="flex-1 w-full min-h-[70vh] flex items-center justify-center p-4 animate-in fade-in duration-500">
            <div className="max-w-xl w-full bg-white p-8 md:p-10 rounded-[2.5rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08)] border border-slate-100 flex flex-col items-center text-center animate-in zoom-in duration-700">

                <div className="w-56 h-56 mb-6 drop-shadow-xl">
                    <LottieAnimation animationData={animationData} />
                </div>

                <h2 className="text-3xl font-black text-slate-900 mb-3 tracking-tighter">
                    Acceso Suspendido
                </h2>

                <p className="text-slate-500 max-w-sm mb-5 leading-relaxed font-medium text-base">
                    Tu suscripción ha expirado. Por favor, regulariza tu estado de cuenta para continuar disfrutando de la plataforma.
                </p>

                <div className="flex items-center gap-3 text-red-600 font-bold text-[13px] mb-8 bg-red-50 px-6 py-2.5 rounded-xl border border-red-100 shadow-sm">
                    <Calendar className="h-4 w-4" />
                    El acceso expiró el: {expirationDate}
                </div>

                <div className="w-full max-w-xs">
                    <Button
                        variant="default"
                        size="lg"
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white h-14 rounded-xl shadow-[0_15px_30px_rgba(0,0,0,0.15)] hover:scale-[1.02] active:scale-95 transition-all text-base font-extrabold uppercase tracking-wider"
                        onClick={() => {
                            const badgeBtn = document.querySelector('.premium-badge-container') as HTMLElement
                            if (badgeBtn) badgeBtn.click()
                        }}
                    >
                        <CreditCard className="mr-3 h-5 w-5" />
                        Renovar ahora
                    </Button>
                </div>

                <div className="mt-12 text-[9px] text-slate-300 font-black uppercase tracking-[0.4em] opacity-50">
                    SaaS Security Layer • Active Protection
                </div>
            </div>
        </div>
    )
}
