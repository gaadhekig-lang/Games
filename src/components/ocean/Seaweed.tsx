"use client"

import { motion } from "framer-motion"
import Image from "next/image"

export function Seaweed({ delay = 0, height = 100 }: { delay?: number, height?: number }) {
    return (
        <motion.div
            className="absolute bottom-0 w-24 origin-bottom mix-blend-screen opacity-80"
            style={{ height }}
            animate={{
                rotate: [-2, 2, -2],
                skewX: [-1, 1, -1],
            }}
            transition={{
                duration: 5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: delay,
            }}
        >
            <Image
                src="/assets/ocean/seaweed.png"
                alt="Seaweed"
                fill
                className="object-cover"
            />
        </motion.div>
    )
}
