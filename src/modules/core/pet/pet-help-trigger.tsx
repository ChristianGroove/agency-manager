'use client'

import { useState } from 'react'
import { usePet } from './pet-provider'
import { PetVisual } from './pet-visual'
import { usePetMedia } from './use-pet-motion'

export function PetHelpTrigger({ onOpenHelp }: { onOpenHelp: () => void }) {
    const pet = usePet()
    const mobile = usePetMedia('(max-width: 767px)')
    const [engaged, setEngaged] = useState(false)
    if (!pet?.enabled) return null
    const settings = pet.config.settings
    const size = mobile ? settings.mobileSize : settings.desktopSize
    const animate = settings.animation === 'continuous' || (!settings.interactive && engaged) || pet.state !== 'idle'

    return <button
        type="button" aria-label="Abrir ayuda"
        onClick={onOpenHelp} onMouseEnter={() => setEngaged(true)} onMouseLeave={() => setEngaged(false)}
        onFocus={() => setEngaged(true)} onBlur={() => setEngaged(false)}
        className="fixed right-6 z-40 rounded-2xl bg-transparent p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        style={{ bottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
    >
        <PetVisual settings={settings} palette={pet.palette} state={pet.state} size={size}
            animate={animate} onFailure={pet.reportRendererFailure} />
    </button>
}
