"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/Button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { toast } from "sonner"
import { useAppSelector } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { SnakeLaddersBoard } from "./SnakeLaddersBoard"
import { motion, AnimatePresence } from "framer-motion"
import { Trophy } from "lucide-react"
import { WinnerOverlay } from "@/components/game/WinnerOverlay"
import { useRouter } from "next/navigation"
import { Chat } from "@/components/shared/Chat"

interface SnakeLaddersProps {
    roomId: string
    matchId: string
    initialState?: any
    onRestart?: () => void
    onBackToLobby?: () => void
    isHost?: boolean
}

type PlayerColor = 'red' | 'green' | 'yellow' | 'blue'
type GameState = {
    players: { [key: string]: { color: PlayerColor; position: number; intermediatePosition?: number } }
    currentTurn: PlayerColor
    diceValue: number | null
    winner: PlayerColor | null
    boardConfig: {
        snakes: { [key: number]: { end: number, assetId: number } }
        ladders: { [key: number]: { end: number, assetId: number } }
    }
}

const COLORS: PlayerColor[] = ['red', 'green', 'yellow', 'blue']

function getStaticBoard() {
    return {
        snakes: {
            99: { end: 82, assetId: 0 },
            88: { end: 71, assetId: 0 },
            76: { end: 43, assetId: 0 },
            69: { end: 49, assetId: 0 },
            68: { end: 51, assetId: 0 },
            63: { end: 38, assetId: 0 },
            33: { end: 14, assetId: 0 },
            22: { end: 18, assetId: 0 },
            10: { end: 6, assetId: 0 }
        },
        ladders: {
            4: { end: 16, assetId: 0 },
            17: { end: 37, assetId: 0 },
            21: { end: 60, assetId: 0 },
            26: { end: 35, assetId: 0 },
            32: { end: 48, assetId: 0 },
            56: { end: 74, assetId: 0 },
            62: { end: 80, assetId: 0 },
            86: { end: 94, assetId: 0 }
        }
    }
}

