"use client"

export function JobsList({ viewMode = 'list' }: { viewMode?: 'list' | 'grid' }) {
    // TEMPORARILY DISABLED DUE TO TYPE MISMATCHES WITH WorkOrder INTERFACE
    return (
        <div className="p-12 text-center border-2 border-dashed rounded-xl border-gray-200 bg-gray-50/50">
            <div className="bg-white p-4 rounded-full shadow-sm mb-4 inline-block">
                <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Vista de trabajos temporalmente deshabilitada</h3>
            <p className="text-sm text-gray-500 max-w-sm mt-1 mx-auto">
                Este componente requiere refactorización de tipos WorkOrder. Será restaurado pronto.
            </p>
        </div>
    )
}
