"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import Image from "next/image"
import { Fish } from "./Fish"

export function OceanBackground({ children }: { children: React.ReactNode }) {
    const [bubbles, setBubbles] = useState<any[]>([])
    const [fishes, setFishes] = useState<any[]>([])

    useEffect(() => {
        const newBubbles = Array.from({ length: 30 }).map((_, i) => ({
            id: i,
            size: Math.random() * 4 + 2,
            left: Math.random() * 100,
            duration: Math.random() * 20 + 15,
            delay: Math.random() * 20,
            opacity: Math.random() * 0.3 + 0.1,
        }))
        setBubbles(newBubbles)

        // Generate random fish
        const newFishes = Array.from({ length: 5 }).map((_, i) => ({
            id: i,
            type: i % 2 === 0 ? 1 : 2,
            initialY: Math.random() * 60 + 20, // Random depth between 20% and 80%
            initialX: -20,
            speed: Math.random() * 15 + 15, // Random speed
        }))
        setFishes(newFishes)
    }, [])

    return (
        <div className="relative min-h-screen w-full overflow-hidden bg-[#000510] text-white font-sans">

            {/* Main High-Quality Background Image */}
            <div className="absolute inset-0 z-0">
                <Image
                    src="/assets/ocean/main_bg.png"
                    alt="Deep Ocean Background"
                    fill
                    className="object-cover"
                    priority
                />
                {/* Overlay to ensure text readability if image is too bright */}
                <div className="absolute inset-0 bg-black/20" />
            </div>

            {/* Interactive Fish Layer */}
            {fishes.map((fish) => (
                <Fish
                    key={fish.id}
                    type={fish.type}
                    initialY={fish.initialY}
                    initialX={fish.initialX}
                    speed={fish.speed}
                />
            ))}

            {/* Ambient Bubbles (Subtle) */}
            {bubbles.map((bubble) => (
                <motion.div
                    key={bubble.id}
                    className="absolute rounded-full bg-white backdrop-blur-[1px] pointer-events-none shadow-[0_0_4px_rgba(255,255,255,0.4)]"
                    style={{
                        width: bubble.size,
                        height: bubble.size,
                        left: `${bubble.left}%`,
                        opacity: bubble.opacity,
                    }}
                    initial={{ y: "110vh" }}
                    animate={{ y: "-10vh" }}
                    transition={{
                        duration: bubble.duration,
                        repeat: Infinity,
                        delay: bubble.delay,
                        ease: "linear",
                    }}
                />
            ))}

            {/* Content Layer */}
            <div className="relative z-20 h-full w-full">
                {children}
            </div>
        </div>
    )
}
