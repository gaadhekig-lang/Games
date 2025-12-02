"use client"

import { useState, useEffect } from "react"
import { MarioSprite } from "./PixelSprites"
import { Button } from "@/components/ui/Button"
import { useRouter } from "next/navigation"

interface Game {
    id: string
    title: string
    description: string
    path: string
}

const GAMES: Game[] = [
    { id: "tictactoe", title: "Tic-Tac-Toe", description: "Classic X & O", path: "/lobby/create?game=tic-tac-toe" },
    { id: "ludo", title: "Ludo", description: "Dice Race", path: "/lobby/create?game=ludo" },
    { id: "snakeladders", title: "Snake & Ladders", description: "Climb & Slide", path: "/lobby/create?game=snake-ladders" },
]

export function CharacterParade() {
    const router = useRouter()

    const [gameIndex, setGameIndex] = useState(0)
    const [marioPosition, setMarioPosition] = useState(-20) // Percentage
    const [frame, setFrame] = useState(0)

    useEffect(() => {
        const interval = setInterval(() => {
            // Move Mario
            setMarioPosition(prev => {
                if (prev > 120) {
                    setGameIndex(g => (g + 1) % GAMES.length)
                    return -20
                }
                return prev + 0.5 // Speed
            })

            // Animate Legs (every 100ms)
            // 5 individual frames (0-4)
            setFrame(f => (f + 1) % 5)
        }, 100)
        return () => clearInterval(interval)
    }, [])

    const currentGame = GAMES[gameIndex]

    return (
        <div className="fixed inset-0 pointer-events-none z-0">
            {/* Background Elements - Positioned relative to bottom of screen */}
            {/* Pipes removed as per request */}

            {/* Instructions */}
            <div className="absolute top-32 left-1/2 -translate-x-1/2 text-center z-20 pointer-events-auto">
                <h2 className="text-4xl font-retro-heading text-white [-webkit-text-stroke:2px_black] drop-shadow-[4px_4px_0_rgba(0,0,0,1)] mb-4">Select a Game</h2>
                <p className="text-xl font-retro-body bg-black/50 text-white p-4 rounded pixel-border inline-block">
                    Click Mario to Play!
                </p>
            </div>

            {/* Mario Container - Positioned on top of ground */}
            <div
                className="absolute bottom-[14%] transition-transform duration-50 ease-linear cursor-pointer group pointer-events-auto"
                style={{
                    left: `${marioPosition}%`,
                    transform: `translateX(-50%)`
                }}
                onClick={() => router.push(currentGame.path)}
            >
                {/* Game Sign */}
                <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-48 flex flex-col items-center animate-bounce">
                    <div className="bg-white p-2 pixel-border text-center w-full">
                        <h3 className="font-retro-heading text-sm text-black">{currentGame.title}</h3>
                        <p className="font-retro-body text-xs text-gray-600">{currentGame.description}</p>
                    </div>
                    <div className="w-1 h-8 bg-black"></div>
                </div>

                {/* Mario */}
                <div className="w-24 h-24 relative">
                    <MarioSprite
                        className="w-full h-full"
                        frame={Math.floor(frame)} // Ensure integer
                    />
                </div>
            </div>

            {/* Static Game List (Fallback/Quick Access) */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-4 pointer-events-auto z-50">
                {GAMES.map((game, i) => (
                    <div
                        key={game.id}
                        className={`w-4 h-4 rounded-none border-2 border-black cursor-pointer ${i === gameIndex ? 'bg-[var(--pixel-primary)]' : 'bg-white'}`}
                        onClick={() => {
                            setGameIndex(i)
                            setMarioPosition(50) // Teleport to center
                        }}
                    />
                ))}
            </div>
        </div>
    )
}
