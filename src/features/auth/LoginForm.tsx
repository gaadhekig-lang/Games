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
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAppDispatch } from "@/lib/hooks"
import { setCredentials } from "@/features/auth/authSlice"

const loginSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
})

type LoginValues = z.infer<typeof loginSchema>

export function LoginForm() {
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()
    const supabase = createClient()
    const dispatch = useAppDispatch()

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginValues>({
        resolver: zodResolver(loginSchema),
    })

    async function onSubmit(data: LoginValues) {
        setIsLoading(true)
        try {
            const { data: authData, error } = await supabase.auth.signInWithPassword({
                email: data.email,
                password: data.password,
            })

            if (error) {
                throw error
            }

            if (authData.user && authData.session) {
                dispatch(setCredentials({ user: authData.user, session: authData.session }))
                toast.success("Logged in successfully!")
                router.push("/")
            }
        } catch (error: any) {
            toast.error(error.message || "Invalid login credentials")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Card className="w-full max-w-md bg-black/30 border-white/10 backdrop-blur-md text-white shadow-2xl">
            <CardHeader>
                <CardTitle className="text-2xl font-bold text-center">Welcome Back</CardTitle>
                <CardDescription className="text-white/60 text-center">Enter your credentials to access your account.</CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit(onSubmit)}>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <label htmlFor="email" className="text-sm font-medium text-white/80">Email</label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="m@example.com"
                            {...register("email")}
                            className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-white/20"
                        />
                        {errors.email && <p className="text-sm text-red-400">{errors.email.message}</p>}
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="password" className="text-sm font-medium text-white/80">Password</label>
                        <Input
                            id="password"
                            type="password"
                            {...register("password")}
                            className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-white/20"
                        />
                        {errors.password && <p className="text-sm text-red-400">{errors.password.message}</p>}
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col space-y-4">
                    <Button type="submit" className="w-full bg-white text-black hover:bg-white/90" disabled={isLoading}>
                        {isLoading ? "Logging in..." : "Login"}
                    </Button>
                    <div className="text-center text-sm text-white/60">
                        Don't have an account?{" "}
                        <Link href="/signup" className="underline hover:text-white">
                            Sign Up
                        </Link>
                    </div>
                </CardFooter>
            </form>
        </Card>
    )
}
