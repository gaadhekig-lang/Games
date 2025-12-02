"use client"

import { useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAppDispatch } from "@/lib/hooks"
import { setCredentials, logout } from "@/features/auth/authSlice"

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const dispatch = useAppDispatch()
    const supabase = createClient()

    useEffect(() => {
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
            if (session?.user) {
                dispatch(setCredentials({ user: session.user, session }))
            } else {
                dispatch(logout())
            }
        })

        return () => {
            subscription.unsubscribe()
        }
    }, [dispatch, supabase])

    return <>{children}</>
}
