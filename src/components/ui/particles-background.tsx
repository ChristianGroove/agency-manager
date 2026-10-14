"use client"

import { useEffect, useRef, useState } from "react"
import { useTheme } from "next-themes"
import { cn } from "@/modules/infrastructure/utils/utils"

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
    theme: propTheme,
}: {
    children?: React.ReactNode
    className?: string
    theme?: "dark" | "light"
}) => {
    const { resolvedTheme } = useTheme()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    const theme = propTheme ?? (mounted && resolvedTheme === "light" ? "light" : "dark")
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
            const particleCount = 100

            for (let i = 0; i < particleCount; i++) {
                const size = Math.random() * 2 + 1
                const x = Math.random() * canvas.width
                const y = Math.random() * canvas.height
                const directionX = (Math.random() - 0.5) * 0.5
                const directionY = (Math.random() - 0.5) * 0.5

                // Theme-based colors
                let color;
                if (theme === "light") {
                    color = Math.random() > 0.5 ? "rgba(242, 5, 226, 0.5)" : "rgba(0, 224, 255, 0.5)" // Subtle vibrant accents for soft gray
                } else {
                    color = Math.random() > 0.5 ? "rgba(242, 5, 226, 0.6)" : "rgba(0, 224, 255, 0.6)"
                }

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
                const maxDistance = 300
                const force = (maxDistance - distance) / maxDistance

                if (distance < maxDistance) {
                    particle.vx += forceDirectionX * force * 0.05
                    particle.vy += forceDirectionY * force * 0.05
                }

                // Movement
                particle.x += particle.vx
                particle.y += particle.vy

                // Friction
                particle.vx *= 0.99
                particle.vy *= 0.99

                // Base floating movement
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
    }, [theme])

    return (
        <div ref={containerRef} className={cn(
            "relative min-h-screen w-full overflow-hidden flex flex-col items-center justify-center bg-[#edf0f4] dark:bg-black transition-colors duration-300",
            className
        )}>
            {/* Dynamic Gradient Background */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_#edf0f4_0%,_#e2e6eb_100%)] dark:bg-[radial-gradient(circle_at_50%_50%,_#1a1a1a_0%,_#000000_100%)] transition-opacity duration-300" />

                <div className="absolute top-0 left-0 w-full h-full opacity-50 dark:opacity-40">
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full blur-[100px] animate-pulse bg-brand-pink/15 dark:bg-brand-pink/20" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full blur-[100px] animate-pulse delay-1000 bg-brand-cyan/15 dark:bg-brand-cyan/20" />
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
