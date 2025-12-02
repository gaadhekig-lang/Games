"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { roomService } from "@/lib/services/roomService"
import { useAppSelector } from "@/lib/hooks"
import { toast } from "sonner"

export default function CreateLobbyPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const gameId = searchParams.get("game")
    const user = useAppSelector((state) => state.auth.user)
    const [isCreating, setIsCreating] = useState(true)

    useEffect(() => {
        async function initRoom() {
            if (!user || !gameId) {
                // If not logged in, redirect to login
                if (!user) {
                    toast.error("Please login to play")
                    router.push("/login")
                    return
                }
                return
            }

            try {
                const maxPlayers = gameId === 'tic-tac-toe' ? 2 : 4
                const room = await roomService.createRoom(gameId, maxPlayers)
                if (room) {
                    router.push(`/lobby/${room.id}`)
                } else {
                    throw new Error("Failed to create room")
                }
            } catch (error) {
                console.error("Error creating room:", error)
                toast.error("Failed to create room")
                router.push("/")
            } finally {
                setIsCreating(false)
            }
        }

        initRoom()
    }, [gameId, user, router])

    return (
        <div className="flex h-screen w-full items-center justify-center bg-black/80 text-white">
            <div className="text-center">
                <h1 className="mb-4 text-2xl font-retro-heading animate-pulse text-[var(--pixel-primary)]">
                    Creating Game...
                </h1>
                <p className="font-retro-body text-gray-400">Please wait while we set up the board.</p>
            </div>
        </div>
    )
}
