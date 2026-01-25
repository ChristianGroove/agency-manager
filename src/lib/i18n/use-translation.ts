"use client"

import { useI18n } from "./context"
import { Dictionary } from "./dictionaries"

// Helper type to access nested properties
type PathImpl<T, K extends keyof T> =
    K extends string
    ? T[K] extends Record<string, any>
    ? T[K] extends ArrayLike<any>
    ? K | `${K}.${PathImpl<T[K], Exclude<keyof T[K], keyof any[]>>}`
    : K | `${K}.${PathImpl<T[K], keyof T[K]>}`
    : K
    : never

type Path<T> = PathImpl<T, keyof T> | keyof T

// Get value from nested object using dot notation
function getNestedValue<T>(obj: T, path: string): any {
    return path.split('.').reduce((prev: any, curr) => {
        return prev ? prev[curr] : null
    }, obj)
}

export function useTranslation() {
    const { dict, locale } = useI18n()

    function t(path: Path<Dictionary>): any {
        const value = getNestedValue(dict, path as string)
        if (value === undefined || value === null) {
            console.warn(`[i18n] Missing translation for key: ${path}`)
            return path as string
        }
        return value
    }

    return { t, locale }
}
