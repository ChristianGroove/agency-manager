import { z } from 'zod'
import { DEFAULT_PET_SETTINGS as defaults, PET_SHAPES, normalizePetColor, type PetSettings } from './config'

const color = z.string().trim().regex(/^#(?:[\da-f]{3}|[\da-f]{6})$/i).transform(value => normalizePetColor(value, defaults.color))
const size = z.union([z.literal(48), z.literal(56), z.literal(64), z.literal(80)])

export const petSettingsSchema = z.object({
    version: z.literal(1).default(1),
    enabled: z.boolean().default(false),
    audience: z.enum(['pixy', 'all']).default('pixy'),
    pixyOrganizationId: z.uuid().nullable().default(null),
    shape: z.enum(PET_SHAPES).default(defaults.shape),
    color: color.default(defaults.color),
    trimColor: color.default(defaults.trimColor),
    screenColor: color.default(defaults.screenColor),
    desktopSize: size.default(defaults.desktopSize),
    mobileSize: size.default(defaults.mobileSize),
    animation: z.enum(['off', 'contextual', 'continuous']).default(defaults.animation),
    speed: z.number().min(0.25).max(2).default(defaults.speed),
    interactive: z.boolean().default(false),
    antenna: z.boolean().default(true),
    floorShadow: z.boolean().default(true),
    alertReactions: z.boolean().default(false),
    hibernateEnabled: z.boolean().default(true),
    hibernateAfterMinutes: z.number().int().min(1).max(30).default(5),
}).strict().refine(settings => !settings.enabled || !!settings.pixyOrganizationId, {
    message: 'Selecciona la organización Pixy antes de activar la mascota.', path: ['pixyOrganizationId'],
})

export function readPetSettings(value: unknown): PetSettings {
    const result = petSettingsSchema.safeParse(value)
    return result.success ? result.data : { ...defaults }
}
