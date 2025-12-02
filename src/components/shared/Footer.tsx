"use client"

import { usePathname } from "next/navigation"

export function Footer() {
    const pathname = usePathname()

    // Hide footer on the immersive games page
    if (pathname === "/games") return null

    return (
        <footer className="py-6 md:px-8 md:py-0">
            <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
                <p className="text-balance text-center text-sm leading-loose text-muted-foreground md:text-left">
                    &copy; {new Date().getFullYear()} GamePlatform. All rights reserved.
                </p>
            </div>
        </footer>
    )
}
