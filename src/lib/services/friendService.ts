import { createClient } from "@/lib/supabase/client"

export const friendService = {
    async sendFriendRequest(friendId: string) {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error("Not authenticated")

        if (friendId === user.id) throw new Error("Cannot add yourself")

        // Check if already friends or request sent
        const { data: existing } = await supabase
            .from("friends")
            .select("*")
            .or(`and(requester_id.eq.${user.id},receiver_id.eq.${friendId}),and(requester_id.eq.${friendId},receiver_id.eq.${user.id})`)
            .maybeSingle()

        if (existing) {
            if (existing.status === 'accepted') throw new Error("Already friends")
            if (existing.status === 'pending') throw new Error("Request already pending")
        }

        const { error } = await supabase
            .from("friends")
            .insert({
                requester_id: user.id,
                receiver_id: friendId,
                status: "pending",
            })

        if (error) throw error
    },

    async acceptFriendRequest(friendshipId: string) {
        const supabase = createClient()
        const { error } = await supabase
            .from("friends")
            .update({ status: "accepted" })
            .eq("id", friendshipId)

        if (error) throw error
    },

    async rejectFriendRequest(friendshipId: string) {
        const supabase = createClient()
        const { error } = await supabase
            .from("friends")
            .delete()
            .eq("id", friendshipId)

        if (error) throw error
    },

    async removeFriend(friendshipId: string) {
        const supabase = createClient()
        const { error } = await supabase
            .from("friends")
            .delete()
            .eq("id", friendshipId)

        if (error) throw error
    },

    async getFriends() {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return []

        const { data } = await supabase
            .from("friends")
            .select(`
        id,
        status,
        requester_id,
        receiver_id,
        requester:users!friends_requester_id_fkey(*),
        receiver:users!friends_receiver_id_fkey(*)
      `)
            .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`)
            .eq("status", "accepted")

        if (!data) return []

        // Normalize data to return just the friend profile
        const friends = data.map((f: any) => {
            const isUserSender = f.requester_id === user.id
            return {
                friendshipId: f.id,
                profile: isUserSender ? f.receiver : f.requester
            }
        })

        // Filter out self-friendships and deduplicate by profile ID
        const uniqueFriends = friends.filter((friend, index, self) =>
            friend.profile.id !== user.id &&
            index === self.findIndex((t) => (
                t.profile.id === friend.profile.id
            ))
        )

        return uniqueFriends
    },

    async getPendingRequests() {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return []

        // Requests where I am the receiver_id
        const { data } = await supabase
            .from("friends")
            .select(`
            id,
            created_at,
            user:users!friends_requester_id_fkey(*)
        `)
            .eq("receiver_id", user.id)
            .eq("status", "pending")

        return data || []
    },

    async sendGameInvite(friendId: string, roomId: string) {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error("Not authenticated")

        // Get room details for the invite message
        const { data: room } = await supabase
            .from('rooms')
            .select('game_key, room_code')
            .eq('id', roomId)
            .single()

        const { error } = await supabase
            .from("notifications")
            .insert({
                user_id: friendId,
                type: 'game_invite',
                data: {
                    roomId,
                    roomCode: room?.room_code,
                    gameKey: room?.game_key,
                    senderName: user.user_metadata?.display_name || 'A friend',
                    senderId: user.id
                }
            })

        if (error) throw error
    },

    async getNotifications() {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return []

        const { data } = await supabase
            .from("notifications")
            .select("*")
            .eq("user_id", user.id)
            .eq("read", false)
            .order("created_at", { ascending: false })

        return data || []
    },

    async markNotificationRead(notificationId: string) {
        const supabase = createClient()
        const { error } = await supabase
            .from("notifications")
            .update({ read: true })
            .eq("id", notificationId)

        if (error) throw error
    }
}
