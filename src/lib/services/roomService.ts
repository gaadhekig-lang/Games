import { createClient } from "@/lib/supabase/client"
import { nanoid } from "nanoid"

export const roomService = {
    async createRoom(gameKey: string, maxPlayers: number, settings: any = {}) {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) throw new Error("User not authenticated")

        // Generate a short room code
        const roomCode = nanoid(6).toUpperCase()

        const { data: room, error } = await supabase
            .from("rooms")
            .insert({
                game_key: gameKey,
                host_user_id: user.id,
                room_code: roomCode,
                max_players: maxPlayers,
                settings,
                ai_players: settings.aiPlayers || 0,
                status: "open",
            })
            .select()
            .single()

        if (error) throw error

        // Add host as a player
        const { error: playerError } = await supabase
            .from("room_players")
            .insert({
                room_id: room.id,
                user_id: user.id,
                is_host: true,
                seat: 0,
                ready: false, // Host usually ready by default or manual
            })

        if (playerError) throw playerError

        return room
    },

    async joinRoom(roomCode: string) {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) throw new Error("User not authenticated")

        // Find the room
        const { data: room, error: roomError } = await supabase
            .from("rooms")
            .select("*")
            .eq("room_code", roomCode)
            .single()

        if (roomError || !room) throw new Error("Room not found")

        if (room.status !== "open") throw new Error("Room is not open")

        // Check if already joined
        const { data: existingPlayer } = await supabase
            .from("room_players")
            .select("*")
            .eq("room_id", room.id)
            .eq("user_id", user.id)
            .single()

        if (existingPlayer) return room

        // Check player count
        const { count } = await supabase
            .from("room_players")
            .select("*", { count: "exact", head: true })
            .eq("room_id", room.id)

        if (count !== null && count >= room.max_players) {
            throw new Error("Room is full")
        }

        // Join
        const { error: joinError } = await supabase
            .from("room_players")
            .insert({
                room_id: room.id,
                user_id: user.id,
                is_host: false,
                seat: count || 1, // Simple seat assignment
            })

        if (joinError) {
            // If error is duplicate key, user is already in room - ignore
            if (joinError.code === '23505') {
                return room
            }
            throw joinError
        }

        return room
    },

    async updateRoomSettings(roomId: string, updates: { ai_players?: number, settings?: any }) {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) throw new Error("User not authenticated")

        const { error } = await supabase
            .from("rooms")
            .update(updates)
            .eq("id", roomId)
            .eq("host_user_id", user.id) // Ensure only host can update

        if (error) throw error
    },
}
