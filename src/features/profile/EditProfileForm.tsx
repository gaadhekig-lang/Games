"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/Card"
import { toast } from "sonner"
import { useAppSelector } from "@/lib/hooks"
import { useRouter } from "next/navigation"
import { AvatarUpload } from "@/features/profile/AvatarUpload"

const profileSchema = z.object({
    displayName: z.string().min(2, "Display name must be at least 2 characters"),
    bio: z.string().max(160, "Bio must be at most 160 characters").optional(),
})

type ProfileValues = z.infer<typeof profileSchema>

export function EditProfileForm() {
    const [isLoading, setIsLoading] = useState(false)
    const user = useAppSelector((state) => state.auth.user)
    const router = useRouter()
    const supabase = createClient()
    const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.user_metadata?.avatar_url || null)


    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ProfileValues>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            displayName: user?.user_metadata?.display_name || "",
            bio: user?.user_metadata?.bio || "",
        },
    })

    async function onSubmit(data: ProfileValues) {
        if (!user) return

        setIsLoading(true)
        try {
            const { error } = await supabase
                .from("users")
                .update({
                    display_name: data.displayName,
                    bio: data.bio,
                    avatar_url: avatarUrl,
                })
                .eq("id", user.id)

            if (error) {
                throw error
            }

            // Also update auth metadata if needed, but usually DB is enough for profile view
            // However, for consistency we might want to update auth user metadata too
            await supabase.auth.updateUser({
                data: {
                    display_name: data.displayName,
                    bio: data.bio,
                    avatar_url: avatarUrl
                }
            })

            toast.success("Profile updated successfully!")
            router.push(`/profile/${user.id}`)
            router.refresh()
        } catch (error: any) {
            toast.error(error.message || "Failed to update profile")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="w-full max-w-md bg-[#e6d5aa] p-6 pixel-border border-4 border-[#8b4513] relative">
            {/* Decorative Corner Screws */}
            <div className="absolute top-2 left-2 w-2 h-2 bg-[#5d3a1a] rounded-full opacity-50" />
            <div className="absolute top-2 right-2 w-2 h-2 bg-[#5d3a1a] rounded-full opacity-50" />
            <div className="absolute bottom-2 left-2 w-2 h-2 bg-[#5d3a1a] rounded-full opacity-50" />
            <div className="absolute bottom-2 right-2 w-2 h-2 bg-[#5d3a1a] rounded-full opacity-50" />

            <div className="mb-6 border-b-2 border-[#8b4513] pb-4 text-center">
                <h2 className="text-2xl font-retro-heading text-[#3e2723]">EDIT PROFILE</h2>
                <p className="font-retro-body text-[#8b4513]">Update your player card</p>
            </div>

            <div className="space-y-6">
                {user && (
                    <div className="flex justify-center">
                        <AvatarUpload
                            userId={user.id}
                            currentAvatarUrl={avatarUrl}
                            onUploadComplete={(url) => setAvatarUrl(url)}
                        />
                    </div>
                )}
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <label htmlFor="displayName" className="text-sm font-retro-heading text-[#5d4037]">Display Name</label>
                        <Input
                            id="displayName"
                            {...register("displayName")}
                            className="bg-white border-2 border-[#8b4513] rounded-none font-retro-body focus-visible:ring-0 focus-visible:border-[#5d3a1a]"
                        />
                        {errors.displayName && <p className="text-sm text-red-500 font-retro-body">{errors.displayName.message}</p>}
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="bio" className="text-sm font-retro-heading text-[#5d4037]">Bio</label>
                        <Input
                            id="bio"
                            {...register("bio")}
                            className="bg-white border-2 border-[#8b4513] rounded-none font-retro-body focus-visible:ring-0 focus-visible:border-[#5d3a1a]"
                        />
                        {errors.bio && <p className="text-sm text-red-500 font-retro-body">{errors.bio.message}</p>}
                    </div>
                    <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full font-retro-heading bg-[#4a8f3a] hover:bg-[#3a722e] text-white pixel-border border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all"
                    >
                        {isLoading ? "SAVING..." : "SAVE CHANGES"}
                    </Button>
                </form>
            </div>
        </div>
    )
}
