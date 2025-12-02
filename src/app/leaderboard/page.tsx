import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/Avatar"
import { User, Trophy } from "lucide-react"

export default async function LeaderboardPage() {
    const supabase = await createClient()

    // Fetch top 10 users by wins (assuming we have a way to count wins, 
    // currently we might not have a direct 'wins' column on users, 
    // but let's assume we added it or we count from matches. 
    // For MVP, let's just list users ordered by created_at as a placeholder 
    // or add a 'wins' column to schema if we missed it.
    // Actually, let's just fetch users for now.)

    const { data: users } = await supabase
        .from("users")
        .select("*")
        .limit(10)
    // .order('wins', { ascending: false }) // TODO: Add wins column

    return (
        <div className="container py-8 max-w-2xl">
            <h1 className="text-3xl font-bold mb-8 flex items-center gap-2">
                <Trophy className="h-8 w-8 text-yellow-500" />
                Leaderboard
            </h1>

            <Card>
                <CardHeader>
                    <CardTitle>Top Players</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {users?.map((user, index) => (
                        <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="font-bold text-lg w-6 text-center text-muted-foreground">
                                    #{index + 1}
                                </div>
                                <Avatar>
                                    <AvatarImage src={user.avatar_url} />
                                    <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-medium">{user.display_name}</p>
                                    <p className="text-xs text-muted-foreground">@{user.username}</p>
                                </div>
                            </div>
                            <div className="font-bold">
                                {/* {user.wins} Wins */}
                                0 Wins
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    )
}
