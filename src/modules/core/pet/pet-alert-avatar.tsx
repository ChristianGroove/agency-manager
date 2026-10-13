'use client'

import { usePet } from './pet-provider'
import { PetVisual } from './pet-visual'
import type { PetState } from './config'

export function PetAlertAvatar({ state = 'idle', size = 28 }: { state?: PetState; size?: number }) {
    const pet = usePet()
    if (!pet?.enabled || !pet.config.settings.alertReactions) return null
    return <PetVisual settings={pet.config.settings} palette={pet.palette} state={state} size={size}
        onFailure={pet.reportRendererFailure} />
}
