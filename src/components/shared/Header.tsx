"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/Button"
import { cn } from "@/lib/utils"
import { useAppDispatch, useAppSelector } from "@/lib/hooks"
import { createClient } from "@/lib/supabase/client"
import { logout } from "@/features/auth/authSlice"
import { toast } from "sonner"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/Avatar"
import { User, Bell, Check, X, Gamepad2, Menu } from "lucide-react"
import { friendService } from "@/lib/services/friendService"
import { useEffect, useState } from "react"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/Popover"

export function Header() {
    const pathname = usePathname()
    const user = useAppSelector((state) => state.auth.user)
    const dispatch = useAppDispatch()
    const router = useRouter()
    const supabase = createClient()
    const [notifications, setNotifications] = useState<any[]>([])
    const [unreadCount, setUnreadCount] = useState(0)

    useEffect(() => {
        if (!user) return

        // Initial fetch
        loadNotifications()

        // Subscribe to notifications
        const channel = supabase
            .channel(`notifications:${user.id}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "notifications",
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    setNotifications(prev => [payload.new, ...prev])
                    setUnreadCount(prev => prev + 1)
                    toast.info("New notification received!")
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [user, supabase])

    async function loadNotifications() {
        try {
            const data = await friendService.getNotifications()
            setNotifications(data)
            setUnreadCount(data.length)
        } catch (error) {
            console.error("Failed to load notifications", error)
        }
    }

    async function handleAcceptInvite(notification: any) {
        try {
            await friendService.markNotificationRead(notification.id)
            setNotifications(prev => prev.filter(n => n.id !== notification.id))
            setUnreadCount(prev => Math.max(0, prev - 1))
            router.push(`/lobby/${notification.data.roomId}`)
            toast.success("Joining game...")
        } catch (error) {
            toast.error("Failed to join game")
        }
    }

    async function handleDeclineInvite(notification: any) {
        try {
            await friendService.markNotificationRead(notification.id)
            setNotifications(prev => prev.filter(n => n.id !== notification.id))
            setUnreadCount(prev => Math.max(0, prev - 1))
        } catch (error) {
            toast.error("Failed to decline")
        }
    }

    const routes = [
        { href: "/", label: "Games" },
        { href: "/leaderboard", label: "Leaderboard" },
        { href: "/friends", label: "Friends" },
    ]

    async function handleLogout() {
        await supabase.auth.signOut()
        dispatch(logout())
        router.push("/login")
        toast.success("Logged out")
    }

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

    if (pathname?.startsWith("/lobby/")) {
        return null
    }

    return (
        <header className="fixed top-0 left-0 right-0 z-50 bg-[#e6d5aa] pixel-border-b border-b-4 border-[#8b4513] shadow-lg transition-all duration-300 md:top-6 md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-auto md:rounded-none md:border-4 md:shadow-none">
            <div className="flex h-16 items-center justify-between px-4 md:h-14 md:gap-6 md:px-6">
                <div className="flex items-center">
                    <Link href="/" className="flex items-center space-x-2">
                        <span className="font-retro-heading text-lg uppercase tracking-widest text-[#3e2723] md:text-xs">
                            RetroArcade
                        </span>
                    </Link>
                </div>

                {/* Desktop Navigation */}
                <nav className="hidden items-center space-x-1 text-sm font-medium md:flex">
                    {routes.map((route) => (
                        <Link
                            key={route.href}
                            href={route.href}
                            className={cn(
                                "transition-colors px-3 py-1.5 font-retro-heading text-xs uppercase tracking-widest",
                                "text-[#5d4037] hover:text-[#8b4513]",
                                pathname === route.href
                                    ? "text-[#8b4513] underline decoration-2 underline-offset-4"
                                    : "text-[#5d4037]"
                            )}
                        >
                            {route.label}
                        </Link>
                    ))}
                </nav>

                <div className="flex items-center gap-2 md:gap-4">
                    {user && (
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" size="icon" className="relative text-[#5d4037] hover:bg-[#8b4513]/10">
                                    <Bell className="h-5 w-5" />
                                    {unreadCount > 0 && (
                                        <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-[#c84c0c] border-2 border-[#e6d5aa]" />
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 p-0 bg-[#e6d5aa] pixel-border border-2 border-[#8b4513]" align="end">
                                <div className="p-3 border-b-2 border-[#8b4513] bg-[#d4c59a]">
                                    <h4 className="font-retro-heading text-[#3e2723]">NOTIFICATIONS</h4>
                                </div>
                                <div className="max-h-[300px] overflow-y-auto">
                                    {notifications.length === 0 ? (
                                        <div className="p-4 text-center font-retro-body text-[#8b4513] opacity-70">
                                            No new notifications
                                        </div>
                                    ) : (
                                        notifications.map((notification) => (
                                            <div key={notification.id} className="p-3 border-b border-[#8b4513]/20 hover:bg-[#d4c59a]/50 transition-colors">
                                                {notification.type === 'game_invite' && (
                                                    <div className="flex flex-col gap-2">
                                                        <div className="flex items-start gap-3">
                                                            <div className="bg-[#5c94fc] p-1.5 pixel-border-sm">
                                                                <Gamepad2 className="h-4 w-4 text-white" />
                                                            </div>
                                                            <div>
                                                                <p className="font-retro-body font-bold text-[#3e2723] text-sm">
                                                                    {notification.data.senderName}
                                                                </p>
                                                                <p className="text-xs font-retro-body text-[#8b4513]">
                                                                    Invited you to play {notification.data.gameKey?.toUpperCase() || 'GAME'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-2 mt-1 pl-10">
                                                            <Button
                                                                size="sm"
                                                                onClick={() => handleAcceptInvite(notification)}
                                                                className="h-7 text-xs bg-[#4a8f3a] hover:bg-[#3a722e] text-white pixel-border-sm"
                                                            >
                                                                ACCEPT
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => handleDeclineInvite(notification)}
                                                                className="h-7 text-xs text-[#c84c0c] hover:bg-[#c84c0c]/10"
                                                            >
                                                                DECLINE
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </PopoverContent>
                        </Popover>
                    )}

                    {user ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="relative h-10 w-10 rounded-none hover:bg-black/5 p-0">
                                    <div className="h-9 w-9 bg-[#8b4513] p-0.5 pixel-border-sm border-2 border-[#5d3a1a]">
                                        <Avatar className="h-full w-full rounded-none">
                                            <AvatarImage src={user.user_metadata?.avatar_url} alt={user.user_metadata?.display_name} className="object-cover" />
                                            <AvatarFallback className="bg-[#d4c59a] text-[#3e2723] rounded-none font-retro-heading">
                                                {user.user_metadata?.display_name?.[0] || "?"}
                                            </AvatarFallback>
                                        </Avatar>
                                    </div>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56 bg-[#e6d5aa] pixel-border border-2 border-[#8b4513] p-0" align="end" forceMount>
                                <DropdownMenuLabel className="font-normal border-b-2 border-[#8b4513] bg-[#d4c59a] p-3">
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-retro-heading text-[#3e2723] leading-none">{user.user_metadata?.display_name}</p>
                                        <p className="text-xs leading-none font-retro-body text-[#8b4513]">
                                            {user.email}
                                        </p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuItem asChild className="focus:bg-[#8b4513] focus:text-[#e6d5aa] cursor-pointer rounded-none m-1">
                                    <Link href={`/profile/${user.id}`} className="font-retro-heading text-[#5d4037]">PROFILE</Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild className="focus:bg-[#8b4513] focus:text-[#e6d5aa] cursor-pointer rounded-none m-1">
                                    <Link href="/settings" className="font-retro-heading text-[#5d4037]">SETTINGS</Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-[#8b4513]/20" />
                                <DropdownMenuItem onClick={handleLogout} className="focus:bg-[#c84c0c] focus:text-white cursor-pointer rounded-none m-1">
                                    <span className="font-retro-heading text-[#c84c0c] group-focus:text-white">LOG OUT</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : (
                        <div className="hidden md:flex items-center gap-2">
                            <Link href="/login">
                                <Button variant="ghost" size="sm" className="text-[#5d4037] hover:bg-[#8b4513]/10 font-retro-heading">
                                    LOGIN
                                </Button>
                            </Link>
                            <Link href="/signup">
                                <Button size="sm" className="bg-[#8b4513] text-white hover:bg-[#5d3a1a] font-retro-heading pixel-border-sm">
                                    SIGN UP
                                </Button>
                            </Link>
                        </div>
                    )}

                    {/* Mobile Menu Toggle */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="md:hidden text-[#5d4037]"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    >
                        {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                    </Button>
                </div>
            </div>

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
                <div className="border-t-4 border-[#8b4513] bg-[#e6d5aa] px-4 py-4 md:hidden">
                    <nav className="flex flex-col space-y-4">
                        {routes.map((route) => (
                            <Link
                                key={route.href}
                                href={route.href}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={cn(
                                    "font-retro-heading text-sm uppercase tracking-widest",
                                    "text-[#5d4037] hover:text-[#8b4513]",
                                    pathname === route.href ? "text-[#8b4513] underline" : ""
                                )}
                            >
                                {route.label}
                            </Link>
                        ))}
                        {!user && (
                            <div className="flex flex-col gap-2 pt-4 border-t-2 border-[#8b4513]/20">
                                <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                                    <Button variant="ghost" className="w-full justify-start text-[#5d4037] font-retro-heading">
                                        LOGIN
                                    </Button>
                                </Link>
                                <Link href="/signup" onClick={() => setIsMobileMenuOpen(false)}>
                                    <Button className="w-full bg-[#8b4513] text-white font-retro-heading pixel-border-sm">
                                        SIGN UP
                                    </Button>
                                </Link>
                            </div>
                        )}
                    </nav>
                </div>
            )}
        </header>
    )
}
