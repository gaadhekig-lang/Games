import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { RealtimeChannel } from "@supabase/supabase-js"

interface RoomState {
    room: any
    players: any[]
}

export function useRoom(roomId: string) {
    const [state, setState] = useState<RoomState>({ room: null, players: [] })
    const [isLoading, setIsLoading] = useState(true)
    const [supabase] = useState(() => createClient())

    useEffect(() => {
        if (!roomId) return

        let channel: RealtimeChannel

        async function fetchInitialState() {
            setIsLoading(true)
            try {
                const { data: room, error: roomError } = await supabase
                    .from("rooms")
                    .select("*")
                    .eq("id", roomId)
                    .single()

                if (roomError) throw roomError

                const { data: players, error: playersError } = await supabase
                    .from("room_players")
                    .select("*, user:users(*)")
                    .eq("room_id", roomId)
                    .order("joined_at", { ascending: true })

                if (playersError) throw playersError

                setState({ room, players })
            } catch (error) {
                console.error("Error fetching room:", error)
                if (typeof error === 'object' && error !== null) {
                    console.error("Error details:", JSON.stringify(error, null, 2))
                }
            } finally {
                setIsLoading(false)
            }
        }

        function subscribeToRoom() {
            channel = supabase
                .channel(`room:${roomId}`)
                .on(
                    "postgres_changes",
                    {
                        event: "UPDATE",
                        schema: "public",
                        table: "rooms",
                        filter: `id=eq.${roomId}`,
                    },
                    (payload) => {
                        setState((prev) => ({ ...prev, room: payload.new }))
                    }
                )
                .on(
                    "postgres_changes",
                    {
                        event: "*",
                        schema: "public",
                        table: "room_players",
                        filter: `room_id=eq.${roomId}`,
                    },
                    async () => {
                        // Refresh players list on any change
                        const { data: players } = await supabase
                            .from("room_players")
                            .select("*, user:users(*)")
                            .eq("room_id", roomId)
                            .order("joined_at", { ascending: true })

                        if (players) {
                            setState((prev) => ({ ...prev, players }))
                        }
                    }
                )
                .subscribe()
        }

        fetchInitialState().then(() => {
            subscribeToRoom()
        })

        return () => {
            if (channel) supabase.removeChannel(channel)
        }
    }, [roomId, supabase])

    return { ...state, isLoading }
}
