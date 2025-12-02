"use client"

import { useEffect, useState } from "react"
import { friendService } from "@/lib/services/friendService"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/Avatar"
import { User, UserPlus, Check, X, Trash2 } from "lucide-react"
import { Input } from "@/components/ui/Input"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"

export function FriendsList() {
    const [friends, setFriends] = useState<any[]>([])
    const [requests, setRequests] = useState<any[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [searchResults, setSearchResults] = useState<any[]>([])
    const supabase = createClient()

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        try {
            const [friendsData, requestsData] = await Promise.all([
                friendService.getFriends(),
                friendService.getPendingRequests()
            ])
            setFriends(friendsData)
            setRequests(requestsData)
        } catch (error) {
            console.error(error)
        }
    }

    async function handleSearch() {
        if (!searchQuery.trim()) return
        const { data: { user: currentUser } } = await supabase.auth.getUser()

        const { data } = await supabase
            .from("users")
            .select("*")
            .ilike("username", `%${searchQuery}%`)
            .neq("id", currentUser?.id)
            .limit(5)

        setSearchResults(data || [])
    }

    async function sendRequest(userId: string) {
        try {
            await friendService.sendFriendRequest(userId)
            toast.success("Friend request sent!")
            setSearchResults([])
            setSearchQuery("")
        } catch (error: any) {
            toast.error(error.message)
        }
    }

    async function acceptRequest(id: string) {
        try {
            await friendService.acceptFriendRequest(id)
            toast.success("Friend accepted!")
            loadData()
        } catch (error: any) {
            toast.error(error.message)
        }
    }

    async function rejectRequest(id: string) {
        try {
            await friendService.rejectFriendRequest(id)
            toast.info("Request rejected")
            loadData()
        } catch (error: any) {
            toast.error(error.message)
        }
    }

    async function handleRemoveFriend(id: string) {
        if (!confirm("Are you sure you want to remove this friend?")) return
        try {
            await friendService.removeFriend(id)
            toast.success("Friend removed")
            loadData()
        } catch (error: any) {
            toast.error(error.message)
        }
    }

    return (
        <div className="grid gap-6 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle>Friends</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {friends.length === 0 && <p className="text-muted-foreground text-sm">No friends yet.</p>}
                    {friends.map((item) => (
                        <div key={item.friendshipId} className="flex items-center justify-between p-2 border rounded">
                            <div className="flex items-center gap-3">
                                <Avatar>
                                    <AvatarImage src={item.profile.avatar_url} />
                                    <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-medium">{item.profile.display_name}</p>
                                    <p className="text-xs text-muted-foreground">@{item.profile.username}</p>
                                </div>
                            </div>
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-100"
                                onClick={() => handleRemoveFriend(item.friendshipId)}
                                title="Remove Friend"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                </CardContent>
            </Card>

            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Add Friend</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex gap-2">
                            <Input
                                placeholder="Search by username..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <Button onClick={handleSearch}>Search</Button>
                        </div>
                        {searchResults.map((user) => (
                            <div key={user.id} className="flex items-center justify-between p-2 border rounded bg-muted/50">
                                <div className="flex items-center gap-2">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={user.avatar_url} />
                                        <AvatarFallback><User className="h-3 w-3" /></AvatarFallback>
                                    </Avatar>
                                    <span className="text-sm font-medium">{user.display_name}</span>
                                </div>
                                <Button size="sm" variant="secondary" onClick={() => sendRequest(user.id)}>
                                    <UserPlus className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {requests.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Pending Requests</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {requests.map((req) => (
                                <div key={req.id} className="flex items-center justify-between p-2 border rounded">
                                    <div className="flex items-center gap-2">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={req.user.avatar_url} />
                                            <AvatarFallback><User className="h-3 w-3" /></AvatarFallback>
                                        </Avatar>
                                        <span className="text-sm font-medium">{req.user.display_name}</span>
                                    </div>
                                    <div className="flex gap-1">
                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={() => acceptRequest(req.id)}>
                                            <Check className="h-4 w-4" />
                                        </Button>
                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" onClick={() => rejectRequest(req.id)}>
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}
