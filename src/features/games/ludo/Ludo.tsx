"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/Button"
import { toast } from "sonner"
import { useAppSelector } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { LudoBoard } from "./LudoBoard"
import { checkCapture, getGlobalIndex, isSafeZone } from "./ludoUtils"
import { AnimatePresence, motion } from "framer-motion"
import { WinnerOverlay } from "@/components/game/WinnerOverlay"
import { Dice } from "./Dice"
import { useRouter } from "next/navigation"
import { Chat } from "@/components/shared/Chat"

interface LudoProps {
    roomId: string
    matchId: string
    initialState?: any
    onRestart?: () => void
    onBackToLobby?: () => void
    isHost?: boolean
}

// Simplified Ludo State
type Token = { id: number; position: number; status: 'base' | 'active' | 'home' }
type PlayerColor = 'red' | 'green' | 'yellow' | 'blue'
type GameState = {
    players: { [key: string]: { color: PlayerColor; tokens: Token[] } }
    currentTurn: PlayerColor
    diceValue: number | null
    winner: PlayerColor | null
}

const COLORS: PlayerColor[] = ['red', 'green', 'yellow', 'blue']

export function Ludo({ roomId, matchId, initialState, onRestart, onBackToLobby, isHost }: LudoProps) {
    const [gameState, setGameState] = useState<GameState>(initialState || {
        players: {},
        currentTurn: 'red',
        diceValue: null,
        winner: null
    })
    const [myColor, setMyColor] = useState<PlayerColor | null>(null)
    const [isRolling, setIsRolling] = useState(false)
    const [playersInfo, setPlayersInfo] = useState<{ [key: string]: { name: string } }>({})
    const [showRules, setShowRules] = useState(false)
    const [showChat, setShowChat] = useState(false)
    const currentUser = useAppSelector((state) => state.auth.user)
    const supabase = createClient()
    const router = useRouter()

    useEffect(() => {
        if (currentUser && gameState.players) {
            const myPlayerKey = Object.keys(gameState.players).find(key => key === currentUser.id)
            if (myPlayerKey) {
                setMyColor(gameState.players[myPlayerKey].color)
            }
        }
    }, [gameState.players, currentUser])

    useEffect(() => {
        // Assign colors based on seat
        async function initGame() {
            // Fetch room details to get AI count
            const { data: room } = await supabase
                .from("rooms")
                .select("ai_players")
                .eq("id", roomId)
                .single()

            const { data: roomPlayers } = await supabase
                .from("room_players")
                .select("user_id, seat, selected_color, user:users(display_name)")
                .eq("room_id", roomId)
                .order("seat", { ascending: true })

            if (roomPlayers) {
                const newPlayers: any = {}
                const availableColors = [...COLORS]
                const playerAssignments: { [key: string]: PlayerColor } = {}

                // 1. Assign selected colors first
                roomPlayers.forEach(p => {
                    if (p.selected_color && availableColors.includes(p.selected_color as PlayerColor)) {
                        playerAssignments[p.user_id] = p.selected_color as PlayerColor
                        const idx = availableColors.indexOf(p.selected_color as PlayerColor)
                        if (idx > -1) availableColors.splice(idx, 1)
                    }
                })

                // 2. Assign remaining colors to players without selection
                roomPlayers.forEach(p => {
                    if (!playerAssignments[p.user_id]) {
                        const color = availableColors.shift()
                        if (color) playerAssignments[p.user_id] = color
                    }
                })

                // 3. Create Player Objects
                const newPlayersInfo: any = {}
                roomPlayers.forEach((p: any) => {
                    const color = playerAssignments[p.user_id]
                    if (color) {
                        newPlayers[p.user_id] = {
                            color,
                            tokens: Array(4).fill(null).map((_, i) => ({ id: i, position: -1, status: 'base' }))
                        }
                        newPlayersInfo[p.user_id] = {
                            name: p.user?.display_name || `Player ${p.seat + 1}`
                        }
                    }
                })

                // 4. Add AI Players
                const aiCount = room?.ai_players || 0
                for (let i = 0; i < aiCount; i++) {
                    const color = availableColors.shift()
                    if (color) {
                        const aiKey = `ai-${i}`
                        newPlayers[aiKey] = {
                            color,
                            tokens: Array(4).fill(null).map((_, i) => ({ id: i, position: -1, status: 'base' }))
                        }
                        newPlayersInfo[aiKey] = {
                            name: `Bot ${i + 1}`
                        }
                    }
                }

                setPlayersInfo(newPlayersInfo)

                // Only set state if empty (first load)
                setPlayersInfo(newPlayersInfo)
                console.log("newPlayers constructed:", newPlayers)

                // Only set state if empty (first load)
                if (Object.keys(gameState.players).length === 0) {
                    // Determine starting turn (Player in Seat 0)
                    const firstPlayerId = roomPlayers[0]?.user_id
                    const firstColor = firstPlayerId ? newPlayers[firstPlayerId]?.color : 'red'

                    setGameState(prev => ({
                        ...prev,
                        players: newPlayers,
                        currentTurn: firstColor || 'red'
                    }))
                } else {
                    // Check for broken state (missing tokens) or color mismatch and repair
                    let hasChanges = false
                    const repairedPlayers = { ...gameState.players }

                    Object.keys(newPlayers).forEach(uid => {
                        const p = repairedPlayers[uid]
                        const newP = newPlayers[uid]

                        // Check if player exists and has valid tokens
                        const isValidTokens = p && p.tokens && Array.isArray(p.tokens) && p.tokens.length === 4 && p.tokens.every((t: any) => t && typeof t.id === 'number' && typeof t.position === 'number' && t.status)
                        // Check if color matches lobby selection
                        const isColorMatch = p && p.color === newP.color

                        if (!isValidTokens || !isColorMatch) {
                            console.log(`Repairing player ${uid}...`, { isValidTokens, isColorMatch, oldColor: p?.color, newColor: newP.color })
                            repairedPlayers[uid] = {
                                ...newP // Reset to new state (correct color & fresh tokens)
                            }
                            hasChanges = true
                        }
                    })

                    if (hasChanges) {
                        console.log("Game state repaired. Updating...", repairedPlayers)
                        let nextTurn = gameState.currentTurn

                        // Check if current turn color still belongs to a player
                        const isCurrentTurnValid = Object.values(repairedPlayers).some((p: any) => p.color === nextTurn)

                        // Check if game is fresh (all tokens at base)
                        const isFreshGame = Object.values(repairedPlayers).every((p: any) =>
                            p.tokens.every((t: any) => t.status === 'base')
                        )

                        if (!isCurrentTurnValid || isFreshGame) {
                            // Reset turn to Seat 0
                            const firstPlayerId = roomPlayers[0]?.user_id
                            if (firstPlayerId && repairedPlayers[firstPlayerId]) {
                                nextTurn = repairedPlayers[firstPlayerId].color
                            }
                        }

                        const newState = { ...gameState, players: repairedPlayers, currentTurn: nextTurn }
                        setGameState(newState)
                        await updateGameState(newState)
                    }
                }
            }
        }
        initGame()

        const channel = supabase
            .channel(`match:${matchId}`)
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "matches",
                    filter: `id=eq.${matchId}`,
                },
                (payload) => {
                    if (payload.new.result_json) {
                        setGameState(payload.new.result_json)
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [matchId, roomId, supabase, currentUser, initialState])

    // AI Logic
    useEffect(() => {
        if (!currentUser || gameState.winner || !gameState.players) return

        const currentTurnColor = gameState.currentTurn
        const currentPlayerId = Object.keys(gameState.players).find(key => gameState.players[key].color === currentTurnColor)
        const isAI = currentPlayerId?.startsWith('ai-')

        // Host handles AI
        if (isAI && isHost) {
            const timer = setTimeout(() => {
                handleAITurn()
            }, 1000)
            return () => clearTimeout(timer)
        }
    }, [gameState, myColor, currentUser, isHost])

    async function handleAITurn() {
        // 1. Roll Dice
        if (!gameState.diceValue) {
            setIsRolling(true)
            await new Promise(resolve => setTimeout(resolve, 1000))
            const roll = Math.floor(Math.random() * 6) + 1
            setIsRolling(false)

            // Check moves
            const currentTurnColor = gameState.currentTurn
            const aiPlayerKey = Object.keys(gameState.players).find(key => gameState.players[key].color === currentTurnColor)
            if (!aiPlayerKey) return

            const hasMoves = checkPossibleMoves(gameState.players[aiPlayerKey].tokens, roll)

            if (!hasMoves) {
                const newState = {
                    ...gameState,
                    diceValue: null, // Reset dice for next player
                    currentTurn: getNextTurn(gameState.currentTurn)
                }
                await updateGameState(newState)
                return
            }

            const newState = { ...gameState, diceValue: roll }
            await updateGameState(newState)
            // Wait a bit before moving
            setTimeout(() => handleAIMove(roll), 1000)
        } else {
            handleAIMove(gameState.diceValue)
        }
    }



    async function handleAIMove(roll: number) {
        const currentTurnColor = gameState.currentTurn
        const aiPlayerKey = Object.keys(gameState.players).find(key => gameState.players[key].color === currentTurnColor)
        if (!aiPlayerKey) return

        const player = gameState.players[aiPlayerKey]
        const tokens = player.tokens

        // Find all legal moves
        const legalMoves: { tokenIndex: number, score: number }[] = []

        tokens.forEach((t, i) => {
            let canMove = false
            let newPos = t.position

            if (t.status === 'base') {
                if (roll === 6) {
                    canMove = true
                    newPos = 0
                }
            } else if (t.status === 'active') {
                if (t.position + roll <= 56) {
                    canMove = true
                    newPos = t.position + roll
                }
            }

            if (canMove) {
                const score = calculateMoveScore(player.color, t, newPos, roll, gameState)
                legalMoves.push({ tokenIndex: i, score })
            }
        })

        if (legalMoves.length === 0) {
            // No moves
            const newState = {
                ...gameState,
                diceValue: null,
                currentTurn: getNextTurn(gameState.currentTurn)
            }
            await updateGameState(newState)
            return
        }

        // Sort by score desc
        legalMoves.sort((a, b) => b.score - a.score)

        // Pick best
        const bestMove = legalMoves[0]
        await executeMove(aiPlayerKey, bestMove.tokenIndex, roll)
    }

    function calculateMoveScore(color: PlayerColor, token: Token, newPos: number, roll: number, currentState: GameState) {
        let score = 0
        const newGlobal = getGlobalIndex(color, newPos)
        const progress = newPos / 56 // 0 to 1

        // 1. Kill (+400) - Huge priority
        const capture = checkCapture(currentState.players, color, newGlobal)
        if (capture) score += 400

        // 2. Finish (+500) - Top priority
        if (newPos === 56) score += 500

        // 3. Move out with 6 (+150) - Important to get pieces on board
        if (token.status === 'base' && roll === 6) score += 150

        // 4. Safe Tile (+60)
        if (isSafeZone(newGlobal)) score += 60

        // 5. Progress (Scaled)
        // More valuable to move pieces that are closer to home, but not at risk
        const dist = 56 - newPos
        if (dist <= 10) score += 50 + (10 - dist) * 5 // Extra points for every step closer in home stretch
        else score += newPos // General progress points

        // Danger Checks
        const wasInDanger = isPositionInDanger(color, token.position, currentState.players)
        const willBeInDanger = isPositionInDanger(color, newPos, currentState.players)

        // 6. Escape Danger (+200) / Still in Danger (-100 to -300)
        if (token.status === 'active') {
            if (wasInDanger && !willBeInDanger) {
                // Saving a piece that is far advanced is more important
                score += 200 + (progress * 200)
            }
            if (willBeInDanger) {
                // Risking a piece that is far advanced is very bad
                score -= 100 + (progress * 300)
            }
        }

        // 7. Hunting (+40)
        // If we land 1-6 steps behind an opponent, that's good pressure
        if (!willBeInDanger) {
            const isHunting = isHuntingOpponent(color, newGlobal, currentState.players)
            if (isHunting) score += 40
        }

        // 8. Stacking (+30 / -50)
        const myPlayerKey = Object.keys(currentState.players).find(k => currentState.players[k].color === color)
        if (myPlayerKey) {
            const isStacking = currentState.players[myPlayerKey].tokens.some(t => t.status === 'active' && t.position === newPos && t.id !== token.id)
            if (isStacking) {
                if (isSafeZone(newGlobal)) score += 30 // Good to stack on safe
                else score -= 50 // Bad to stack on unsafe (double kill risk)
            }
        }

        // Random variation (+1 to +10) to break ties and feel organic
        score += Math.random() * 10

        return score
    }

    function isHuntingOpponent(myColor: PlayerColor, myGlobalPos: number, players: any): boolean {
        if (myGlobalPos === -1) return false

        for (const pid in players) {
            const p = players[pid]
            if (p.color === myColor) continue
            for (const t of p.tokens) {
                if (t.status !== 'active') continue
                const oppGlobal = getGlobalIndex(p.color, t.position)
                if (oppGlobal === -1) continue

                // Check if opponent is 1-6 steps ahead
                // (opp - my + 52) % 52
                const dist = (oppGlobal - myGlobalPos + 52) % 52
                if (dist >= 1 && dist <= 6) return true
            }
        }
        return false
    }

    function isPositionInDanger(myColor: PlayerColor, myPos: number, players: any): boolean {
        const myGlobal = getGlobalIndex(myColor, myPos)
        if (myGlobal === -1) return false // Home or base
        if (isSafeZone(myGlobal)) return false // Safe zones are not dangerous

        for (const pid in players) {
            const p = players[pid]
            if (p.color === myColor) continue
            for (const t of p.tokens) {
                if (t.status !== 'active') continue
                const oppGlobal = getGlobalIndex(p.color, t.position)
                if (oppGlobal === -1) continue

                // Check distance: (my - opp + 52) % 52
                // If result is 1-6, they are behind us
                const dist = (myGlobal - oppGlobal + 52) % 52
                if (dist >= 1 && dist <= 6) return true
            }
        }
        return false
    }

    function checkPossibleMoves(tokens: Token[], roll: number): boolean {
        if (!tokens) return false
        return tokens.some(t => {
            if (t.status === 'base') return roll === 6
            if (t.status === 'active') return t.position + roll <= 56
            return false
        })
    }

    const isMyTurn = myColor === gameState.currentTurn

    async function rollDice() {
        console.log("rollDice called", { isMyTurn, diceValue: gameState.diceValue, isRolling })
        if (!isMyTurn || gameState.diceValue || isRolling) return

        setIsRolling(true)
        console.log("Rolling started")

        // Simulate rolling delay
        // setTimeout(async () => {
        console.log("Rolling finished")
        const roll = Math.floor(Math.random() * 6) + 1
        setIsRolling(false)

        // Check if any moves are possible
        const userId = Object.keys(gameState.players).find(key => gameState.players[key].color === gameState.currentTurn)
        if (!userId) return

        const hasMoves = checkPossibleMoves(gameState.players[userId].tokens, roll)

        if (!hasMoves) {
            toast.error(`Rolled a ${roll}. No moves possible!`)
            const newState = {
                ...gameState,
                diceValue: null, // Reset dice
                currentTurn: getNextTurn(gameState.currentTurn)
            }
            await updateGameState(newState)
        } else {
            // Update state with dice roll
            const newState = { ...gameState, diceValue: roll }
            await updateGameState(newState)
        }
        // }, 1000)
    }

    async function moveToken(tokenIndex: number) {
        if (!isMyTurn || !gameState.diceValue || !currentUser) return

        const userId = Object.keys(gameState.players).find(key => gameState.players[key].color === gameState.currentTurn)
        if (!userId || userId !== currentUser.id) return

        await executeMove(userId, tokenIndex, gameState.diceValue)
    }

    async function executeMove(userId: string, tokenIndex: number, roll: number) {
        const player = gameState.players[userId]
        const tokens = [...player.tokens]
        const token = { ...tokens[tokenIndex] }
        let captured = false

        if (token.status === 'base') {
            if (roll === 6) {
                token.status = 'active'
                token.position = 0 // Start position relative to color
            } else {
                return // Cannot move
            }
        } else if (token.status === 'active') {
            if (token.position + roll > 56) return // Cannot move

            token.position += roll
            if (token.position === 56) { // Home
                token.status = 'home'
            } else {
                // Check Capture
                const globalPos = getGlobalIndex(player.color, token.position)
                const capture = checkCapture(gameState.players, player.color, globalPos)

                if (capture) {
                    // Reset opponent token
                    const opponent = gameState.players[capture.userId]
                    const oppTokens = [...opponent.tokens]
                    oppTokens[capture.tokenIndex] = { ...oppTokens[capture.tokenIndex], status: 'base', position: -1 }

                    // Update opponent state immediately in our local copy before final update
                    gameState.players[capture.userId] = { ...opponent, tokens: oppTokens }
                    captured = true
                    toast.success("Captured!")
                }
            }
        }

        tokens[tokenIndex] = token

        // Update state
        const newState = {
            ...gameState,
            players: {
                ...gameState.players,
                [userId]: { ...player, tokens }
            },
            diceValue: null,
            // If 6 or captured, roll again (keep turn)
            currentTurn: (roll === 6 || captured) ? gameState.currentTurn : getNextTurn(gameState.currentTurn)
        }

        // Check Win
        if (tokens.every(t => t.status === 'home')) {
            newState.winner = player.color
        }

        await updateGameState(newState)
    }

    function getNextTurn(current: PlayerColor): PlayerColor {
        const idx = COLORS.indexOf(current)
        let nextIdx = (idx + 1) % COLORS.length

        // Loop until we find a color that has a player
        while (!Object.values(gameState.players).some(p => p.color === COLORS[nextIdx])) {
            nextIdx = (nextIdx + 1) % COLORS.length
            // Safety break to avoid infinite loop
            if (nextIdx === idx) break
        }

        return COLORS[nextIdx]
    }
    async function updateGameState(newState: GameState) {
        setGameState(newState) // Optimistic
        await supabase
            .from("matches")
            .update({ result_json: newState })
            .eq("id", matchId)
    }

    // Helper Components
    const PixelButton = ({ children, onClick, className, disabled }: any) => (
        <button
            onClick={onClick}
            disabled={disabled}
            className={cn(
                "px-6 py-2 bg-[#8b4513] border-4 border-black text-white font-retro-heading text-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed",
                className
            )}
        >
            {children}
        </button>
    )

    const PlayerCard = ({ player, seat, isCurrentTurn, diceValue, isRolling, assignedColor }: { player?: any, seat: number, isCurrentTurn: boolean, diceValue: number | null, isRolling: boolean, assignedColor: string }) => {
        const colorMap: { [key: string]: string } = {
            red: 'bg-red-500',
            green: 'bg-green-500',
            yellow: 'bg-yellow-500',
            blue: 'bg-blue-500'
        }
        // Get name from playersInfo if available, otherwise fallback
        const playerId = Object.keys(gameState.players).find(k => gameState.players[k].color === assignedColor)
        const name = playerId ? (playersInfo[playerId]?.name || `Player ${seat + 1}`) : `Player ${seat + 1}`

        const colorClass = colorMap[assignedColor] || 'bg-gray-400'

        return (
            <div className={cn(
                "w-20 md:w-48 p-1 md:p-2 border-2 md:border-4 border-black bg-[#e6d5aa] shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)] md:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] transition-all",
                isCurrentTurn && "scale-105 ring-2 md:ring-4 ring-white"
            )}>
                <div className={cn("w-full aspect-square border-2 md:border-4 border-black mb-1 md:mb-2 relative overflow-hidden flex items-center justify-center", colorClass)}>
                    {isCurrentTurn ? (
                        <div className="w-full h-full bg-yellow-400 border-2 md:border-4 border-black flex items-center justify-center relative p-1 md:p-2">
                            <Dice
                                value={diceValue}
                                isRolling={isRolling}
                                onClick={() => { }}
                                disabled={true} // Only controlled by main button
                            />
                        </div>
                    ) : (
                        /* Avatar Placeholder */
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-8 h-8 md:w-16 md:h-16 bg-black/20 rounded-full" />
                        </div>
                    )}
                </div>
                <div className="bg-black/10 p-0.5 md:p-1 mb-0.5 md:mb-1 text-center border md:border-2 border-black/20">
                    <span className="font-retro-heading text-[10px] md:text-sm text-black truncate px-0.5 block">{player ? name : 'Empty'}</span>
                </div>
                <div className="bg-[#8b4513] p-0.5 md:p-1 text-center border md:border-2 border-black text-white font-retro-heading text-xs md:text-base">
                    {player?.tokens?.filter((t: any) => t.status === 'home').length || 0}
                </div>
            </div>
        )
    }

    const getPlayerByColor = (color: string) => {
        if (!gameState?.players) return undefined
        const playerId = Object.keys(gameState.players).find(k => gameState.players[k].color === color)
        return playerId ? gameState.players[playerId] : undefined
    }

    const getSlotColor = (slot: 'TL' | 'TR' | 'BL' | 'BR') => {
        // Default (Yellow/Spectator): TL=Red, TR=Green, BL=Yellow, BR=Blue
        let mapping = {
            TL: 'red', TR: 'green',
            BL: 'yellow', BR: 'blue'
        }

        if (myColor === 'red') {
            mapping = { TL: 'green', TR: 'blue', BL: 'red', BR: 'yellow' }
        } else if (myColor === 'green') {
            mapping = { TL: 'blue', TR: 'yellow', BL: 'green', BR: 'red' }
        } else if (myColor === 'blue') {
            mapping = { TL: 'yellow', TR: 'red', BL: 'blue', BR: 'green' }
        }
        return mapping[slot]
    }

    const getPlayerForSlot = (slot: 'TL' | 'TR' | 'BL' | 'BR') => {
        const color = getSlotColor(slot)
        return getPlayerByColor(color)
    }

    return (
        <div className="relative w-full h-screen overflow-hidden bg-[#87CEEB] font-retro-body select-none">
            {/* Background Elements */}
            <div className="absolute inset-0 pointer-events-none">
                <img
                    src="/pixel-forest-bg.png"
                    alt="Pixel Forest Background"
                    className="w-full h-full object-cover"
                    style={{ imageRendering: 'pixelated' }}
                />
            </div>

            {/* Top Bar */}
            <div className="absolute top-0 left-0 right-0 p-2 md:p-4 z-20 flex justify-between items-center bg-black/20 backdrop-blur-sm">
                <h1 className="text-xl md:text-4xl text-yellow-400 font-retro-heading pixel-text-shadow tracking-wider">
                    LUDO
                </h1>
                <div className="flex gap-2 md:gap-4">
                    {isHost && (
                        <PixelButton onClick={onBackToLobby} className="text-xs md:text-lg px-2 md:px-6 py-1 md:py-2">HOME</PixelButton>
                    )}
                    <PixelButton onClick={() => setShowRules(true)} className="text-xs md:text-lg px-2 md:px-6 py-1 md:py-2">RULES</PixelButton>
                    <PixelButton onClick={() => router.push('/')} className="text-xs md:text-lg px-2 md:px-6 py-1 md:py-2">EXIT</PixelButton>
                </div>
            </div>

            {/* ... Rules Modal ... */}

            {/* Main Game Area */}
            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-center h-full gap-2 lg:gap-12 pt-14 pb-20 lg:pt-16 lg:pb-20 overflow-hidden">
                {/* Top Row (Mobile) / Left Column (Desktop) */}
                <div className="flex flex-row lg:flex-col gap-2 lg:gap-8 order-1 lg:order-1 w-full lg:w-auto justify-center px-2 z-20">
                    {/* Top Left */}
                    <PlayerCard
                        seat={0}
                        player={getPlayerForSlot('TL')}
                        isCurrentTurn={gameState.currentTurn === getPlayerForSlot('TL')?.color}
                        diceValue={gameState.diceValue}
                        isRolling={isRolling}
                        assignedColor={getSlotColor('TL')}
                    />
                    {/* Top Right (Mobile) / Bottom Left (Desktop) - Adjusted for visual balance */}
                    <PlayerCard
                        seat={1}
                        player={getPlayerForSlot('TR')}
                        isCurrentTurn={gameState.currentTurn === getPlayerForSlot('TR')?.color}
                        diceValue={gameState.diceValue}
                        isRolling={isRolling}
                        assignedColor={getSlotColor('TR')}
                    />
                </div>

                {/* Center Board */}
                <div className="relative order-2 lg:order-2 transform scale-[0.65] sm:scale-[0.85] md:scale-100 origin-center transition-transform z-0 mt-2 lg:mt-0">
                    <LudoBoard
                        players={gameState.players}
                        currentTurn={gameState.currentTurn}
                        diceValue={gameState.diceValue}
                        onTokenClick={moveToken}
                        myColor={myColor}
                        isMyTurn={isMyTurn}
                    />
                </div>

                {/* Bottom Row (Mobile) / Right Column (Desktop) */}
                <div className="flex flex-row lg:flex-col gap-2 lg:gap-8 order-3 lg:order-3 w-full lg:w-auto justify-center px-2">
                    {/* Bottom Left (Mobile) / Top Right (Desktop) */}
                    <PlayerCard
                        seat={2}
                        player={getPlayerForSlot('BL')}
                        isCurrentTurn={gameState.currentTurn === getPlayerForSlot('BL')?.color}
                        diceValue={gameState.diceValue}
                        isRolling={isRolling}
                        assignedColor={getSlotColor('BL')}
                    />
                    {/* Bottom Right */}
                    <PlayerCard
                        seat={3}
                        player={getPlayerForSlot('BR')}
                        isCurrentTurn={gameState.currentTurn === getPlayerForSlot('BR')?.color}
                        diceValue={gameState.diceValue}
                        isRolling={isRolling}
                        assignedColor={getSlotColor('BR')}
                    />
                </div>
            </div>

            {/* Bottom Bar */}
            <div className="absolute bottom-0 left-0 right-0 p-2 lg:p-4 z-20 flex justify-center gap-4 lg:gap-8 bg-black/20 backdrop-blur-sm lg:bg-transparent lg:backdrop-blur-none">
                <PixelButton
                    className="w-32 lg:w-48 bg-[#5d4037] text-sm lg:text-lg"
                    onClick={() => setShowChat(true)}
                >
                    CHAT
                </PixelButton>
                <PixelButton
                    className="w-32 lg:w-48 bg-[#e65100] text-sm lg:text-lg"
                    onClick={rollDice}
                    disabled={!isMyTurn || !!gameState.diceValue || !!gameState.winner || isRolling}
                >
                    {isRolling ? "ROLLING..." : "ROLL DICE"}
                </PixelButton>
            </div>

            {/* Winner Overlay */}
            <AnimatePresence>
                {gameState.winner && (
                    <WinnerOverlay
                        winnerName={
                            Object.keys(gameState.players).find(k => gameState.players[k].color === gameState.winner)
                                ? (playersInfo[Object.keys(gameState.players).find(k => gameState.players[k].color === gameState.winner)!]?.name || "Unknown")
                                : "Unknown"
                        }
                        onBackToLobby={onBackToLobby}
                    />
                )}
            </AnimatePresence>

            {/* Chat Modal */}
            <AnimatePresence>
                {showChat && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 pointer-events-auto">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-[#e6d5aa] p-1 w-full max-w-md h-[60vh] pixel-border border-4 border-[#8b4513] shadow-2xl relative flex flex-col"
                        >
                            <div className="flex justify-between items-center p-2 border-b-2 border-[#8b4513] bg-[#d4c59a]">
                                <h2 className="text-lg font-retro-heading text-[#3e2723]">CHAT</h2>
                                <button
                                    onClick={() => setShowChat(false)}
                                    className="p-1 hover:bg-black/10 rounded font-retro-heading text-[#8b4513]"
                                >
                                    CLOSE
                                </button>
                            </div>
                            <Chat roomId={roomId} className="flex-1 p-2" />
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            {/* Debug Overlay */}
            <div className="absolute top-20 left-20 bg-black/80 text-white p-4 z-50 pointer-events-none">
                <p>My Color: {myColor}</p>
                <p>TL Slot: {getSlotColor('TL')}</p>
                <p>BL Slot: {getSlotColor('BL')}</p>
                <p>TR Slot: {getSlotColor('TR')}</p>
                <p>BR Slot: {getSlotColor('BR')}</p>
            </div>
        </div>
    )
}
