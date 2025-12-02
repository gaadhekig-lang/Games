"use client"

import { useEffect, useState, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { useAppSelector } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface ChatProps {
    roomId: string
    className?: string
}

interface Message {
    id: string
    content: string
    user_id: string
    created_at: string
    user?: {
        display_name: string
        avatar_url?: string
    }
}

export function Chat({ roomId, className }: ChatProps) {
    const [messages, setMessages] = useState<Message[]>([])
    const [newMessage, setNewMessage] = useState("")
    const [isLoading, setIsLoading] = useState(true)
    const scrollRef = useRef<HTMLDivElement>(null)
    const currentUser = useAppSelector((state) => state.auth.user)
    const supabase = createClient()

    useEffect(() => {
        if (!roomId) return

        // Fetch initial messages
        async function loadMessages() {
            const { data, error } = await supabase
                .from("messages")
                .select("*, user:users(display_name, avatar_url)")
                .eq("room_id", roomId)
                .order("created_at", { ascending: true })

            if (error) {
                console.error("Error loading messages:", error)
            } else {
                setMessages(data || [])
            }
            setIsLoading(false)
        }

        loadMessages()

        // Subscribe to new messages
        const channel = supabase
            .channel(`chat:${roomId}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "messages",
                    filter: `room_id=eq.${roomId}`,
                },
                async (payload) => {
                    // Fetch user details for the new message
                    const { data: user } = await supabase
                        .from("users")
                        .select("display_name, avatar_url")
                        .eq("id", payload.new.user_id)
                        .single()

                    const messageWithUser = {
                        ...payload.new,
                        user: user || { display_name: "Unknown" }
                    } as Message

                    setMessages((prev) => [...prev, messageWithUser])
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [roomId, supabase])

    useEffect(() => {
        // Auto-scroll to bottom
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages])

    async function sendMessage(e: React.FormEvent) {
        e.preventDefault()
        if (!newMessage.trim() || !currentUser) return

        const content = newMessage.trim()
        setNewMessage("") // Optimistic clear

        const { error } = await supabase
            .from("messages")
            .insert({
                room_id: roomId,
                user_id: currentUser.id,
                content
            })

        if (error) {
            toast.error("Failed to send message")
            setNewMessage(content) // Restore on error
        }
    }

    return (
        <div className={cn("flex flex-col h-full", className)}>
            {/* Messages Area */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#d4c59a] pixel-border-sm border-2 border-[#8b4513] mb-4"
            >
                {isLoading ? (
                    <div className="text-center text-[#8b4513] opacity-50 font-retro-body">Loading...</div>
                ) : messages.length === 0 ? (
                    <div className="text-center text-[#8b4513] opacity-50 font-retro-body">
                        No messages yet. Say hello!
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isMe = msg.user_id === currentUser?.id
                        return (
                            <div
                                key={msg.id}
                                className={cn(
                                    "flex flex-col max-w-[80%]",
                                    isMe ? "ml-auto items-end" : "mr-auto items-start"
                                )}
                            >
                                <span className="text-[10px] font-retro-heading text-[#5d4037] mb-1 px-1">
                                    {isMe ? "YOU" : msg.user?.display_name}
                                </span>
                                <div
                                    className={cn(
                                        "p-2 rounded font-retro-body text-sm break-words pixel-border-sm border-2",
                                        isMe
                                            ? "bg-[#4a8f3a] text-white border-[#2e5c24]"
                                            : "bg-white text-black border-[#8b4513]"
                                    )}
                                >
                                    {msg.content}
                                </div>
                            </div>
                        )
                    })
                )}
            </div>

            {/* Input Area */}
            <form onSubmit={sendMessage} className="flex gap-2">
                <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 font-retro-body bg-white border-2 border-[#8b4513] rounded-none focus-visible:ring-0"
                />
                <Button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="font-retro-heading bg-[#8b4513] hover:bg-[#5d3a1a] text-white pixel-border border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none transition-all"
                >
                    SEND
                </Button>
            </form>
        </div>
    )
}
