import { cn } from "@/lib/utils"
import { PlayerColor, getGridCoordinates } from "./ludoUtils"
import { motion, useAnimation } from "framer-motion"
import { useEffect, useRef } from "react"

interface Token {
    id: number
    position: number
    status: 'base' | 'active' | 'home'
}

interface LudoBoardProps {
    players: { [key: string]: { color: PlayerColor; tokens: Token[] } }
    currentTurn: PlayerColor
    diceValue: number | null
    onTokenClick: (tokenIndex: number) => void
    myColor: PlayerColor | null
    isMyTurn: boolean
}

// Pixel Star Component
function PixelStar({ className }: { className?: string }) {
    return (
        <div className={cn("w-4 h-4 relative", className)}>
            <div className="absolute inset-0 bg-yellow-400" style={{
                clipPath: "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)"
            }} />
            <div className="absolute inset-[1px] bg-yellow-300" style={{
                clipPath: "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)"
            }} />
        </div>
    )
}

export function LudoBoard({ players, currentTurn, diceValue, onTokenClick, myColor, isMyTurn }: LudoBoardProps) {
    // Generate 15x15 grid cells
    const cells = Array(15 * 15).fill(null)

    // Helper to check if a cell is part of a base
    const getCellType = (row: number, col: number) => {
        // Red Base (Top Left)
        if (row >= 0 && row <= 5 && col >= 0 && col <= 5) return 'base-red'
        // Green Base (Top Right)
        if (row >= 0 && row <= 5 && col >= 9 && col <= 14) return 'base-green'
        // Blue Base (Bottom Right)
        if (row >= 9 && row <= 14 && col >= 9 && col <= 14) return 'base-blue'
        // Yellow Base (Bottom Left)
        if (row >= 9 && row <= 14 && col >= 0 && col <= 5) return 'base-yellow'

        // Center Home
        if (row >= 6 && row <= 8 && col >= 6 && col <= 8) return 'home-center'

        // Paths
        return 'path'
    }

    const isStar = (row: number, col: number) => {
        // Stars at: [2,6], [6,12], [8,2], [12,8]
        if (row === 2 && col === 6) return true
        if (row === 6 && col === 12) return true
        if (row === 8 && col === 2) return true
        if (row === 12 && col === 8) return true
        return false
    }

    // Calculate Board Rotation
    let rotation = 0
    if (myColor === 'red') rotation = 90 // Red is Left -> Rotate 90 to bring to Bottom? No.
    // Red (Left) -> Needs to be Bottom.
    // Left is -90 deg from Bottom? No.
    // Standard: Top (0), Right (90), Bottom (180), Left (270/-90).
    // Board Layout:
    // Top: Green
    // Bottom: Yellow
    // Left: Red
    // Right: Blue

    // We want `myColor` at Bottom.
    // If Red (Left) -> Rotate -90 (or 270) -> Bottom.
    // If Green (Top) -> Rotate 180 -> Bottom.
    // If Blue (Right) -> Rotate 90 -> Bottom.
    // If Yellow (Bottom) -> Rotate 0.

    switch (myColor) {
        case 'red': rotation = 90; break; // Wait. Left (Red) rotated 90 clockwise becomes Top. 
        // We want Red at Bottom.
        // Left is at 270 deg (if Top is 0). Bottom is 180.
        // To get Left (270) to Bottom (180)? -90.
        // Let's visualize:
        // [ R | G ]
        // [ Y | B ]
        // Wait, Red is TL?
        // getCellType: Red (0-5, 0-5) -> TL.
        // Green (0-5, 9-14) -> TR.
        // Yellow (9-14, 0-5) -> BL.
        // Blue (9-14, 9-14) -> BR.

        // Red Home Path: row 7, col 1-5. (Left side).
        // So Red is LEFT.
        // Green Home Path: col 7, row 1-5. (Top side).
        // So Green is TOP.
        // Yellow Home Path: col 7, row 9-13. (Bottom side).
        // So Yellow is BOTTOM.
        // Blue Home Path: row 7, col 9-13. (Right side).
        // So Blue is RIGHT.

        // Goal: Bring `myColor` to BOTTOM.
        // Yellow (Bottom) -> 0 deg.
        // Green (Top) -> 180 deg.
        // Red (Left) -> Rotate -90 deg (Counter-Clockwise) -> Bottom.
        // Blue (Right) -> Rotate 90 deg (Clockwise) -> Bottom.

        case 'red': rotation = -90; break;
        case 'green': rotation = 180; break;
        case 'blue': rotation = 90; break;
        case 'yellow': rotation = 0; break;
    }

    return (
        <div
            className="relative w-full max-w-[600px] aspect-square bg-[#e6d5aa] border-[6px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-none overflow-hidden transition-transform duration-700 ease-in-out"
            style={{ transform: `rotate(${rotation}deg)` }}
        >
            {/* Grid Background */}
            <div
                className="grid w-full h-full gap-0 bg-black"
                style={{
                    gridTemplateColumns: 'repeat(15, 1fr)',
                    gridTemplateRows: 'repeat(15, 1fr)'
                }}
            >
                {cells.map((_, i) => {
                    const row = Math.floor(i / 15)
                    const col = i % 15
                    const type = getCellType(row, col)
                    const hasStar = isStar(row, col)

                    // Determine cell color
                    let cellColor = "bg-[#ffebcd]" // Retro Beige

                    // Home Paths - Brighter Retro Colors
                    if (row === 7 && col >= 1 && col <= 5) cellColor = "bg-[#ff3333]" // Retro Red
                    if (col === 7 && row >= 1 && row <= 5) cellColor = "bg-[#33cc33]" // Retro Green
                    if (row === 7 && col >= 9 && col <= 13) cellColor = "bg-[#3366ff]" // Retro Blue
                    if (col === 7 && row >= 9 && row <= 13) cellColor = "bg-[#ffcc00]" // Retro Yellow

                    // Start Squares
                    if (row === 6 && col === 1) cellColor = "bg-[#ff3333]"
                    if (row === 1 && col === 8) cellColor = "bg-[#33cc33]"
                    if (row === 8 && col === 13) cellColor = "bg-[#3366ff]"
                    if (row === 13 && col === 6) cellColor = "bg-[#ffcc00]"

                    // Center Triangles
                    if (type === 'home-center') {
                        cellColor = "bg-white"
                    }

                    // Base Cells Logic
                    if (type.startsWith('base')) {
                        // Default Base Color
                        if (type === 'base-red') cellColor = "bg-[#ff3333]"
                        if (type === 'base-green') cellColor = "bg-[#33cc33]"
                        if (type === 'base-yellow') cellColor = "bg-[#ffcc00]"
                        if (type === 'base-blue') cellColor = "bg-[#3366ff]"

                        // Inner White Box (4x4)
                        const isInnerRed = row >= 1 && row <= 4 && col >= 1 && col <= 4
                        const isInnerGreen = row >= 1 && row <= 4 && col >= 10 && col <= 13
                        const isInnerYellow = row >= 10 && row <= 13 && col >= 1 && col <= 4
                        const isInnerBlue = row >= 10 && row <= 13 && col >= 10 && col <= 13

                        if (isInnerRed || isInnerGreen || isInnerYellow || isInnerBlue) {
                            cellColor = "bg-white"
                        }

                        // Token Spots (Colored again inside white)
                        // Red Spots: (1,1), (1,4), (4,1), (4,4)
                        if (type === 'base-red' && (
                            (row === 1 && col === 1) || (row === 1 && col === 4) ||
                            (row === 4 && col === 1) || (row === 4 && col === 4)
                        )) cellColor = "bg-[#ff3333]"

                        // Green Spots: (1,10), (1,13), (4,10), (4,13)
                        if (type === 'base-green' && (
                            (row === 1 && col === 10) || (row === 1 && col === 13) ||
                            (row === 4 && col === 10) || (row === 4 && col === 13)
                        )) cellColor = "bg-[#33cc33]"

                        // Yellow Spots: (10,1), (10,4), (13,1), (13,4)
                        if (type === 'base-yellow' && (
                            (row === 10 && col === 1) || (row === 10 && col === 4) ||
                            (row === 13 && col === 1) || (row === 13 && col === 4)
                        )) cellColor = "bg-[#ffcc00]"

                        // Blue Spots: (10,10), (10,13), (13,10), (13,13)
                        if (type === 'base-blue' && (
                            (row === 10 && col === 10) || (row === 10 && col === 13) ||
                            (row === 13 && col === 10) || (row === 13 && col === 13)
                        )) cellColor = "bg-[#3366ff]"
                    }

                    return (
                        <div
                            key={i}
                            className={cn(
                                "flex items-center justify-center relative border-[0.5px] border-black/20",
                                cellColor
                            )}
                        >
                            {hasStar && <PixelStar className="w-8 h-8" />}

                            {/* Center Triangles Logic */}
                            {type === 'home-center' && (
                                <div className={cn(
                                    "w-full h-full",
                                    (row === 6 && col === 6) && "bg-transparent", // TL
                                    (row === 7 && col === 7) && "bg-white", // Center
                                    // Use CSS triangles or just colors
                                    (row === 7 && col === 6) && "bg-[#ff3333]", // Left
                                    (row === 6 && col === 7) && "bg-[#33cc33]", // Top
                                    (row === 7 && col === 8) && "bg-[#3366ff]", // Right
                                    (row === 8 && col === 7) && "bg-[#ffcc00]", // Bottom
                                    // Corners of center
                                    (row === 6 && col === 6) && "bg-[#ff3333] opacity-50",
                                    (row === 6 && col === 8) && "bg-[#33cc33] opacity-50",
                                    (row === 8 && col === 8) && "bg-[#3366ff] opacity-50",
                                    (row === 8 && col === 6) && "bg-[#ffcc00] opacity-50",
                                )} />
                            )}
                        </div>
                    )
                })}
            </div>

            {/* Center Overlay for Triangles */}
            <div className="absolute top-[40%] left-[40%] w-[20%] h-[20%] bg-white flex flex-wrap pointer-events-none z-0 border-4 border-black">
                <div className="w-full h-full relative">
                    {/* Red Triangle (Left) */}
                    <div className="absolute top-0 left-0 w-full h-full bg-[#ff3333]" style={{ clipPath: 'polygon(0 0, 50% 50%, 0 100%)' }} />
                    {/* Green Triangle (Top) */}
                    <div className="absolute top-0 left-0 w-full h-full bg-[#33cc33]" style={{ clipPath: 'polygon(0 0, 100% 0, 50% 50%)' }} />
                    {/* Blue Triangle (Right) */}
                    <div className="absolute top-0 left-0 w-full h-full bg-[#3366ff]" style={{ clipPath: 'polygon(100% 0, 100% 100%, 50% 50%)' }} />
                    {/* Yellow Triangle (Bottom) */}
                    <div className="absolute top-0 left-0 w-full h-full bg-[#ffcc00]" style={{ clipPath: 'polygon(0 100%, 100% 100%, 50% 50%)' }} />
                </div>
            </div>

            {/* Render Tokens */}
            {players && Object.keys(players).map(uid => {
                const p = players[uid]
                if (!p || !p.tokens) return null
                return p.tokens.map((token) => (
                    <LudoToken
                        key={`${p.color}-${token.id}`}
                        token={token}
                        color={p.color}
                        myColor={myColor}
                        isMyTurn={isMyTurn}
                        diceValue={diceValue}
                        onTokenClick={onTokenClick}
                    />
                ))
            })}
        </div>
    )
}

