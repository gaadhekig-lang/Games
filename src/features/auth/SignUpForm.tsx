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

const signUpSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    username: z.string().min(3, "Username must be at least 3 characters").max(20, "Username must be at most 20 characters"),
    displayName: z.string().min(2, "Display name must be at least 2 characters"),
})

type SignUpValues = z.infer<typeof signUpSchema>

export function SignUpForm() {
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<SignUpValues>({
        resolver: zodResolver(signUpSchema),
    })

    async function onSubmit(data: SignUpValues) {
        setIsLoading(true)
        try {
            const { error } = await supabase.auth.signUp({
                email: data.email,
                password: data.password,
                options: {
                    data: {
                        username: data.username,
                        display_name: data.displayName,
                    },
                },
            })

            if (error) {
                throw error
            }

            toast.success("Account created! Please check your email to verify your account.")
            router.push("/login")
        } catch (error: any) {
            toast.error(error.message || "Something went wrong")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Card className="w-full max-w-md bg-black/30 border-white/10 backdrop-blur-md text-white shadow-2xl">
            <CardHeader>
                <CardTitle className="text-2xl font-bold text-center">Create an account</CardTitle>
                <CardDescription className="text-white/60 text-center">Enter your details to get started.</CardDescription>
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
                        <label htmlFor="username" className="text-sm font-medium text-white/80">Username</label>
                        <Input
                            id="username"
                            placeholder="coolgamer123"
                            {...register("username")}
                            className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-white/20"
                        />
                        {errors.username && <p className="text-sm text-red-400">{errors.username.message}</p>}
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="displayName" className="text-sm font-medium text-white/80">Display Name</label>
                        <Input
                            id="displayName"
                            placeholder="Cool Gamer"
                            {...register("displayName")}
                            className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-white/20"
                        />
                        {errors.displayName && <p className="text-sm text-red-400">{errors.displayName.message}</p>}
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
                        {isLoading ? "Creating account..." : "Sign Up"}
                    </Button>
                    <div className="text-center text-sm text-white/60">
                        Already have an account?{" "}
                        <Link href="/login" className="underline hover:text-white">
                            Login
                        </Link>
                    </div>
                </CardFooter>
            </form>
        </Card>
    )
}
