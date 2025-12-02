"use client"

import { AnimatePresence, motion } from "framer-motion"
import { Button } from "@/components/ui/Button"

interface HostLeftModalProps {
    isOpen: boolean
    onReturnHome: () => void
}

export function HostLeftModal({ isOpen, onReturnHome }: HostLeftModalProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 pointer-events-auto">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-[#e6d5aa] p-6 max-w-md w-full pixel-border border-4 border-[#8b4513] shadow-2xl text-center"
                    >
                        <h2 className="text-2xl font-retro-heading text-[#3e2723] mb-4">
                            HOST LEFT THE GAME
                        </h2>
                        <p className="font-retro-body text-[#5d4037] mb-6">
                            The host has disconnected. The party is over!
                        </p>
                        <Button
                            onClick={onReturnHome}
                            className="w-full font-retro-heading bg-[#8b4513] hover:bg-[#5d3a1a] text-white pixel-border border-2 border-black"
                        >
                            RETURN TO HOME
                        </Button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}
