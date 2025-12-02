"use client"

import { Bubble } from "./Bubble"
import { Play } from "lucide-react"
import { motion } from "framer-motion"

interface GameBubbleProps {
    title: string
    icon?: React.ReactNode
    onClick: () => void
    duration?: number
    delay?: number
    left?: number
    size?: number
    color?: string
}

export function GameBubble({
    title,
    icon,
    onClick,
    duration = 15,
    delay = 0,
    left = 50,
    size = 140,
    color = ""
}: GameBubbleProps) {
    return (
        <div
            className="absolute top-0 z-20"
            style={{ left: `${left}%` }}
        >
            <Bubble
                size={size}
                className={`flex-col gap-2 text-center p-4 ${color}`}
                onClick={onClick}
                floatUp={true}
                duration={duration}
                delay={delay}
            >
                <div className="relative z-10 flex flex-col items-center">
                    <motion.div
                        className="text-4xl mb-2 drop-shadow-lg text-white"
                        animate={{ rotate: [-5, 5, -5] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    >
                        {icon || <Play className="h-10 w-10" />}
                    </motion.div>
                    <span className="font-bold text-lg leading-tight text-white drop-shadow-md">{title}</span>
                    <div className="mt-2 px-3 py-1 bg-white/20 rounded-full text-xs font-medium text-white backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity">
                        Play
                    </div>
                </div>
            </Bubble>
        </div>
    )
}
