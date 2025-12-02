"use client"

import { FriendsList } from "@/features/social/FriendsList"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"

export default function FriendsPage() {
    const [roomCode, setRoomCode] = useState("")
    const router = useRouter()
    const supabase = createClient()

    async function handleJoin() {
        if (!roomCode.trim()) return

        const { data, error } = await supabase
            .from('rooms')
            .select('id')
            .eq('room_code', roomCode.toUpperCase())
            .single()

        if (error || !data) {
            toast.error("Invalid room code")
            return
        }

        router.push(`/lobby/${data.id}`)
    }

    return (
        <div className="container py-8 space-y-8 pt-24 md:pt-32">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-3xl font-bold font-retro-heading text-[#3e2723]">Social Hub</h1>

                {/* Join Party Section - Moved here */}
                <div className="w-full md:w-auto">
                    <div className="bg-[#e6d5aa] p-4 pixel-border border-4 border-[#8b4513] shadow-md flex flex-col md:flex-row gap-4 items-center">
                        <h3 className="font-retro-heading text-[#3e2723] text-sm whitespace-nowrap">JOIN PARTY</h3>
                        <div className="flex gap-2 w-full md:w-auto">
                            <Input
                                placeholder="ENTER CODE"
                                value={roomCode}
                                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                                className="w-full md:w-32 h-10 font-retro-heading text-sm bg-white border-2 border-[#8b4513] rounded-none focus-visible:ring-0"
                                maxLength={6}
                            />
                            <Button
                                onClick={handleJoin}
                                className="h-10 px-4 font-retro-heading bg-[#4a8f3a] hover:bg-[#3a722e] text-white pixel-border border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none transition-all shrink-0"
                            >
                                GO
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <FriendsList />
        </div>
    )
}
