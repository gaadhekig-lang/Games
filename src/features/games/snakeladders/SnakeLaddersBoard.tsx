import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface SnakeLaddersBoardProps {
    players: { [key: string]: { color: string; position: number; intermediatePosition?: number } }
    snakes: { [key: number]: { end: number } }
    ladders: { [key: number]: { end: number } }
}

export function SnakeLaddersBoard({ players, snakes, ladders }: SnakeLaddersBoardProps) {
    // Local state for visual positions to handle animation
    const [visualPositions, setVisualPositions] = useState<{ [key: string]: number }>({})

    // Initialize visual positions
    useEffect(() => {
        setVisualPositions(prev => {
            const newPositions = { ...prev }
            Object.keys(players).forEach(key => {
                if (newPositions[key] === undefined) {
                    newPositions[key] = players[key].position
                }
            })
            return newPositions
        })
    }, [])

    // Handle animations
    useEffect(() => {
        const interval = setInterval(() => {
            setVisualPositions(current => {
                const next = { ...current }
                let changed = false

                Object.keys(players).forEach(key => {
                    const p = players[key]
                    const target = p.position
                    const intermediate = p.intermediatePosition
                    const currentPos = current[key] ?? target

                    // If we have an intermediate position (snake/ladder start)
                    if (intermediate !== undefined && currentPos !== target) {
                        // Phase 1: Walk to intermediate
                        if (currentPos !== intermediate) {
                            changed = true
                            if (currentPos < intermediate) {
                                next[key] = currentPos + 1
                            } else {
                                next[key] = currentPos - 1
                            }
                        } else {
                            // Phase 2: Slide to final (Snake/Ladder effect)
                            // We are AT the intermediate position, so jump directly to target
                            // Framer motion will handle the slide animation between these two points
                            changed = true
                            next[key] = target
                        }
                    } else if (currentPos !== target) {
                        // Normal movement (step by step)
                        changed = true
                        if (currentPos < target) {
                            next[key] = currentPos + 1
                        } else {
                            next[key] = currentPos - 1
                        }
                    }
                })

                return changed ? next : current
            })
        }, 400) // Slower move for "jump" effect (400ms)

        return () => clearInterval(interval)
    }, [players])

    // Helper to get coordinates for a square (0-100 scale for SVG)
    const getCoordinates = (num: number) => {
        if (num === 0) return { x: 5, y: 95 } // Start position (bottom left)

        // 1-100
        // Row 0 (bottom) is 1-10
        // Row 9 (top) is 91-100
        const row0Indexed = Math.floor((num - 1) / 10) // 0 to 9
        const col0Indexed = (num - 1) % 10 // 0 to 9

        // Visual Row: 0 is top, 9 is bottom. So visualRow = 9 - row0Indexed
        const visualRow = 9 - row0Indexed

        // Visual Col:
        // Even row0Indexed (0, 2, ...): Left to Right (0 -> 0, 9 -> 9)
        // Odd row0Indexed (1, 3, ...): Right to Left (0 -> 9, 9 -> 0)
        let visualCol = col0Indexed
        if (row0Indexed % 2 !== 0) {
            visualCol = 9 - col0Indexed
        }

        // Center of the square in %
        const x = visualCol * 10 + 5
        const y = visualRow * 10 + 5

        return { x, y }
    }

    // Generate grid numbers 100 down to 1
    const grid = []
    for (let row = 9; row >= 0; row--) {
        const rowSquares = []
        for (let col = 0; col < 10; col++) {
            let num
            if (row % 2 === 0) {
                num = row * 10 + col + 1
            } else {
                num = row * 10 + (9 - col) + 1
            }
            rowSquares.push(num)
        }
        grid.push(rowSquares)
    }

    return (
        <div className="relative w-[600px] h-[600px] shadow-2xl">
            {/* Background Image */}
            <div className="absolute inset-0 z-0">
                <img
                    src="/snakes-ladders/retro-board.jpg"
                    alt="Retro Board"
                    className="w-full h-full object-cover rounded-lg"
                />
            </div>



            {/* Grid Overlay for Players */}
            <div className="relative z-20 grid grid-rows-10 w-full h-full">
                {grid.map((row, rowIndex) => (
                    <div key={rowIndex} className="grid grid-cols-10 h-full">
                        {row.map((num) => {
                            return (
                                <div key={num} className="relative flex items-center justify-center">
                                    {/* Empty grid cells for layout/debug if needed */}
                                </div>
                            )
                        })}
                    </div>
                ))}
            </div>

            {/* Absolute Player Overlay */}
            <div className="absolute inset-0 z-30 pointer-events-none">
                {Object.keys(players).map((key) => {
                    const p = players[key]
                    const visualPos = visualPositions[key] ?? p.position
                    const coords = getCoordinates(visualPos)

                    // Handle overlapping players
                    const playersAtPos = Object.keys(players).filter(k => (visualPositions[k] ?? players[k].position) === visualPos)
                    const indexAtPos = playersAtPos.indexOf(key)
                    const offset = playersAtPos.length > 1 ? {
                        x: (indexAtPos % 2 === 0 ? -1 : 1) * 2, // -2% or +2%
                        y: (indexAtPos < 2 ? -1 : 1) * 2 // -2% or +2%
                    } : { x: 0, y: 0 }

                    return (
                        <motion.div
                            key={key}
                            className={cn(
                                "absolute w-6 h-6 rounded-full border-2 border-white shadow-md z-30",
                                p.color === 'red' && "bg-red-500",
                                p.color === 'green' && "bg-green-500",
                                p.color === 'yellow' && "bg-yellow-500",
                                p.color === 'blue' && "bg-blue-500"
                            )}
                            initial={false}
                            animate={{
                                left: `${coords.x + offset.x}%`,
                                top: `${coords.y + offset.y}%`,
                                scale: [1, 1.3, 1] // Hop effect
                            }}
                            transition={{
                                duration: 0.4,
                                ease: "easeInOut"
                            }}
                            style={{
                                x: "-50%",
                                y: "-50%"
                            }}
                        />
                    )
                })}
            </div>
        </div>
    )
}
