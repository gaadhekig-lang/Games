"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface BubbleProps {
    children?: React.ReactNode
    className?: string
    size?: number
    onClick?: () => void
    delay?: number
    duration?: number
    staticPosition?: boolean
    floatUp?: boolean
}

export function Bubble({
    children,
    className,
    size = 100,
    onClick,
    delay = 0,
    duration = 15,
    staticPosition = false,
    floatUp = false
}: BubbleProps) {

    const bubbleStyle = {
        width: size,
        height: size,
    }

    // Realistic Lens/Glass Bubble Styles
    // - Radial gradient for 3D sphere look
    // - Sharp specular highlight (white dot)
    // - Inner shadow/glow for thickness
    // - Backdrop blur for refraction feel
    const glassStyles = "bg-[radial-gradient(circle_at_30%_30%,_rgba(255,255,255,0.1)_0%,_rgba(255,255,255,0.05)_20%,_transparent_60%,_rgba(255,255,255,0.2)_100%)] backdrop-blur-[2px] border border-white/20 shadow-[inset_0_0_20px_rgba(255,255,255,0.1),0_10px_30px_rgba(0,0,0,0.3)]"

    const content = (
        <motion.div
            className={cn(
                "flex items-center justify-center rounded-full cursor-pointer transition-all relative overflow-hidden group",
                glassStyles,
                className
            )}
            style={bubbleStyle}
            whileHover={{ scale: 1.05, borderColor: "rgba(255,255,255,0.5)", boxShadow: "0 0 30px rgba(255,255,255,0.2)" }}
            whileTap={{ scale: 0.95 }}
            onClick={onClick}
        >
            {/* Specular Highlight (The 'Sun' reflection) */}
            <div className="absolute top-[15%] left-[20%] w-[15%] h-[10%] bg-white rounded-[50%] blur-[1px] opacity-90 pointer-events-none transform -rotate-45" />

            {/* Secondary Reflection (Bottom right) */}
            <div className="absolute bottom-[15%] right-[20%] w-[10%] h-[5%] bg-white rounded-[50%] blur-[2px] opacity-40 pointer-events-none transform -rotate-45" />

            {/* Rim Light */}
            <div className="absolute inset-0 rounded-full border border-white/10 pointer-events-none" />

            {children}
        </motion.div>
    )

    if (staticPosition) {
        return (
            <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1, y: [0, -8, 0] }}
                transition={{
                    scale: { duration: 0.5, delay },
                    opacity: { duration: 0.5, delay },
                    y: { duration: 5, repeat: Infinity, ease: "easeInOut" }
                }}
            >
                {content}
            </motion.div>
        )
    } else if (floatUp) {
        return (
            <motion.div
                initial={{ y: "110vh", scale: 0.9, opacity: 0 }}
                animate={{
                    y: "-20vh",
                    opacity: 1,
                    scale: [0.9, 1.1, 0.95, 1.05, 0.9] // Dynamic size pulsing
                }}
                transition={{
                    y: { duration: duration, repeat: Infinity, delay: delay, ease: "linear" },
                    opacity: { duration: 0.5 },
                    scale: {
                        duration: duration,
                        repeat: Infinity,
                        ease: "easeInOut",
                        times: [0, 0.25, 0.5, 0.75, 1]
                    }
                }}
                className="absolute"
            >
                {content}
            </motion.div>
        )
    }

    return content
}
