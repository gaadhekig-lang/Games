"use client"

import { motion } from "framer-motion"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

interface DiceProps {
    value: number | null
    isRolling: boolean
    onClick: () => void
    disabled?: boolean
}

export function Dice({ value, isRolling, onClick, disabled }: DiceProps) {
    const [displayValue, setDisplayValue] = useState(1)

    useEffect(() => {
        console.log("Dice effect", { isRolling, value })
        if (isRolling) {
            const interval = setInterval(() => {
                setDisplayValue(Math.floor(Math.random() * 6) + 1)
            }, 100)
            return () => clearInterval(interval)
        } else if (value) {
            setDisplayValue(value)
        }
    }, [isRolling, value])

    // Dot positions for each number
    const renderDots = (num: number) => {
        const dots = []
        if ([1, 3, 5].includes(num)) dots.push(<div key="c" className="w-3 h-3 bg-black rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />)
        if ([2, 3, 4, 5, 6].includes(num)) {
            dots.push(<div key="tl" className="w-3 h-3 bg-black rounded-full absolute top-2 left-2" />)
            dots.push(<div key="br" className="w-3 h-3 bg-black rounded-full absolute bottom-2 right-2" />)
        }
        if ([4, 5, 6].includes(num)) {
            dots.push(<div key="tr" className="w-3 h-3 bg-black rounded-full absolute top-2 right-2" />)
            dots.push(<div key="bl" className="w-3 h-3 bg-black rounded-full absolute bottom-2 left-2" />)
        }
        if (num === 6) {
            dots.push(<div key="ml" className="w-3 h-3 bg-black rounded-full absolute top-1/2 left-2 -translate-y-1/2" />)
            dots.push(<div key="mr" className="w-3 h-3 bg-black rounded-full absolute top-1/2 right-2 -translate-y-1/2" />)
        }
        return dots
    }

    return (
        <motion.button
            onClick={onClick}
            disabled={disabled}
            animate={isRolling ? {
                rotate: [0, 90, 180, 270, 360],
                scale: [1, 1.1, 1],
            } : {
                rotate: 0,
                scale: 1
            }}
            transition={isRolling ? {
                duration: 0.5,
                repeat: Infinity,
                ease: "linear"
            } : {}}
            className={cn(
                "w-20 h-20 bg-white border-4 border-black rounded-xl relative shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-1 transition-all",
                disabled && "opacity-50 cursor-not-allowed shadow-none"
            )}
        >
            {renderDots(displayValue)}
        </motion.button>
    )
}
