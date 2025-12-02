"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog"
import { Button } from "@/components/ui/Button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/Avatar"
import { User, Send, Check } from "lucide-react"
import { friendService } from "@/lib/services/friendService"
import { toast } from "sonner"

interface InviteFriendsModalProps {
    isOpen: boolean
    onClose: () => void
    roomId: string
}

export function InviteFriendsModal({ isOpen, onClose, roomId }: InviteFriendsModalProps) {
    const [friends, setFriends] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [invitedFriends, setInvitedFriends] = useState<Set<string>>(new Set())

    useEffect(() => {
        if (isOpen) {
            loadFriends()
        }
    }, [isOpen])

    async function loadFriends() {
        try {
            setLoading(true)
            const data = await friendService.getFriends()
            setFriends(data)
        } catch (error) {
            console.error("Failed to load friends:", error)
            toast.error("Failed to load friends list")
        } finally {
            setLoading(false)
        }
    }

    async function handleInvite(friendId: string) {
        try {
            await friendService.sendGameInvite(friendId, roomId)
            setInvitedFriends(prev => new Set(prev).add(friendId))
            toast.success("Invite sent!")
        } catch (error) {
            toast.error("Failed to send invite")
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md bg-[#e6d5aa] pixel-border border-4 border-[#8b4513] text-[#3e2723]">
                <DialogHeader>
                    <DialogTitle className="font-retro-heading text-xl text-center">INVITE FRIENDS</DialogTitle>
                </DialogHeader>

                <div className="max-h-[300px] overflow-y-auto space-y-2 p-2">
                    {loading ? (
                        <div className="text-center py-8 font-retro-body opacity-70">Loading friends...</div>
                    ) : friends.length === 0 ? (
                        <div className="text-center py-8 font-retro-body opacity-70">
                            No friends found.
                            <br />
                            <span className="text-xs">Go make some friends first!</span>
                        </div>
                    ) : (
                        friends.map((item) => {
                            const isInvited = invitedFriends.has(item.profile.id)
                            return (
                                <div
                                    key={item.friendshipId}
                                    className="flex items-center justify-between p-3 bg-[#d4c59a] pixel-border-sm border-2 border-[#8b4513]"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 bg-[#8b4513] p-0.5 pixel-border-sm">
                                            <Avatar className="h-full w-full rounded-none">
                                                <AvatarImage src={item.profile.avatar_url} />
                                                <AvatarFallback className="bg-[#e6d5aa] text-[#3e2723] rounded-none font-retro-heading">
                                                    {item.profile.display_name?.[0] || "?"}
                                                </AvatarFallback>
                                            </Avatar>
                                        </div>
                                        <div>
                                            <p className="font-retro-body font-bold text-[#3e2723] text-sm">
                                                {item.profile.display_name}
                                            </p>
                                            <p className="text-[10px] font-retro-heading text-[#8b4513] opacity-70">
                                                @{item.profile.username}
                                            </p>
                                        </div>
                                    </div>

                                    <Button
                                        size="sm"
                                        onClick={() => handleInvite(item.profile.id)}
                                        disabled={isInvited}
                                        className={`
                                            h-8 px-3 font-retro-heading text-xs pixel-border border-2 border-black
                                            ${isInvited
                                                ? "bg-[#4a8f3a] text-white opacity-80"
                                                : "bg-[#5c94fc] hover:bg-[#4a7acc] text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none transition-all"
                                            }
                                        `}
                                    >
                                        {isInvited ? (
                                            <>
                                                <Check className="h-3 w-3 mr-1" /> SENT
                                            </>
                                        ) : (
                                            <>
                                                <Send className="h-3 w-3 mr-1" /> INVITE
                                            </>
                                        )}
                                    </Button>
                                </div>
                            )
                        })
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
