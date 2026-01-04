"use client"

export function OperationsCalendar() {
    // TEMPORARILY DISABLED DUE TO TYPE MISMATCHES WITH WorkOrder INTERFACE
    return (
        <div className="flex flex-col h-[600px] p-12 text-center border-2 border-dashed rounded-lg border-gray-200 bg-gray-50/50">
            <div className="bg-white p-4 rounded-full shadow-sm mb-4 inline-block mx-auto">
                <svg className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Calendario temporalmente deshabilitado</h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
                Este componente requiere refactorización de tipos WorkOrder para manejar campos opcionales correctamente.
            </p>
        </div>
    )
}
