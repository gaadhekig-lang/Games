"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/Button"
import { toast } from "sonner"
import { useAppSelector } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { X, Circle, ArrowLeft } from "lucide-react"

import { AnimatePresence, motion } from "framer-motion"
import { WinnerOverlay } from "@/components/game/WinnerOverlay"
import { Chat } from "@/components/shared/Chat"

interface TicTacToeProps {
    roomId: string
    matchId: string
    initialState?: any
    onRestart?: () => void
    onBackToLobby?: () => void
    isHost?: boolean
}

type Player = "X" | "O"
type BoardState = (Player | null)[]

export function TicTacToe({ roomId, matchId, initialState, onRestart, onBackToLobby }: TicTacToeProps) {
    const [board, setBoard] = useState<BoardState>(initialState?.board || Array(9).fill(null))
    const [currentTurn, setCurrentTurn] = useState<Player>(initialState?.currentTurn || "X")
    const [winner, setWinner] = useState<Player | "DRAW" | null>(initialState?.winner || null)
    const [players, setPlayers] = useState<{ [key: string]: Player }>({})
    const [playersInfo, setPlayersInfo] = useState<{ [key: string]: { name: string } }>({})
    const [showChat, setShowChat] = useState(false)
    const currentUser = useAppSelector((state) => state.auth.user)
    const supabase = createClient()

    useEffect(() => {
        // Fetch players to assign X and O
        async function fetchPlayers() {
            const { data: room } = await supabase
                .from("rooms")
                .select("ai_players")
                .eq("id", roomId)
                .single()

            const { data: roomPlayers } = await supabase
                .from("room_players")
                .select("user_id, seat, user:users(display_name)")
                .eq("room_id", roomId)
                .order("seat", { ascending: true })

            if (roomPlayers) {
                const newPlayers: { [key: string]: Player } = {}
                const newPlayersInfo: any = {}
                let seatIndex = 0

                // Assign Real Players
                roomPlayers.forEach((p: any) => {
                    if (seatIndex === 0) newPlayers[p.user_id] = "X"
                    else if (seatIndex === 1) newPlayers[p.user_id] = "O"

                    newPlayersInfo[p.user_id] = {
                        name: p.user?.display_name || `Player ${seatIndex + 1}`
                    }
                    seatIndex++
                })

                // Assign AI Players
                const aiCount = room?.ai_players || 0
                for (let i = 0; i < aiCount; i++) {
                    if (seatIndex === 1) {
                        // AI is 'O' (Player 2)
                        // Logic handled in AI effect
                        newPlayersInfo['ai'] = { name: "Bot" }
                    }
                }

                const pMap: { [key: string]: Player } = {}
                if (roomPlayers.length > 0) pMap[roomPlayers[0].user_id] = "X"
                if (roomPlayers.length > 1) pMap[roomPlayers[1].user_id] = "O"

                setPlayers(pMap)
                setPlayersInfo(newPlayersInfo)
            }
        }
        fetchPlayers()

        // Subscribe to match updates
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
                    const newState = payload.new.result_json
                    if (newState) {
                        setBoard(newState.board)
                        setCurrentTurn(newState.currentTurn)
                        setWinner(newState.winner)
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [matchId, roomId, supabase])

    // AI Logic
    useEffect(() => {
        if (!currentUser || winner) return

        const mySymbol = players[currentUser.id]
        const isMyTurn = mySymbol === currentTurn

        // If it's NOT my turn, and the current turn belongs to an AI (not in players list)
        // Then I (as the host) should make the move for the AI
        const isAITurn = !Object.values(players).includes(currentTurn)

        // Only the host should execute AI moves to avoid conflicts
        const amIHost = mySymbol === 'X'

        if (isAITurn && amIHost && !winner) {
            const timer = setTimeout(() => {
                makeAIMove()
            }, 500) // Delay for realism
            return () => clearTimeout(timer)
        }
    }, [currentTurn, winner, currentUser, players])

    function makeAIMove() {
        // Simple AI: try to win, then block, then random
        const availableIndices = board.map((val, idx) => val === null ? idx : null).filter((val): val is number => val !== null)

        if (availableIndices.length === 0) return

        // Try to win
        for (let index of availableIndices) {
            const tempBoard = [...board]
            tempBoard[index] = currentTurn
            if (calculateWinner(tempBoard) === currentTurn) {
                handleMove(index, true)
                return
            }
        }

        // Block opponent
        const opponent = currentTurn === 'X' ? 'O' : 'X'
        for (let index of availableIndices) {
            const tempBoard = [...board]
            tempBoard[index] = opponent
            if (calculateWinner(tempBoard) === opponent) {
                handleMove(index, true)
                return
            }
        }

        // Random move
        const randomIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)]
        handleMove(randomIndex, true)
    }

    const mySymbol = currentUser ? players[currentUser.id] : null
    const isMyTurn = mySymbol === currentTurn && !winner

    async function handleMove(index: number, isAI: boolean = false) {
        if ((!isMyTurn && !isAI) || board[index] || winner) return

        const newBoard = [...board]
        newBoard[index] = currentTurn

        const nextTurn = currentTurn === "X" ? "O" : "X"
        const newWinner = calculateWinner(newBoard)

        // Optimistic update
        setBoard(newBoard)
        setCurrentTurn(nextTurn)
        if (newWinner) setWinner(newWinner)

        // Persist to DB
        const { error } = await supabase
            .from("matches")
            .update({
                result_json: {
                    board: newBoard,
                    currentTurn: nextTurn,
                    winner: newWinner,
                },
                winner_ids: newWinner && newWinner !== "DRAW"
                    ? [Object.keys(players).find(key => players[key] === newWinner)]
                    : null,
                ended_at: newWinner ? new Date().toISOString() : null
            })
            .eq("id", matchId)

        if (error) {
            toast.error("Failed to make move")
        }
    }

    function calculateWinner(squares: BoardState): Player | "DRAW" | null {
        const lines = [
            [0, 1, 2],
            [3, 4, 5],
            [6, 7, 8],
            [0, 3, 6],
            [1, 4, 7],
            [2, 5, 8],
            [0, 4, 8],
            [2, 4, 6],
        ]
        for (let i = 0; i < lines.length; i++) {
            const [a, b, c] = lines[i]
            if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
                return squares[a]
            }
        }
        if (!squares.includes(null)) return "DRAW"
        return null
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] gap-8">
            {/* Back Button */}
            {onBackToLobby && (
                <Button
                    onClick={onBackToLobby}
                    variant="ghost"
                    className="fixed top-4 left-4 z-50 bg-white/10 hover:bg-white/20 text-white pixel-border border-2 border-white/50"
                >
                    <ArrowLeft className="mr-2 h-6 w-6" />
                    BACK
                </Button>
            )}

            {/* Header / Status */}
            <div className="text-center relative z-10">
                {winner ? (
                    <h2 className="text-7xl font-retro-heading text-white pixel-text-stroke leading-tight animate-bounce">
                        {winner === "DRAW" ? "DRAW!" : `${winner} WINS!`}
                    </h2>
                ) : (
                    <h2 className="text-5xl font-retro-heading text-white pixel-text-stroke">
                        {currentTurn}'S TURN
                    </h2>
                )}
            </div>

            {/* Game Board */}
            <div className="grid grid-cols-3 gap-4 p-6 bg-black/20 backdrop-blur-sm pixel-border border-4 border-white/30">
                {board.map((square, index) => (
                    <button
                        key={index}
                        onClick={() => handleMove(index)}
                        disabled={!!square || !isMyTurn || !!winner}
                        className={cn(
                            "w-24 h-24 md:w-32 md:h-32 bg-white/90 hover:bg-white pixel-border border-4 border-black flex items-center justify-center text-6xl md:text-7xl font-bold transition-all duration-200",
                            square === "X" && "text-blue-600",
                            square === "O" && "text-red-600",
                            !square && isMyTurn && !winner && "cursor-pointer hover:scale-105 active:scale-95",
                            (square || !isMyTurn || winner) && "cursor-not-allowed opacity-60"
                        )}
                    >
                        {square === "X" && <X />}
                        {square === "O" && <Circle />}
                    </button>
                ))}
            </div>

            {/* Chat Toggle */}
            <Button
                onClick={() => setShowChat(!showChat)}
                variant="ghost"
                className="fixed bottom-4 right-4 bg-white/10 hover:bg-white/20 text-white pixel-border border-2 border-white/50"
            >
                {showChat ? "HIDE CHAT" : "SHOW CHAT"}
            </Button>

            {/* Chat Sidebar */}
            <AnimatePresence>
                {showChat && (
                    <motion.div
                        initial={{ x: 400 }}
                        animate={{ x: 0 }}
                        exit={{ x: 400 }}
                        className="fixed right-0 top-0 h-full w-80 bg-[#e6d5aa] pixel-border border-l-4 border-[#8b4513] z-40"
                    >
                        <Chat roomId={roomId} className="h-full" />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Winner Overlay */}
            {winner && (
                <WinnerOverlay
                    winner={winner === "DRAW" ? "DRAW" : playersInfo[Object.keys(players).find(key => players[key] === winner) || ""]?.name || winner}
                    onRestart={onRestart}
                    onBackToLobby={onBackToLobby}
                />
            )}
        </div>
    )
}