function LudoToken({ token, color, myColor, isMyTurn, diceValue, onTokenClick }: {
    token: Token,
    color: PlayerColor,
    myColor: PlayerColor | null,
    isMyTurn: boolean,
    diceValue: number | null,
    onTokenClick: (id: number) => void
}) {
    if (token.status === 'home') return null

    const controls = useAnimation()
    const prevPosition = useRef(token.position)

    const [row, col] = getGridCoordinates(color, token.position, token.status, token.id)
    const isMyToken = myColor === color
    const canMove = isMyToken && isMyTurn && diceValue !== null && (
        (token.status === 'base' && diceValue === 6) ||
        (token.status === 'active' && token.position + diceValue <= 57)
    )

    useEffect(() => {
        const animateMove = async () => {
            // If moving from base to start (0)
            if (prevPosition.current === -1 && token.position === 0) {
                await controls.start({
                    top: `${(row / 15) * 100}%`,
                    left: `${(col / 15) * 100}%`,
                    scale: [1, 1.5, 1],
                    transition: { duration: 0.5 }
                })
            }
            // If moving forward on board
            else if (token.position > prevPosition.current && token.status === 'active') {
                const startPos = prevPosition.current
                const endPos = token.position

                // Animate through each step
                for (let i = startPos + 1; i <= endPos; i++) {
                    const [r, c] = getGridCoordinates(color, i, 'active', token.id)
                    await controls.start({
                        top: `${(r / 15) * 100}%`,
                        left: `${(c / 15) * 100}%`,
                        scale: [1, 1.3, 1], // Jump effect
                        transition: { duration: 0.3 }
                    })
                }
            }
            // Normal update (e.g. initial render or teleport)
            else {
                controls.start({
                    top: `${(row / 15) * 100}%`,
                    left: `${(col / 15) * 100}%`,
                    transition: { duration: 0.3 }
                })
            }
            prevPosition.current = token.position
        }

        animateMove()
    }, [token.position, token.status, row, col, color, token.id, controls])

    return (
        <motion.button
            animate={controls}
            initial={{
                top: `${(row / 15) * 100}%`,
                left: `${(col / 15) * 100}%`,
            }}
            className={cn(
                "absolute w-[6.66%] h-[6.66%] flex items-center justify-center z-10",
                canMove ? "cursor-pointer hover:scale-110" : "cursor-default"
            )}
            onClick={() => {
                if (canMove) onTokenClick(token.id)
            }}
            disabled={!canMove}
        >
            <div className={cn(
                "w-[90%] h-[90%] border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all",
                color === 'red' && "bg-[#ff3333]",
                color === 'green' && "bg-[#33cc33]",
                color === 'yellow' && "bg-[#ffcc00]",
                color === 'blue' && "bg-[#3366ff]",
                canMove && "ring-2 ring-white ring-offset-2 ring-offset-black/50 animate-pulse"
            )}>
                {/* Inner pixel for detail */}
                <div className="w-1/2 h-1/2 bg-black/20 mx-auto mt-1" />
            </div>
        </motion.button>
    )
}
