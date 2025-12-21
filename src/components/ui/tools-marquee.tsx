import { useRef } from "react"
import {
    motion,
    useSpring,
    useTransform,
    useMotionValue,
    useAnimationFrame,
    useVelocity // Keeping for potential future drag, or remove if truly unused. Wait, we removed drag logic.
    // Actually simpler:
} from "framer-motion"

// Custom wrap utility
const wrap = (min: number, max: number, v: number) => {
    const rangeSize = max - min
    return ((((v - min) % rangeSize) + rangeSize) % rangeSize) + min
}

interface ToolIcon {
    name: string
    color: string
    path: string
    viewBox?: string
    url: string
}

const TOOLS: ToolIcon[] = [
    {
        name: "ChatGPT",
        color: "#10A37F",
        viewBox: "0 0 24 24",
        path: "M12.0002 0.899902C5.50019 0.899902 0.899902 6.00019 0.899902 12.0002C0.899902 18.0002 5.50019 23.1002 12.0002 23.1002C18.5002 23.1002 23.1002 18.0002 23.1002 12.0002C23.1002 6.00019 18.5002 0.899902 12.0002 0.899902ZM12.0002 3.2999C15.5002 3.2999 18.5002 5.2999 19.9002 8.2999H4.1002C5.50019 5.2999 8.50019 3.2999 12.0002 3.2999ZM2.6002 9.7999H21.4002C21.7002 10.5 21.9002 11.2002 21.9002 12.0002C21.9002 12.7999 21.7002 13.5 21.4002 14.1999H2.6002C2.3002 13.5 2.1002 12.7999 2.1002 12.0002C2.1002 11.2002 2.3002 10.5 2.6002 9.7999ZM4.1002 15.6999H19.9002C18.5002 18.6999 15.5002 20.6999 12.0002 20.6999C8.50019 20.6999 5.50019 18.6999 4.1002 15.6999Z",
        url: "https://chat.openai.com"
    },
    {
        name: "Gemini",
        color: "#8E75B2",
        viewBox: "0 0 24 24",
        path: "M12,2L15,8L21,11L15,14L12,20L9,14L3,11L9,8L12,2Z",
        url: "https://gemini.google.com"
    },
    {
        name: "Figma",
        color: "#F24E1E",
        viewBox: "0 0 24 24",
        path: "M8.5,2C6.57,2,5,3.57,5,5.5S6.57,9,8.5,9H12V2H8.5z M12,9h3.5c1.93,0,3.5-1.57,3.5-3.5S17.43,2,15.5,2H12V9z M5,12.5c0,1.93,1.57,3.5,3.5,3.5H12v-7H8.5C6.57,9,5,10.57,5,12.5z M5,19.5c0,1.93,1.57,3.5,3.5,3.5c1.93,0,3.5-1.57,3.5-3.5V16H8.5C6.57,16,5,17.57,5,19.5z M12,12.5c0,1.93,1.57,3.5,3.5,3.5c1.93,0,3.5-1.57,3.5-3.5S17.43,9,15.5,9H12V12.5z",
        url: "https://figma.com"
    },
    {
        name: "Canva",
        color: "#00C4CC",
        viewBox: "0 0 24 24",
        path: "M12,2A10,10,0,1,0,22,12,10,10,0,0,0,12,2Zm5,12H7V10h10Z",
        url: "https://canva.com"
    },
    {
        name: "Facebook",
        color: "#1877F2",
        viewBox: "0 0 24 24",
        path: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z",
        url: "https://facebook.com"
    },
    {
        name: "Instagram",
        color: "#E4405F",
        viewBox: "0 0 24 24",
        path: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z",
        url: "https://instagram.com"
    },
    {
        name: "WhatsApp",
        color: "#25D366",
        viewBox: "0 0 24 24",
        path: "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z",
        url: "https://whatsapp.com"
    },
    {
        name: "YouTube",
        color: "#FF0000",
        viewBox: "0 0 24 24",
        path: "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z",
        url: "https://youtube.com"
    },
    {
        name: "X",
        color: "#000000",
        viewBox: "0 0 24 24",
        path: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",
        url: "https://twitter.com"
    },
    {
        name: "LinkedIn",
        color: "#0A66C2",
        viewBox: "0 0 24 24",
        path: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",
        url: "https://linkedin.com"
    },
    {
        name: "TikTok",
        color: "#000000",
        viewBox: "0 0 24 24",
        path: "M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.35-1.17.82-1.48 1.48-.61 1.29-.1 2.87 1.1 3.48 1.14.63 2.6.43 3.66-.46.54-.42.94-.96 1.05-1.64.12-1.85.07-3.71.07-5.56V.02l-.08.00z",
        url: "https://tiktok.com"
    },
    {
        name: "Telegram",
        color: "#26A5E4",
        viewBox: "0 0 24 24",
        path: "M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z",
        url: "https://telegram.org"
    },
    {
        name: "Vercel",
        color: "#000000",
        viewBox: "0 0 24 24",
        path: "M24 22.525H0l12-21.05 12 21.05z",
        url: "https://vercel.com"
    },
    {
        name: "Supabase",
        color: "#3ECF8E",
        viewBox: "0 0 24 24",
        path: "M13.35 24c-.64 0-1.17-.43-1.28-1.05l-.94-5.26h-7.6c-.92 0-1.57-1-1.16-1.81l7.8-15.1c.32-.62.96-1 1.66-1 .65 0 1.18.43 1.29 1.06l.94 5.26h7.6c.92 0 1.56 1 1.15 1.81l-7.8 15.1c-.32.62-.96 1-1.66 1z",
        url: "https://supabase.com"
    },
    {
        name: "ElementLabs",
        color: "#6366F1",
        viewBox: "0 0 24 24",
        path: "M12 2L2 7l10 5 10-5-10-5zm0 9l2.5-1.25L12 12l-2.5-2.25L12 11zm0 2.2V22l10-5V7l-10 5zM2 17l10 5V11L2 7v10z",
        url: "https://elementlabs.ai"
    },
    {
        name: "Envato",
        color: "#81B441",
        viewBox: "0 0 24 24",
        path: "M19.6 15c-.6-1.5-1.3-2.9-2.2-4.2C16.8 9 16 7.4 15.1 5.9c-.9-1.5-1.8-2.9-2.9-4.2-.2-.2-.4-.2-.6-.1-.1.1-.1.2-.2.3-.6 1.8-.9 3.6-1 5.4 0 .9.1 1.9.3 2.8.2.9.5 1.8.8 2.6.3.8.7 1.6 1.1 2.3.4.7.8 1.4 1.3 2 .5.6 1 1.1 1.5 1.5.5.4 1 .7 1.4 1-3.6 2-7.8 1.4-10.8-1.4-3-2.8-4.2-7-3.2-11 .1-.2-.1-.5-.4-.6-.2 0-.5.1-.6.3-2.2 4-2.5 8.7-.9 13 1.6 4.3 5.3 7.5 9.8 8.4 4.5.9 9.1-1.1 11.6-4.9.4-.6.6-1.2.9-1.8 0-.2-.2-.4-.4-.5z",
        url: "https://envato.com"
    },
    {
        name: "Behance",
        color: "#1769FF",
        viewBox: "0 0 24 24",
        path: "M22 7h-7v-2h7v2zm1.726 10c-0.572 3.282-3.321 5.579-6.726 5.579-4.142 0-7.233-3.091-7.233-7.279 0-4.088 2.949-7.054 6.845-7.054 3.75 0 6.643 2.915 6.643 6.942 0 0.583-0.056 1.137-0.132 1.691h-9.97c0.26 2.054 2.126 3.763 4.332 3.763 1.956 0 3.321-1.116 3.945-2.646l2.297 0.963zm-4.48-5.32c-0.298-2.072-1.958-3.411-3.951-3.411-2.146 0-3.64 1.455-3.882 3.411h7.833zm-14.864-3.141c2.094 0 3.565-1.137 3.565-2.798 0-1.832-1.437-2.625-3.094-2.625h-5.918v5.422h5.447zm0.584 7.625c2.28 0 3.961-1.116 3.961-3.119 0-2.315-1.888-3.09-3.83-3.09h-6.176v6.209h6.045zm-1.868-12.723c3.847 0 6.745 1.545 6.745 5.099 0 2.296-1.509 3.827-3.132 4.385 2.186 0.622 3.978 2.381 3.978 5.143 0 4.216-3.864 5.546-7.854 5.546h-10.871v-20.174h11.134z",
        url: "https://behance.net"
    },
    {
        name: "Freepik",
        color: "#306BF3",
        viewBox: "0 0 24 24",
        path: "M20.2 6.8c.2.6.1 1.2-.2 1.7l-4.5 9c-.5.9-1.6 1.3-2.5.8-.3-.1-.5-.4-.7-.6l-2-3-2.1 4.2c-.3.6-1 .8-1.6.5-.4-.2-.6-.6-.6-1V6.9H9.3c.4 0 .8-.2 1-.5l1.7-3.3 1.7 3.3c.2.4.6.6 1 .6h2.2c.7 0 1.2-.6 1.2-1.2 0-.3-.1-.6-.3-.8L15.3 0 12 6.6 8.7 0 6.2 5c-.2.4-.6.6-1 .6H2.9c-.7 0-1.2.6-1.2 1.2 0 .4.2.8.6 1l6.7 3.7c.3.2.5.5.5.9v7.1c0 1 .6 1.8 1.5 2.1.2.1.5.1.7.1.7 0 1.4-.4 1.7-1l3.3-6.6 1.3 1.9c.5.8 1.5 1 2.3.6 1-.5 1.3-1.6.9-2.5l-4.3-8.6h2.1c.4 0 .8.2 1.2.4.3.2.6.5.7.9z",
        url: "https://freepik.com"
    }
]

