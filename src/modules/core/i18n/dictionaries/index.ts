import { en } from "./en"
import { es } from "./es"

// 1. Recursive Helper Type for making all properties 'string'
type RecurringString<T> = {
    [P in keyof T]: T[P] extends object ? RecurringString<T[P]> : string
}

// 2. Define the Base Dictionary Structure from 'es' but with string values
export type Dictionary = RecurringString<typeof es>

// 3. Cast dictionaries to this loose type to satisfy TypeScript
export const dictionaries: Record<string, Dictionary> = {
    es: es as unknown as Dictionary,
    en: en as unknown as Dictionary,
}

export type Locale = keyof typeof dictionaries

export const getDictionary = (locale: Locale): Dictionary => {
    return dictionaries[locale] || dictionaries.es
}
