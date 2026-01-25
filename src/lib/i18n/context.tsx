"use client"

import React, { createContext, useContext } from "react"
import { Dictionary, dictionaries, Locale } from "./dictionaries"

// Definir el tipo del contexto
interface I18nContextType {
    dict: Dictionary
    locale: Locale
}

// Crear el contexto con un valor por defecto seguro
const I18nContext = createContext<I18nContextType>({
    dict: dictionaries.es,
    locale: "es",
})

interface I18nProviderProps {
    children: React.ReactNode
    dict: Dictionary
    locale: Locale
}

export function I18nProvider({ children, dict, locale }: I18nProviderProps) {
    return (
        <I18nContext.Provider value={{ dict, locale }}>
            {children}
        </I18nContext.Provider>
    )
}

export function useI18n() {
    const context = useContext(I18nContext)
    if (!context) {
        throw new Error("useI18n must be used within an I18nProvider")
    }
    return context
}
