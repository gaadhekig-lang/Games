"use client"

import { useRoom } from "@/hooks/useRoom"
import { roomService } from "@/lib/services/roomService"
import { Button } from "@/components/ui/Button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/Avatar"
import { Skeleton } from "@/components/ui/Skeleton"
import { User, Copy, ArrowLeft, UserPlus } from "lucide-react"
import { toast } from "sonner"
import { useAppSelector } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { TicTacToe } from "@/features/games/tictactoe/TicTacToe"
import { Ludo } from "@/features/games/ludo/Ludo"
import { SnakeLadders } from "@/features/games/snakeladders/SnakeLadders"
import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { InviteFriendsModal } from "./InviteFriendsModal"
import { Chat } from "@/components/shared/Chat"
import { AnimatePresence, motion } from "framer-motion"
import { HostLeftModal } from "@/components/shared/HostLeftModal"

interface LobbyProps {
    roomId: string
}

export function Lobby({ roomId }: LobbyProps) {
    const { room, players, isLoading } = useRoom(roomId)
    const currentUser = useAppSelector((state) => state.auth.user)
    const [supabase] = useState(() => createClient())
    const [activeMatch, setActiveMatch] = useState<any>(null)
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
    const [showHostLeftModal, setShowHostLeftModal] = useState(false)
    const router = useRouter()
    const joiningRef = useRef(false)
    const hostLeftRef = useRef(false)

    const isHost = players.find(p => p.user_id === currentUser?.id)?.is_host

    // Fetch active match if room is in progress
    useEffect(() => {
        if (room?.status === 'in_progress') {
            const fetchMatch = async () => {
                const { data } = await supabase
                    .from('matches')
                    .select('*')
                    .eq('room_id', roomId)
                    .order('started_at', { ascending: false })
                    .limit(1)
                    .single()

                if (data) setActiveMatch(data)
            }
            fetchMatch()
        }
    }, [room?.status, roomId, supabase])

    // Subscribe to new matches (for Restart)
    useEffect(() => {
        if (!roomId) return

        const channel = supabase
            .channel(`lobby_matches:${roomId}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "matches",
                    filter: `room_id=eq.${roomId}`,
                },
                (payload) => {
                    setActiveMatch(payload.new)
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [roomId, supabase])

    // Auto-join if not a player
    useEffect(() => {
        if (isLoading || !room || !currentUser) return

        const isPlayer = players.some(p => p.user_id === currentUser.id)
        if (!isPlayer && !joiningRef.current) {
            joiningRef.current = true
            const join = async () => {
                try {
                    await roomService.joinRoom(room.room_code)
                    toast.success("Joined room!")
                } catch (error: any) {
                    toast.error(error.message)
                    router.push("/")
                } finally {
                    joiningRef.current = false
                }
            }
            join()
        }
    }, [isLoading, room, players, currentUser, router])

    // Check if host has left
    useEffect(() => {
        if (isLoading || !room || !players.length) return

        const hostId = room.host_user_id
        const hostStillInRoom = players.some(p => p.user_id === hostId)

        if (!hostStillInRoom && !hostLeftRef.current) {
            hostLeftRef.current = true
            setShowHostLeftModal(true)
        }
    }, [isLoading, room, players])

    const handleHostLeft = () => {
        router.push('/')
    }

    async function copyRoomCode() {
        if (room?.room_code) {
            await navigator.clipboard.writeText(room.room_code)
            toast.success("Room code copied!")
        }
    }

    async function toggleReady() {
        if (!currentUser) return
        const player = players.find(p => p.user_id === currentUser.id)
        if (!player) return

        try {
            const { error } = await supabase
                .from("room_players")
                .update({ ready: !player.ready })
                .eq("id", player.id)

            if (error) throw error
            // toast.success(player.ready ? "Not ready" : "Ready!") // Optional feedback
        } catch (error: any) {
            toast.error("Failed to update status")
            console.error("Toggle Ready Error:", error)
        }
    }

    async function updateAIPlayers(count: number) {
        if (!isHost) return
        try {
            await roomService.updateRoomSettings(roomId, { ai_players: count })
            toast.success(`Bots updated to ${count}`)
        } catch (error) {
            toast.error("Failed to update bots")
        }
    }

    async function selectColor(color: string) {
        if (!currentUser) return
        const player = players.find(p => p.user_id === currentUser.id)
        if (!player) return

        try {
            await supabase
                .from("room_players")
                .update({ selected_color: color })
                .eq("id", player.id)
        } catch (error) {
            toast.error("Failed to select color")
        }
    }

    async function startGame() {
        if (!isHost) return
        const totalPlayers = players.length + (room.ai_players || 0)
        if (totalPlayers < 2) {
            toast.error("Need at least 2 players to start")
            return
        }

        const allReady = players.every(p => p.ready)
        if (!allReady) {
            toast.error("All players must be ready!")
            return
        }

        try {
            // Define initial state based on game type
            let initialGameState = {}
            if (room.game_key === 'tic-tac-toe') {
                initialGameState = {
                    board: Array(9).fill(null),
                    currentTurn: "X",
                    winner: null
                }
            } else if (room.game_key === 'ludo' || room.game_key === 'snake-ladders') {
                const gamePlayers: any = {}
                const COLORS = ['red', 'green', 'yellow', 'blue']
                let seatIndex = 0

                // Sort players by seat to ensure consistent order
                const sortedPlayers = [...players].sort((a, b) => (a.seat || 0) - (b.seat || 0))

                // Add Real Players
                sortedPlayers.forEach((p) => {
                    gamePlayers[p.user_id] = {
                        color: COLORS[seatIndex % 4],
                        position: 0
                    }
                    seatIndex++
                })

                // Add AI Players
                const aiCount = room.ai_players || 0
                for (let i = 0; i < aiCount; i++) {
                    if (seatIndex >= 4) break
                    gamePlayers[`ai-${i}`] = {
                        color: COLORS[seatIndex % 4],
                        position: 0
                    }
                    seatIndex++
                }

                initialGameState = {
                    players: gamePlayers,
                    currentTurn: 'red',
                    diceValue: null,
                    winner: null,
                    // Include static board config to avoid re-generation issues
                    boardConfig: room.game_key === 'snake-ladders' ? {
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
                    } : undefined
                }
            }

            // Create match
            const { data: match, error: matchError } = await supabase
                .from("matches")
                .insert({
                    room_id: roomId,
                    game_key: room.game_key,
                    started_at: new Date().toISOString(),
                    result_json: initialGameState
                })
                .select()
                .single()

            if (matchError) throw matchError

            // Update room status
            const { error: roomError } = await supabase
                .from("rooms")
                .update({ status: "in_progress" })
                .eq("id", roomId)

            if (roomError) throw roomError

            setActiveMatch(match)
            toast.success("Game started!")
        } catch (error: any) {
            toast.error("Failed to start game")
            console.error("Start Game Error:", error)
            toast.error(`Failed to start game: ${error.message || "Unknown error"}`)
        }
    }

    if (isLoading) {
        return <LobbySkeleton />
    }

    if (!room) {
        return <div>Room not found</div>
    }



    async function endGame() {
        if (!isHost) return
        try {
            await supabase
                .from("rooms")
                .update({ status: "open" })
                .eq("id", roomId)
            toast.success("Returned to lobby")
        } catch (error) {
            toast.error("Failed to end game")
        }
    }

    // Render Game if in progress
    if (room.status === "in_progress" && activeMatch) {
        const gameProps = {
            roomId,
            matchId: activeMatch.id,
            initialState: activeMatch.result_json,
            onRestart: isHost ? startGame : undefined,
            onBackToLobby: isHost ? endGame : undefined,
            isHost
        }

        let GameComponent
        if (room.game_key === "tic-tac-toe") {
            GameComponent = <TicTacToe key={activeMatch.id} {...gameProps} />
        } else if (room.game_key === "ludo") {
            GameComponent = <Ludo key={activeMatch.id} {...gameProps} />
        } else if (room.game_key === "snake-ladders") {
            GameComponent = <SnakeLadders key={activeMatch.id} {...gameProps} />
        } else {
            GameComponent = <div>Game in progress: {room.game_key} (Implementation coming soon)</div>
        }

        return (
            <>
                {GameComponent}
                <HostLeftModal
                    isOpen={showHostLeftModal}
                    onReturnHome={handleHostLeft}
                />
            </>
        )
    }

    return (
        <div className="container max-w-4xl pt-24 pb-8 relative">
            {/* Back Button */}
            <Button
                onClick={() => router.push("/")}
                variant="ghost"
                className="absolute top-8 left-4 md:-left-4 z-50 bg-white/10 hover:bg-white/20 text-white pixel-border border-2 border-white/50"
            >
                <ArrowLeft className="mr-2 h-6 w-6" />
                MAIN MENU
            </Button>

            {/* Header Section */}
            <div className="mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-retro-heading text-white pixel-text-stroke mb-2">
                        LOBBY: {room.game_key.toUpperCase()}
                    </h1>
                    <div className="flex items-center gap-2">
                        <div className="bg-white px-4 py-2 pixel-border border-2 border-black flex items-center gap-2">
                            <span className="font-retro-body font-bold text-black">CODE: {room.room_code}</span>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={copyRoomCode}
                                className="h-6 w-6 hover:bg-black/10 rounded-none"
                            >
                                <Copy className="h-4 w-4 text-black" />
                            </Button>
                        </div>
                    </div>
                </div>

                {isHost && (
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                        {/* Bot Controls */}
                        <div className="flex items-center gap-2 bg-[#3e2723] p-2 pixel-border border-2 border-[#5d3a1a]">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-none hover:bg-white/10 text-white font-retro-heading"
                                onClick={() => updateAIPlayers((room.ai_players || 0) - 1)}
                                disabled={(room.ai_players || 0) <= 0}
                            >
                                -
                            </Button>
                            <span className="text-sm font-retro-body font-bold w-20 text-center text-white">
                                {room.ai_players || 0} BOTS
                            </span>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-none hover:bg-white/10 text-white font-retro-heading"
                                onClick={() => updateAIPlayers((room.ai_players || 0) + 1)}
                                disabled={(players.length + (room.ai_players || 0)) >= room.max_players}
                            >
                                +
                            </Button>
                        </div>

                        <Button
                            onClick={() => setIsInviteModalOpen(true)}
                            className="h-12 px-4 font-retro-heading bg-[#5c94fc] hover:bg-[#4a7acc] text-white pixel-border border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all flex items-center gap-2"
                        >
                            <UserPlus className="h-5 w-5" />
                            INVITE
                        </Button>

                        <Button
                            onClick={startGame}
                            disabled={(players.length + (room.ai_players || 0)) < 2}
                            className="h-12 px-6 font-retro-heading bg-[#4a8f3a] hover:bg-[#3a722e] text-white pixel-border border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all"
                        >
                            START GAME
                        </Button>
                    </div>
                )}
            </div>

            <div className="grid gap-8 lg:grid-cols-2">
                {/* Players List */}
                <div className="bg-[#e6d5aa] p-4 md:p-6 pixel-border border-4 border-[#8b4513] relative order-2 lg:order-1">
                    {/* Decorative Corner Screws */}
                    <div className="absolute top-2 left-2 w-2 h-2 bg-[#5d3a1a] rounded-full opacity-50" />
                    <div className="absolute top-2 right-2 w-2 h-2 bg-[#5d3a1a] rounded-full opacity-50" />
                    <div className="absolute bottom-2 left-2 w-2 h-2 bg-[#5d3a1a] rounded-full opacity-50" />
                    <div className="absolute bottom-2 right-2 w-2 h-2 bg-[#5d3a1a] rounded-full opacity-50" />

                    <h2 className="text-xl font-retro-heading text-[#3e2723] mb-4 text-center border-b-2 border-[#8b4513] pb-2">
                        PLAYERS ({players.length}/{room.max_players})
                    </h2>

                    <div className="space-y-3">

                        {players.map((player) => (
                            <div key={player.id} className="flex flex-col gap-2 bg-[#d4c59a] p-3 pixel-border-sm border-2 border-[#8b4513]">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 bg-[#8b4513] p-0.5 pixel-border-sm shrink-0">
                                            <Avatar className="h-full w-full rounded-none">
                                                <AvatarImage src={player.user?.avatar_url} />
                                                <AvatarFallback className="bg-[#e6d5aa] text-[#3e2723] rounded-none font-retro-heading">
                                                    {player.user?.display_name?.[0] || "?"}
                                                </AvatarFallback>
                                            </Avatar>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-retro-body font-bold text-[#3e2723] truncate">
                                                {player.user?.display_name || player.user?.username || "Unknown"}
                                            </p>
                                            {player.is_host && (
                                                <span className="text-[10px] font-retro-heading text-[#c84c0c] uppercase">
                                                    HOST
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="shrink-0">
                                        {player.ready ? (
                                            <span className="font-retro-heading text-xs text-[#4a8f3a]">READY</span>
                                        ) : (
                                            <span className="font-retro-heading text-xs text-[#c84c0c]">WAITING</span>
                                        )}
                                    </div>
                                </div>

                                {/* Color Selection */}
                                <div className="flex gap-2 justify-center mt-2">
                                    {['red', 'green', 'yellow', 'blue'].map((color) => {
                                        const isSelected = player.selected_color === color
                                        const isTaken = players.some(p => p.selected_color === color && p.id !== player.id)
                                        const isMe = player.user_id === currentUser?.id

                                        return (
                                            <button
                                                key={color}
                                                disabled={!isMe || (isTaken && !isSelected)}
                                                onClick={() => isMe && selectColor(color)}
                                                className={cn(
                                                    "w-6 h-6 border-2 transition-all",
                                                    color === 'red' && "bg-red-500",
                                                    color === 'green' && "bg-green-500",
                                                    color === 'yellow' && "bg-yellow-500",
                                                    color === 'blue' && "bg-blue-500",
                                                    isSelected ? "border-black scale-110 ring-2 ring-white" : "border-black/20 opacity-50",
                                                    isTaken && !isSelected && "opacity-20 cursor-not-allowed",
                                                    isMe && !isTaken && "hover:scale-110 hover:opacity-100 cursor-pointer"
                                                )}
                                            />
                                        )
                                    })}
                                </div>
                            </div>
                        ))}

                        {Array.from({ length: room.ai_players || 0 }).map((_, i) => (
                            <div key={`ai-${i}`} className="flex items-center justify-between bg-[#d4c59a] p-3 pixel-border-sm border-2 border-[#8b4513] opacity-80">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 bg-[#8b4513] p-0.5 pixel-border-sm shrink-0">
                                        <div className="h-full w-full bg-[#5c94fc] flex items-center justify-center">
                                            <span className="font-retro-heading text-xs text-white">AI</span>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="font-retro-body font-bold text-[#3e2723]">BOT {i + 1}</p>
                                        <span className="text-[10px] font-retro-heading text-[#5c94fc] uppercase">CPU</span>
                                    </div>
                                </div>
                                <span className="font-retro-heading text-xs text-[#4a8f3a]">READY</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Chat Section */}
                <div className="bg-[#e6d5aa] p-4 md:p-6 pixel-border border-4 border-[#8b4513] relative flex flex-col h-[400px] md:h-[500px] order-1 lg:order-2">
                    {/* Decorative Corner Screws */}
                    <div className="absolute top-2 left-2 w-2 h-2 bg-[#5d3a1a] rounded-full opacity-50" />
                    <div className="absolute top-2 right-2 w-2 h-2 bg-[#5d3a1a] rounded-full opacity-50" />
                    <div className="absolute bottom-2 left-2 w-2 h-2 bg-[#5d3a1a] rounded-full opacity-50" />
                    <div className="absolute bottom-2 right-2 w-2 h-2 bg-[#5d3a1a] rounded-full opacity-50" />

                    <h2 className="text-xl font-retro-heading text-[#3e2723] mb-4 text-center border-b-2 border-[#8b4513] pb-2">
                        CHAT
                    </h2>

                    <Chat roomId={roomId} className="flex-1 min-h-0" />
                </div>
            </div>

            <div className="mt-8 flex justify-center">
                <Button
                    size="lg"
                    onClick={toggleReady}
                    className={cn(
                        "h-16 px-8 text-xl font-retro-heading pixel-border border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all",
                        players.find(p => p.user_id === currentUser?.id)?.ready
                            ? "bg-[#4a8f3a] hover:bg-[#3a722e] text-white"
                            : "bg-[#c84c0c] hover:bg-[#a03d09] text-white"
                    )}
                >
                    {players.find(p => p.user_id === currentUser?.id)?.ready ? "READY!" : "MARK READY"}
                </Button>
            </div>


            <InviteFriendsModal
                isOpen={isInviteModalOpen}
                onClose={() => setIsInviteModalOpen(false)}
                roomId={roomId}
            />

            {/* Host Left Modal */}
            <HostLeftModal
                isOpen={showHostLeftModal}
                onReturnHome={handleHostLeft}
            />
        </div>
    )
}

function LobbySkeleton() {
    return (
        <div className="container max-w-4xl py-8 space-y-8">
            <div className="flex justify-between">
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-10 w-24" />
            </div>
            <div className="grid gap-6 md:grid-cols-2">
                <Skeleton className="h-[400px] w-full" />
                <Skeleton className="h-[400px] w-full" />
            </div>
        </div>
    )
}
