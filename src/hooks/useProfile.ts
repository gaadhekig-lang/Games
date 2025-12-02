import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

export interface Profile {
    id: string
    username: string
    display_name: string
    avatar_url: string | null
    bio: string | null
    created_at: string
}

export function useProfile(userId: string) {
    const [profile, setProfile] = useState<Profile | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        async function fetchProfile() {
            setIsLoading(true)
            try {
                const { data, error } = await supabase
                    .from("users")
                    .select("*")
                    .eq("id", userId)
                    .single()

                if (error) {
                    throw error
                }

                setProfile(data)
            } catch (error: any) {
                console.error("Error fetching profile:", error)
                // Don't toast on 406 (not found) as it might be initial load
            } finally {
                setIsLoading(false)
            }
        }

        if (userId) {
            fetchProfile()
        }
    }, [userId, supabase])

    return { profile, isLoading }
}
