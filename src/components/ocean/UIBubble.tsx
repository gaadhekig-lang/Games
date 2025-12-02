"use client"

import { Bubble } from "./Bubble"

interface UIBubbleProps {
    children: React.ReactNode
    className?: string
    onClick?: () => void
}

export function UIBubble({ children, className, onClick }: UIBubbleProps) {
    return (
        <Bubble
            size={220}
            className={`bg-white/5 border-white/10 ${className}`}
            onClick={onClick}
            staticPosition={true}
        >
            {children}
        </Bubble>
    )
}
