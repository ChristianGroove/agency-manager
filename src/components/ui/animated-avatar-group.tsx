"use client"

import { AnimatePresence, motion } from "framer-motion"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Link from "next/link"

interface AvatarGroupProps {
    users: {
        id: string
        name: string
        image?: string
        debt?: number
    }[]
    limit?: number
}

export default function AnimatedAvatarGroup({ users, limit = 5 }: AvatarGroupProps) {
    const visibleUsers = users.slice(0, limit)
    const remaining = users.length - limit

    return (
        <div className="flex items-center">
            <AnimatePresence mode="popLayout">
                {visibleUsers.map((user, index) => (
                    <Link href={`/clients/${user.id}`} key={user.id}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.5, x: -20 }}
                            animate={{ opacity: 1, scale: 1, x: index * -15 }}
                            exit={{ opacity: 0, scale: 0.5, x: 0 }}
                            transition={{
                                type: "spring",
                                stiffness: 400,
                                damping: 25,
                                delay: index * 0.1
                            }}
                            className="relative z-0 hover:z-50 transition-all duration-200"
                            style={{ zIndex: visibleUsers.length - index }}
                            whileHover={{
                                scale: 1.25,
                                zIndex: 50,
                                x: (index * -15),
                                transition: { duration: 0.1, ease: "easeOut" }
                            }}
                        >
                            <div className="group relative">
                                <Avatar className="h-12 w-12 border-2 border-white shadow-lg cursor-pointer">
                                    <AvatarImage src={user.image} alt={user.name} />
                                    <AvatarFallback className="bg-gradient-to-br from-brand-pink to-pink-600 text-white font-bold text-xs">
                                        {user.name.substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>

                                {/* Tooltip on hover */}
                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-[10px] px-2 py-1 rounded-md whitespace-nowrap pointer-events-none shadow-xl">
                                    {user.name}
                                    {user.debt && <span className="text-red-300 ml-1">(-${user.debt.toLocaleString()})</span>}
                                    <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                                </div>
                            </div>
                        </motion.div>
                    </Link>
                ))}
            </AnimatePresence>

            {remaining > 0 && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.5, x: -20 }}
                    animate={{ opacity: 1, scale: 1, x: visibleUsers.length * -15 }}
                    className="relative z-0"
                >
                    <div className="h-12 w-12 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-xs font-bold text-gray-500 shadow-md">
                        +{remaining}
                    </div>
                </motion.div>
            )}
        </div>
    )
}
