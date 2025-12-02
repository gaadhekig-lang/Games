"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/Avatar"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"
import { User, Upload } from "lucide-react"
import { toast } from "sonner"

interface AvatarUploadProps {
    userId: string
    currentAvatarUrl: string | null
    onUploadComplete: (url: string) => void
}

export function AvatarUpload({ userId, currentAvatarUrl, onUploadComplete }: AvatarUploadProps) {
    const [avatarUrl, setAvatarUrl] = useState<string | null>(currentAvatarUrl)
    const [isUploading, setIsUploading] = useState(false)
    const supabase = createClient()

    async function uploadAvatar(event: React.ChangeEvent<HTMLInputElement>) {
        try {
            setIsUploading(true)

            if (!event.target.files || event.target.files.length === 0) {
                throw new Error("You must select an image to upload.")
            }

            const file = event.target.files[0]
            const fileExt = file.name.split(".").pop()
            const filePath = `${userId}-${Math.random()}.${fileExt}`

            const { error: uploadError } = await supabase.storage
                .from("avatars")
                .upload(filePath, file)

            if (uploadError) {
                throw uploadError
            }

            const { data } = supabase.storage.from("avatars").getPublicUrl(filePath)

            setAvatarUrl(data.publicUrl)
            onUploadComplete(data.publicUrl)
            toast.success("Avatar uploaded!")
        } catch (error: any) {
            toast.error(error.message || "Error uploading avatar")
        } finally {
            setIsUploading(false)
        }
    }

    return (
        <div className="flex flex-col items-center gap-6">
            <div className="relative group">
                <div className="h-32 w-32 bg-[#8b4513] p-1 pixel-border border-2 border-[#5d3a1a]">
                    <Avatar className="h-full w-full rounded-none">
                        <AvatarImage src={avatarUrl || ""} className="object-cover" />
                        <AvatarFallback className="bg-[#d4c59a] text-[#3e2723] rounded-none font-retro-heading text-4xl">
                            <User className="h-12 w-12" />
                        </AvatarFallback>
                    </Avatar>
                </div>
                {isUploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 font-retro-heading text-white text-xs">
                        UPLOADING...
                    </div>
                )}
            </div>

            <div className="grid w-full max-w-sm items-center gap-2">
                <Label htmlFor="avatar" className="font-retro-heading text-[#5d4037]">Picture</Label>
                <div className="relative">
                    <Input
                        id="avatar"
                        type="file"
                        accept="image/*"
                        onChange={uploadAvatar}
                        disabled={isUploading}
                        className="file:bg-[#5c94fc] file:text-white file:font-retro-heading file:border-0 file:mr-4 file:px-4 file:py-2 hover:file:bg-[#4a8f3a] bg-white border-2 border-[#8b4513] rounded-none font-retro-body cursor-pointer"
                    />
                </div>
            </div>
        </div>
    )
}
