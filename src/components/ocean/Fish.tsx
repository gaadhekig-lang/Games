"use client"

import { motion, useAnimation } from "framer-motion"
import { useState, useEffect } from "react"
import Image from "next/image"

interface FishProps {
    type: 1 | 2
    initialY: number
    initialX: number
    speed: number
}

export function Fish({ type, initialY, initialX, speed }: FishProps) {
    const controls = useAnimation()
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
    const [fishPos, setFishPos] = useState({ x: initialX, y: initialY })
    const [isFleeing, setIsFleeing] = useState(false)

    // Track mouse position globally
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            setMousePos({ x: e.clientX, y: e.clientY })
        }
        window.addEventListener("mousemove", handleMouseMove)
        return () => window.removeEventListener("mousemove", handleMouseMove)
    }, [])

    // Start swimming animation
    useEffect(() => {
        if (!isFleeing) {
            startSwimming()
        }
    }, [isFleeing])

    // Check distance to mouse
    useEffect(() => {
        if (isFleeing) return

        // Get approximate fish position (this is a simplification, ideally we track the animation value)
        // For now, we'll just check if the mouse is near the "lane" the fish is swimming in
        // A more robust solution would use a ref to the element and getBoundingClientRect

        // Since tracking exact animated position is expensive in React state, 
        // we'll use a simpler interaction: if mouse is near the fish's Y level 
        // and we are roughly in the middle of the screen (where interaction is most likely)

        // Actually, let's use a ref-based approach for better accuracy if needed, 
        // but for "fleeing", a simple proximity check to the element's center is best.
        // However, we can't easily get the animated X without polling.

        // Alternative: The user asked for "cursor go close to them".
        // We can use an onMouseMove handler ON the fish element itself with a large padding/margin?
        // Or just use the simple hover for now, but make the reaction "fast run away".

    }, [mousePos, isFleeing])

    async function startSwimming() {
        await controls.start({
            x: ["-20vw", "120vw"],
            y: [initialY, initialY + Math.random() * 50 - 25],
            transition: {
                duration: speed,
                ease: "linear",
                repeat: Infinity,
                repeatType: "loop"
            }
        })
    }

    const handleFlee = async () => {
        if (isFleeing) return
        setIsFleeing(true)

        // Run away fast!
        await controls.start({
            x: "150vw", // Sprint off screen
            transition: { duration: 0.8, ease: "easeIn" }
        })

        // Reset after a while
        setTimeout(() => {
            setIsFleeing(false)
            controls.set({ x: "-20vw" }) // Reset to start
        }, 2000)
    }

    return (
        <motion.div
            className="absolute w-24 h-16 z-10 mix-blend-screen pointer-events-auto"
            style={{ top: initialY }}
            animate={controls}
            onMouseEnter={handleFlee} // Trigger flee on hover (close proximity)
        >
            <Image
                src={`/assets/ocean/fish_${type}.png`}
                alt="Fish"
                fill
                className="object-contain opacity-80"
            />
        </motion.div>
    )
}