interface ToolsMarqueeProps {
    baseVelocity?: number
}

export function ToolsMarquee({ baseVelocity = 1 }: ToolsMarqueeProps) {
    const baseX = useMotionValue(0)
    const smoothVelocity = useSpring(baseVelocity, {
        damping: 50,
        stiffness: 300
    })

    // Smooth braking on hover
    const isHovering = useRef(false)
    const speedFactor = useSpring(1, { damping: 40, stiffness: 200 })

    // Wrap exactly at -25% (1/4 of total width) to 0%
    // Since we have 4 copies, shifting -25% puts the 2nd copy exactly where the 1st was.
    const x = useTransform(baseX, (v) => `${wrap(0, -25, v)}%`)

    const directionFactor = useRef<number>(1)

    useAnimationFrame((t, delta) => {
        // Adjust speed factor based on hover
        if (isHovering.current) {
            speedFactor.set(0)
        } else {
            speedFactor.set(1)
        }

        const currentSpeed = speedFactor.get()

        // If speed is practically 0, stop calculation to save resources (optional, but keep it active for smooth start)

        let moveBy = directionFactor.current * baseVelocity * (delta / 1000) * currentSpeed

        // Move the base value 
        // We subtract moveBy to scroll Left (standard marquee direction)
        baseX.set(baseX.get() - moveBy)
    })

    return (
        <div
            className="relative w-full overflow-hidden py-3 group h-full flex items-center bg-transparent"
            onMouseEnter={() => isHovering.current = true}
            onMouseLeave={() => isHovering.current = false}
        >
            {/* Gradient Masks */}
            <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-white/90 to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-white/90 to-transparent z-10 pointer-events-none" />

            {/* Marquee Content */}
            <motion.div
                className="flex whitespace-nowrap"
                style={{ x }}
            >
                <div className="flex gap-6 px-4">
                    {/* Quadrupled List: 4 sets covers 400% width (relative to one set). 
                        Wrapping at -25% creates a perfect loop. */}
                    {[...TOOLS, ...TOOLS, ...TOOLS, ...TOOLS].map((tool, i) => (
                        <motion.div
                            key={i}
                            className="relative flex items-center justify-center group/icon transition-all duration-500 ease-out"
                            initial={{ filter: "grayscale(100%) blur(0.5px)", scale: 0.9, opacity: 0.7 }}
                            whileHover={{
                                filter: "grayscale(0%) blur(0px)",
                                scale: 1.25,
                                opacity: 1,
                                zIndex: 20,
                                transition: { type: "spring", stiffness: 300, damping: 20 }
                            }}
                        >
                            <a
                                href={tool.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block"
                            >
                                {/* Icon Container */}
                                <div className="relative w-9 h-9 rounded-xl bg-white/50 border border-gray-200/50 flex items-center justify-center transition-all duration-500 group-hover/icon:bg-white group-hover/icon:shadow-lg group-hover/icon:border-transparent overflow-hidden">
                                    <svg
                                        viewBox={tool.viewBox}
                                        className="w-5 h-5 fill-current transition-colors duration-500 text-gray-400 group-hover/icon:text-[var(--logo-color)]"
                                        style={{ "--logo-color": tool.color } as React.CSSProperties}
                                        preserveAspectRatio="xMidYMid meet"
                                    >
                                        <path d={tool.path} />
                                    </svg>
                                </div>
                            </a>

                            {/* Tooltip */}
                            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover/icon:opacity-100 transition-all duration-300 bg-gray-900/90 backdrop-blur-sm text-white text-[9px] font-medium px-2 py-1 rounded-md whitespace-nowrap pointer-events-none z-20 shadow-md translate-y-1 group-hover/icon:translate-y-0">
                                {tool.name}
                            </div>
                        </motion.div>
                    ))}
                </div>
            </motion.div>
        </div>
    )
}
