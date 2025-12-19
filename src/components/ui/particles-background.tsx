"use client"

import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

interface Particle {
    x: number
    y: number
    vx: number
    vy: number
    size: number
    color: string
    baseX: number
    baseY: number
    density: number
}

export const ParticlesBackground = ({
    children,
    className,
}: {
    children: React.ReactNode
    className?: string
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const mouseRef = useRef({ x: 0, y: 0 })

    useEffect(() => {
        const canvas = canvasRef.current
        const container = containerRef.current
        if (!canvas || !container) return

        const ctx = canvas.getContext("2d")
        if (!ctx) return

        let particles: Particle[] = []
        let animationFrameId: number

        const resizeCanvas = () => {
            canvas.width = container.clientWidth
            canvas.height = container.clientHeight
            initParticles()
        }

        const initParticles = () => {
            particles = []
            const particleCount = 100 // Increased from 20 to 100

            for (let i = 0; i < particleCount; i++) {
                const size = Math.random() * 2 + 1 // Reduced size by half
                const x = Math.random() * canvas.width
                const y = Math.random() * canvas.height
                const directionX = (Math.random() - 0.5) * 0.5
                const directionY = (Math.random() - 0.5) * 0.5
                const color = Math.random() > 0.5 ? "rgba(242, 5, 226, 0.6)" : "rgba(0, 224, 255, 0.6)" // Increased opacity

                particles.push({
                    x,
                    y,
                    vx: directionX,
                    vy: directionY,
                    size,
                    color,
                    baseX: x,
                    baseY: y,
                    density: (Math.random() * 30) + 1
                })
            }
        }

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height)

            particles.forEach(particle => {
                // Mouse interaction
                const dx = mouseRef.current.x - particle.x
                const dy = mouseRef.current.y - particle.y
                const distance = Math.sqrt(dx * dx + dy * dy)
                const forceDirectionX = dx / distance
                const forceDirectionY = dy / distance
                const maxDistance = 300 // Interaction radius
                const force = (maxDistance - distance) / maxDistance

                if (distance < maxDistance) {
                    // Attraction to mouse
                    particle.vx += forceDirectionX * force * 0.05
                    particle.vy += forceDirectionY * force * 0.05
                }

                // Movement
                particle.x += particle.vx
                particle.y += particle.vy

                // Friction (to stop them from accelerating forever)
                particle.vx *= 0.99
                particle.vy *= 0.99

                // Base floating movement (if not influenced strongly by mouse)
                if (distance >= maxDistance) {
                    if (particle.vx < 0.2 && particle.vx > -0.2) particle.vx += (Math.random() - 0.5) * 0.02
                    if (particle.vy < 0.2 && particle.vy > -0.2) particle.vy += (Math.random() - 0.5) * 0.02
                }

                // Screen wrapping
                if (particle.x < 0) particle.x = canvas.width
                if (particle.x > canvas.width) particle.x = 0
                if (particle.y < 0) particle.y = canvas.height
                if (particle.y > canvas.height) particle.y = 0

                // Draw
                ctx.beginPath()
                ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
                ctx.fillStyle = particle.color
                ctx.fill()
            })

            animationFrameId = requestAnimationFrame(animate)
        }

        const handleMouseMove = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect()
            mouseRef.current = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            }
        }

        window.addEventListener("resize", resizeCanvas)
        window.addEventListener("mousemove", handleMouseMove)

        resizeCanvas()
        animate()

        return () => {
            window.removeEventListener("resize", resizeCanvas)
            window.removeEventListener("mousemove", handleMouseMove)
            cancelAnimationFrame(animationFrameId)
        }
    }, [])

    return (
        <div ref={containerRef} className={cn("relative min-h-screen w-full overflow-hidden bg-black flex flex-col items-center justify-center", className)}>
            {/* Dynamic Gradient Background */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_#1a1a1a_0%,_#000000_100%)]" />
                <div className="absolute top-0 left-0 w-full h-full opacity-40">
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-brand-pink/20 blur-[100px] animate-pulse" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-brand-cyan/20 blur-[100px] animate-pulse delay-1000" />
                </div>
            </div>

            {/* Canvas for Particles */}
            <canvas
                ref={canvasRef}
                className="absolute inset-0 z-0 blur-[1px]"
            />

            {/* Content */}
            <div className="relative z-10 w-full flex flex-col items-center justify-center pointer-events-none">
                <div className="pointer-events-auto">
                    {children}
                </div>
            </div>
        </div>
    )
}
