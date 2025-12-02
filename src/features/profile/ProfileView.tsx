"use client"

import { useProfile } from "@/hooks/useProfile"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/Avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Skeleton } from "@/components/ui/Skeleton"
import { Button } from "@/components/ui/Button"
import { Edit, User } from "lucide-react"
import Link from "next/link"
import { useAppSelector } from "@/lib/hooks"

interface ProfileViewProps {
    userId: string
}

export function ProfileView({ userId }: ProfileViewProps) {
    const { profile, isLoading } = useProfile(userId)
    const currentUser = useAppSelector((state) => state.auth.user)
    const isOwnProfile = currentUser?.id === userId

    if (isLoading) {
        return <ProfileSkeleton />
    }

    if (!profile) {
        return <div>Profile not found</div>
    }

    return (
        <div className="container max-w-4xl py-4 md:py-8 px-4">
            <div className="bg-[#e6d5aa] p-4 md:p-6 pixel-border border-4 border-[#8b4513] relative">
                {/* Decorative Corner Screws */}
                <div className="absolute top-2 left-2 w-2 h-2 bg-[#5d3a1a] rounded-full opacity-50" />
                <div className="absolute top-2 right-2 w-2 h-2 bg-[#5d3a1a] rounded-full opacity-50" />
                <div className="absolute bottom-2 left-2 w-2 h-2 bg-[#5d3a1a] rounded-full opacity-50" />
                <div className="absolute bottom-2 right-2 w-2 h-2 bg-[#5d3a1a] rounded-full opacity-50" />

                <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0 pb-6 border-b-2 border-[#8b4513] mb-6">
                    <h1 className="text-2xl md:text-3xl font-retro-heading text-[#3e2723] text-center md:text-left">PROFILE CARD</h1>
                    {isOwnProfile && (
                        <Link href="/settings">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="font-retro-heading text-[#8b4513] hover:bg-[#d4c59a] hover:text-[#5d3a1a]"
                            >
                                <Edit className="mr-2 h-4 w-4" />
                                EDIT PROFILE
                            </Button>
                        </Link>
                    )}
                </div>

                <div className="space-y-8">
                    <div className="flex flex-col items-center space-y-4 md:flex-row md:space-x-8 md:space-y-0">
                        <div className="relative">
                            <div className="h-24 w-24 md:h-32 md:w-32 bg-[#8b4513] p-1 pixel-border border-2 border-[#5d3a1a]">
                                <Avatar className="h-full w-full rounded-none">
                                    <AvatarImage src={profile.avatar_url || ""} alt={profile.username} className="object-cover" />
                                    <AvatarFallback className="bg-[#d4c59a] text-[#3e2723] rounded-none font-retro-heading text-4xl">
                                        {profile.display_name?.[0] || "?"}
                                    </AvatarFallback>
                                </Avatar>
                            </div>
                            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-[#5d3a1a] text-[#e6d5aa] text-[10px] px-2 py-0.5 font-retro-heading border border-[#3e2723]">
                                PLAYER
                            </div>
                        </div>

                        <div className="space-y-2 text-center md:text-left flex-1 w-full">
                            <h2 className="text-2xl md:text-4xl font-retro-heading text-[#3e2723] break-words">{profile.display_name}</h2>
                            <p className="font-retro-body text-[#8b4513] text-lg">@{profile.username}</p>
                            {profile.bio && (
                                <div className="bg-[#d4c59a] p-3 border-2 border-[#8b4513] mt-2 w-full md:max-w-md relative mx-auto md:mx-0">
                                    <p className="font-retro-body text-[#5d4037] text-sm leading-relaxed">
                                        "{profile.bio}"
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <div className="bg-[#d4c59a] p-4 border-2 border-[#8b4513] flex flex-col items-center justify-center gap-2 transition-transform hover:-translate-y-1">
                            <span className="font-retro-heading text-[#8b4513] text-[10px] md:text-xs uppercase tracking-wider text-center">Games Played</span>
                            <span className="font-retro-heading text-2xl md:text-4xl text-[#3e2723]">0</span>
                        </div>
                        <div className="bg-[#d4c59a] p-4 border-2 border-[#8b4513] flex flex-col items-center justify-center gap-2 transition-transform hover:-translate-y-1">
                            <span className="font-retro-heading text-[#8b4513] text-[10px] md:text-xs uppercase tracking-wider text-center">Wins</span>
                            <span className="font-retro-heading text-2xl md:text-4xl text-[#4a8f3a]">0</span>
                        </div>
                        {/* Add more stats here */}
                    </div>
                </div>
            </div>
        </div>
    )
}

function ProfileSkeleton() {
    return (
        <div className="container max-w-4xl py-8">
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-32" />
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex flex-col items-center space-y-4 sm:flex-row sm:space-x-6 sm:space-y-0">
                        <Skeleton className="h-24 w-24 rounded-full" />
                        <div className="space-y-2">
                            <Skeleton className="h-8 w-48" />
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-4 w-64" />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
