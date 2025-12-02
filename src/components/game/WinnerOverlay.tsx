import React from 'react'
import { motion } from 'framer-motion'
import { Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WinnerOverlayProps {
    winnerName: string
    onBackToLobby?: () => void
}

export function WinnerOverlay({ winnerName, onBackToLobby }: WinnerOverlayProps) {
    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-[#e6d5aa] p-8 border-8 border-[#8b4513] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-center flex flex-col items-center gap-6 max-w-lg w-full"
            >
                <div className="w-24 h-24 bg-yellow-400 rounded-full border-4 border-black flex items-center justify-center animate-bounce">
                    <Trophy className="w-12 h-12 text-black" />
                </div>

                <div className="space-y-2">
                    <h2 className="text-2xl font-retro-body text-[#8b4513]">WINNER!</h2>
                    <h1 className="text-5xl font-retro-heading text-[#4a8f3a] pixel-text-stroke tracking-wider">
                        {winnerName}
                    </h1>
                    <p className="text-xl font-retro-body text-[#3e2723]">WON THE GAME!</p>
                </div>

                <div className="flex gap-4 w-full">
                    <button
                        onClick={onBackToLobby}
                        className="flex-1 px-6 py-2 bg-[#5d4037] border-4 border-black text-white font-retro-heading text-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-1 transition-all"
                    >
                        BACK TO LOBBY
                    </button>
                </div>
            </motion.div>

            {/* Confetti Effect (Simple CSS dots) */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {Array.from({ length: 50 }).map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-2 h-2 rounded-full animate-pulse"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            backgroundColor: ['#ff0000', '#00ff00', '#0000ff', '#ffff00'][Math.floor(Math.random() * 4)],
                            animationDelay: `${Math.random() * 2}s`,
                            animationDuration: `${1 + Math.random()}s`
                        }}
                    />
                ))}
            </div>
        </div>
    )
}
