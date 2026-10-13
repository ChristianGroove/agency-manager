'use client'

import { Component, type ReactNode } from 'react'
import dynamic from 'next/dynamic'
import { Bot } from 'lucide-react'
import type { RobotHeadViewProps } from './robot-head-view'

const LazyRobot = dynamic(() => import('./robot-head-view').then(module => module.RobotHeadView), {
    ssr: false,
    loading: () => <Bot aria-hidden className="h-full w-full p-2" />,
})

class VisualBoundary extends Component<{ children: ReactNode; onFailure?: () => void }, { failed: boolean }> {
    state = { failed: false }
    static getDerivedStateFromError() { return { failed: true } }
    componentDidCatch() { this.props.onFailure?.() }
    render() { return this.state.failed ? <Bot aria-hidden className="h-full w-full p-2" /> : this.props.children }
}

export function PetVisual(props: RobotHeadViewProps) {
    return <span aria-hidden="true" className="inline-block shrink-0" style={{ width: props.size, height: props.size }}>
        <VisualBoundary onFailure={props.onFailure}><LazyRobot key={`${props.state}:${props.animate}:${props.settings.animation}`} {...props} /></VisualBoundary>
    </span>
}
