import { ShieldAlert, LogOut, Mail } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function SuspendedPage() {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full bg-white shadow-lg rounded-xl p-8 text-center border-t-4 border-red-600">
                <div className="flex justify-center mb-6">
                    <div className="p-4 bg-red-100 rounded-full">
                        <ShieldAlert className="h-12 w-12 text-red-600" />
                    </div>
                </div>

                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    Acceso Suspendido Temporalmente
                </h1>

                <p className="text-gray-600 mb-8">
                    La organización a la que intentas acceder tiene pagos pendientes o ha sido desactivada por el administrador.
                </p>

                <div className="space-y-4">
                    <Button asChild className="w-full bg-slate-900 hover:bg-slate-800" variant="default">
                        <a href="mailto:soporte@pixy.com.co">
                            <Mail className="mr-2 h-4 w-4" />
                            Contactar Soporte
                        </a>
                    </Button>

                    <form action="/api/auth/signout" method="post">
                        <Button variant="outline" className="w-full" type="submit">
                            <LogOut className="mr-2 h-4 w-4" />
                            Cerrar Sesión
                        </Button>
                    </form>
                </div>

                <div className="mt-8 pt-6 border-t border-gray-100 text-sm text-gray-400">
                    ID de Referencia: SUSP-ACCESS-DENIED
                </div>
            </div>
        </div>
    )
}