export function SnakeLadders({ roomId, matchId, initialState, onRestart, onBackToLobby, isHost }: SnakeLaddersProps) {
    const [gameState, setGameState] = useState<GameState>(() => {
        const defaultState: GameState = {
            players: {},
            currentTurn: 'red',
            diceValue: null,
            winner: null,
            boardConfig: getStaticBoard()
        }
        if (!initialState) return defaultState

        // Merge provided initialState with default to ensure boardConfig exists
        return {
            ...defaultState,
            ...initialState,
            boardConfig: initialState.boardConfig || defaultState.boardConfig
        }
    })
    const [myColor, setMyColor] = useState<PlayerColor | null>(null)
    const [isRolling, setIsRolling] = useState(false)
    const [playersInfo, setPlayersInfo] = useState<{ [key: string]: { name: string, avatar?: string } }>({})
    const [showRules, setShowRules] = useState(false)
    const [showChat, setShowChat] = useState(false)
    const currentUser = useAppSelector((state) => state.auth.user)
    const supabase = createClient()
    const router = useRouter()

    useEffect(() => {
        async function initGame() {
            // Fetch room details to get AI count
            const { data: room } = await supabase
                .from("rooms")
                .select("ai_players")
                .eq("id", roomId)
                .single()

            const { data: roomPlayers } = await supabase
                .from("room_players")
                .select("user_id, seat, user:users(display_name, avatar_url)")
                .eq("room_id", roomId)
                .order("seat", { ascending: true })

            if (roomPlayers) {
                const newPlayers: any = {}
                const newPlayersInfo: any = {}
                let seatIndex = 0

                // Add Real Players
                roomPlayers.forEach((p: any) => {
                    const color = COLORS[seatIndex % 4]
                    newPlayers[p.user_id] = {
                        color,
                        position: 0
                    }
                    newPlayersInfo[p.user_id] = {
                        name: p.user?.display_name || "Unknown",
                        avatar: p.user?.avatar_url
                    }
                    if (p.user_id === currentUser?.id) {
                        setMyColor(color)
                    }
                    seatIndex++
                })

                // Add AI Players
                const aiCount = room?.ai_players || 0
                for (let i = 0; i < aiCount; i++) {
                    if (seatIndex >= 4) break
                    const color = COLORS[seatIndex % 4]
                    const aiKey = `ai-${i}`
                    newPlayers[aiKey] = {
                        color,
                        position: 0
                    }
                    newPlayersInfo[aiKey] = {
                        name: `Bot ${i + 1}`
                    }
                    seatIndex++
                }

                setPlayersInfo(newPlayersInfo)

                // Only set state if empty (first load)
                if (Object.keys(gameState.players).length === 0) {
                    // Use static board config
                    const boardConfig = initialState?.boardConfig || getStaticBoard()

                    setGameState(prev => ({
                        ...prev,
                        players: newPlayers,
                        boardConfig
                    }))

                    // If we generated it, we should save it immediately? 
                    // The `updateGameState` usually happens on moves. 
                    // Let's trigger an update if we are the host.
                    if (!initialState?.boardConfig && roomPlayers[0]?.user_id === currentUser?.id) {
                        // We are host, save the initial state
                        const initialStateToSave = {
                            players: newPlayers,
                            currentTurn: 'red',
                            diceValue: null,
                            winner: null,
                            boardConfig
                        }
                        // We can't call updateGameState here easily because it depends on state.
                        // But we can call supabase directly.
                        await supabase
                            .from("matches")
                            .update({ result_json: initialStateToSave })
                            .eq("id", matchId)
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
    }, [matchId, roomId, supabase, currentUser])

    // AI Logic
    useEffect(() => {
        if (!currentUser || gameState.winner || !gameState.players) return

        const currentTurnColor = gameState.currentTurn

        // Find the player key for the current turn
        const currentPlayerKey = Object.keys(gameState.players).find(key => gameState.players[key].color === currentTurnColor)

        // Check if it's an AI player (key starts with 'ai-')
        const isAI = currentPlayerKey?.startsWith('ai-')

        // Host handles AI
        const amIHost = myColor === 'red' // Assuming host is always red/first player for now

        if (isAI && amIHost && !gameState.diceValue && !isRolling) {
            const timer = setTimeout(() => {
                handleAITurn()
            }, 1000)
            return () => clearTimeout(timer)
        }
    }, [gameState, myColor, currentUser, isRolling])

    async function handleAITurn() {
        if (gameState.diceValue || isRolling) return // Prevent double roll

        const currentTurnColor = gameState.currentTurn
        const aiPlayerKey = Object.keys(gameState.players).find(key => gameState.players[key].color === currentTurnColor)
        if (!aiPlayerKey) return

        setIsRolling(true)
        await new Promise(resolve => setTimeout(resolve, 1000))
        setIsRolling(false)

        const roll = Math.floor(Math.random() * 6) + 1
        const currentPos = gameState.players[aiPlayerKey].position
        let newPosition = currentPos + roll

        // EXACT WIN LOGIC
        if (newPosition > 100) {
            // Pass turn without moving
            const step1State = {
                ...gameState,
                diceValue: roll,
                currentTurn: currentTurnColor // Keep turn same so we see the result
            }
            await updateGameState(step1State)

            // Switch Turn after delay
            setTimeout(async () => {
                const step2State = {
                    ...step1State,
                    diceValue: null, // Reset dice
                    currentTurn: getNextTurn(currentTurnColor)
                }
                await updateGameState(step2State)
            }, 1500)
            return
        }

        let finalPosition = newPosition
        let intermediatePosition: number | undefined = undefined

        if (gameState.boardConfig.snakes[newPosition]) {
            intermediatePosition = newPosition
            finalPosition = gameState.boardConfig.snakes[newPosition].end
        } else if (gameState.boardConfig.ladders[newPosition]) {
            intermediatePosition = newPosition
            finalPosition = gameState.boardConfig.ladders[newPosition].end
        }

        const newWinner = finalPosition === 100 ? currentTurnColor : null

        // Step 1: Show Roll and Move
        const step1State = {
            ...gameState,
            players: {
                ...gameState.players,
                [aiPlayerKey]: {
                    ...gameState.players[aiPlayerKey],
                    position: finalPosition,
                    intermediatePosition
                }
            },
            diceValue: roll,
            winner: newWinner,
            currentTurn: currentTurnColor // Keep turn same so we see the result
        }

        await updateGameState(step1State)

        if (newWinner) return // Game over

        // Step 2: Switch Turn after delay
        // Calculate delay based on roll (600ms per step + buffer)
        const delay = roll * 600 + 1000
        setTimeout(async () => {
            const step2State = {
                ...step1State,
                diceValue: null, // Reset dice
                currentTurn: getNextTurn(currentTurnColor)
            }
            await updateGameState(step2State)
        }, delay)
    }

    const isMyTurn = myColor === gameState.currentTurn

    async function rollDice() {
        if (!isMyTurn || gameState.diceValue || !currentUser || isRolling) return

        setIsRolling(true)
        await new Promise(resolve => setTimeout(resolve, 1000))
        setIsRolling(false)

        const roll = Math.floor(Math.random() * 6) + 1

        // Find my player state
        const userId = Object.keys(gameState.players).find(key => gameState.players[key].color === gameState.currentTurn)
        if (!userId) return

        const currentPos = gameState.players[userId].position
        let newPosition = currentPos + roll

        // EXACT WIN LOGIC
        if (newPosition > 100) {
            toast.info(`You need exactly ${100 - currentPos} to win!`)

            // Pass turn without moving
            const step1State = {
                ...gameState,
                diceValue: roll,
                currentTurn: gameState.currentTurn
            }
            await updateGameState(step1State)

            // Switch Turn after delay
            setTimeout(async () => {
                const step2State = {
                    ...step1State,
                    diceValue: null,
                    currentTurn: getNextTurn(gameState.currentTurn)
                }
                await updateGameState(step2State)
            }, 1500)
            return
        }

        let finalPosition = newPosition
        let intermediatePosition: number | undefined = undefined

        // Check snakes and ladders
        if (gameState.boardConfig.snakes[newPosition]) {
            intermediatePosition = newPosition
            finalPosition = gameState.boardConfig.snakes[newPosition].end
            toast.info("Oh no! A snake!")
        } else if (gameState.boardConfig.ladders[newPosition]) {
            intermediatePosition = newPosition
            finalPosition = gameState.boardConfig.ladders[newPosition].end
            toast.success("Yay! A ladder!")
        }

        const newWinner = finalPosition === 100 ? gameState.currentTurn : null

        // Step 1: Show Roll and Move
        const step1State = {
            ...gameState,
            players: {
                ...gameState.players,
                [userId]: {
                    ...gameState.players[userId],
                    position: finalPosition,
                    intermediatePosition
                }
            },
            diceValue: roll,
            winner: newWinner,
            currentTurn: gameState.currentTurn // Keep turn same
        }

        await updateGameState(step1State)

        if (newWinner) return

        // Step 2: Switch Turn after delay
        // Calculate delay based on roll (600ms per step + buffer)
        const delay = roll * 600 + 1000
        setTimeout(async () => {
            const step2State = {
                ...step1State,
                diceValue: null,
                currentTurn: getNextTurn(gameState.currentTurn)
            }
            await updateGameState(step2State)
        }, delay)
    }

    function getNextTurn(current: PlayerColor): PlayerColor {
        // Get all active colors from players
        const activeColors = Object.values(gameState.players).map(p => p.color)

        // Sort them according to the standard order to ensure consistent rotation
        const sortedActiveColors = COLORS.filter(c => activeColors.includes(c))

        const currentIdx = sortedActiveColors.indexOf(current)
        if (currentIdx === -1) return sortedActiveColors[0] || 'red' // Fallback

        return sortedActiveColors[(currentIdx + 1) % sortedActiveColors.length]
    }

    async function updateGameState(newState: GameState) {
        setGameState(newState)
        await supabase
            .from("matches")
            .update({
                result_json: newState,
                winner_ids: newState.winner ? [Object.keys(gameState.players).find(key => gameState.players[key].color === newState.winner)] : null,
                ended_at: newState.winner ? new Date().toISOString() : null
            })
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

    const PlayerCard = ({ player, seat, isCurrentTurn, diceValue, assignedColor }: { player?: any, seat: number, isCurrentTurn: boolean, diceValue: number | null, assignedColor: string }) => {
        // If no player in this seat, render a placeholder to keep layout but make it invisible/subtle
        if (!player) {
            return <div className="w-48 p-2 opacity-0 pointer-events-none" />
        }

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

        const [shufflingDice, setShufflingDice] = useState(1)

        useEffect(() => {
            if (isCurrentTurn && isRolling) {
                const interval = setInterval(() => {
                    setShufflingDice(Math.floor(Math.random() * 6) + 1)
                }, 100)
                return () => clearInterval(interval)
            }
        }, [isCurrentTurn])

        return (
            <div className={cn(
                "w-20 md:w-48 p-1 md:p-2 border-2 md:border-4 border-black bg-[#e6d5aa] shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)] md:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] transition-all",
                isCurrentTurn && "scale-105 ring-2 md:ring-4 ring-white"
            )}>
                <div className={cn("w-full aspect-square border-2 md:border-4 border-black mb-1 md:mb-2 relative overflow-hidden flex items-center justify-center", colorClass)}>
                    {isCurrentTurn ? (
                        <div className="w-full h-full bg-yellow-400 border-2 md:border-4 border-black flex items-center justify-center relative">
                            <span className="text-3xl md:text-8xl font-retro-heading text-red-600">
                                {isRolling ? shufflingDice : (diceValue || "🎲")}
                            </span>
                        </div>
                    ) : (
                        /* Avatar Placeholder */
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-8 h-8 md:w-16 md:h-16 bg-black/20 rounded-full" />
                        </div>
                    )}
                </div>
                <div className="bg-black/10 p-0.5 md:p-1 mb-0.5 md:mb-1 text-center border md:border-2 border-black/20">
                    <span className="font-retro-heading text-[10px] md:text-sm text-black truncate px-0.5 block">{name}</span>
                </div>
                <div className="bg-[#8b4513] p-0.5 md:p-1 text-center border md:border-2 border-black text-white font-retro-heading text-xs md:text-base">
                    Pos: {player.position}
                </div>
            </div>
        )
    }

    const getPlayerByColor = (color: string) => {
        if (!gameState?.players) return undefined
        const playerId = Object.keys(gameState.players).find(k => gameState.players[k].color === color)
        return playerId ? gameState.players[playerId] : undefined
    }

    return (
        <div className="relative w-full h-screen overflow-hidden bg-[#87CEEB] font-retro-body select-none">
            {/* Background Elements */}
            <div className="absolute inset-0 pointer-events-none">
                <img
                    src="/pixel-forest-bg-snakes.png"
                    alt="Pixel Forest Background"
                    className="w-full h-full object-cover"
                    style={{ imageRendering: 'pixelated' }}
                />
            </div>

            {/* Top Bar */}
            <div className="absolute top-0 left-0 right-0 p-2 md:p-4 z-20 flex justify-between items-center bg-black/20 backdrop-blur-sm">
                <h1 className="text-xl md:text-4xl text-yellow-400 font-retro-heading pixel-text-shadow tracking-wider">
                    SNAKE & LADDERS
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
                    <PlayerCard
                        seat={0}
                        player={getPlayerByColor('red')}
                        isCurrentTurn={gameState.currentTurn === 'red'}
                        diceValue={gameState.diceValue}
                        assignedColor="red"
                    />
                    <PlayerCard
                        seat={2}
                        player={getPlayerByColor('yellow')}
                        isCurrentTurn={gameState.currentTurn === 'yellow'}
                        diceValue={gameState.diceValue}
                        assignedColor="yellow"
                    />
                </div>

                {/* Center Board */}
                <div className="relative order-2 lg:order-2 transform scale-[0.65] sm:scale-[0.85] md:scale-100 origin-center transition-transform z-0 mt-2 lg:mt-0">
                    <SnakeLaddersBoard
                        players={gameState.players}
                        snakes={gameState.boardConfig?.snakes || getStaticBoard().snakes}
                        ladders={gameState.boardConfig?.ladders || getStaticBoard().ladders}
                    />
                </div>

                {/* Bottom Row (Mobile) / Right Column (Desktop) */}
                <div className="flex flex-row lg:flex-col gap-2 lg:gap-8 order-3 lg:order-3 w-full lg:w-auto justify-center px-2">
                    <PlayerCard
                        seat={1}
                        player={getPlayerByColor('green')}
                        isCurrentTurn={gameState.currentTurn === 'green'}
                        diceValue={gameState.diceValue}
                        assignedColor="green"
                    />
                    <PlayerCard
                        seat={3}
                        player={getPlayerByColor('blue')}
                        isCurrentTurn={gameState.currentTurn === 'blue'}
                        diceValue={gameState.diceValue}
                        assignedColor="blue"
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
                    disabled={!isMyTurn || !!gameState.diceValue || !!gameState.winner}
                >
                    ROLL DICE
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
        </div>
    )
}
